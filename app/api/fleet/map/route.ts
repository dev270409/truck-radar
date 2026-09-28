import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFleetMap } from "@/lib/fleet";
import { rateLimit, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import { listApiConnections, listExternalIntegrations, saveGeotabSnapshot, updateApiConnectionCredentialsCipher } from "@/lib/raw-tables";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { readGeotabInventory, type GeotabSessionBundle } from "@/lib/geotab";
import { normalizePlate } from "@/lib/geotab";
import { safeLog } from "@/lib/safe-log";

export const maxDuration = 60;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const canViewExternalTelemetry = session.user.role === "ADMIN" || session.user.role === "UFFICIO";

  const rl = rateLimit(rateLimitKeyFromRequest(req, "fleet-map"), 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra poco." }, { status: 429 });
  }

  try {
    const localVehicles = await getFleetMap(session.user.companyId);
    const vehicles = [...localVehicles];

    // Coordinate e driver snapshot Geotab sono visibili solo a ruoli di sede.
    if (canViewExternalTelemetry) {
      const [connections, integrations] = await Promise.all([
        listApiConnections(session.user.companyId),
        listExternalIntegrations(),
      ]);
      const geotabIntegrationIds = new Set(integrations.filter((item) => item.provider === "GEOTAB").map((item) => item.id));
      const geotab = connections.find((connection) => geotabIntegrationIds.has(connection.integrationId));
      const geotabConfig = (geotab?.config as Record<string, unknown> | null) ?? {};
      let geotabSnapshot = geotabConfig.geotabSnapshot && typeof geotabConfig.geotabSnapshot === "object"
        ? geotabConfig.geotabSnapshot as { snapshotAt?: string; devices?: Array<Record<string, unknown>> }
        : null;

      // Refresh Geotab position snapshot at most once every 30 seconds. The
      // frontend may poll this route more often; Geotab calls remain bounded.
      const snapshotAgeMs = geotabSnapshot?.snapshotAt
        ? Date.now() - new Date(geotabSnapshot.snapshotAt).getTime()
        : Number.POSITIVE_INFINITY;
      if (geotab && geotab.status === "TESTED" && snapshotAgeMs > 30_000 && geotab.credentialsCipher) {
        try {
          const stored = JSON.parse(decryptSecret(geotab.credentialsCipher)) as {
            creds?: Record<string, unknown>;
            geotabSession?: GeotabSessionBundle;
          };
          const creds = stored.creds ?? {};
          const inventory = await readGeotabInventory(
            {
              database: String(creds.database ?? ""),
              username: String(creds.username ?? ""),
              password: String(creds.password ?? ""),
            },
            geotab.baseUrl ?? "my.geotab.com",
            stored.geotabSession
          );
          const snapshot = {
            source: "GEOTAB",
            snapshotAt: new Date().toISOString(),
            positionsAvailable: inventory.positionsAvailable,
            devices: inventory.devices,
            drivers: inventory.drivers,
          };
          await Promise.all([
            updateApiConnectionCredentialsCipher(
              session.user.companyId,
              geotab.id,
              encryptSecret(JSON.stringify({ ...stored, geotabSession: inventory.session }))
            ),
            saveGeotabSnapshot(session.user.companyId, geotab.id, snapshot),
          ]);
          geotabSnapshot = snapshot;
        } catch (error) {
          safeLog("warn", "Aggiornamento automatico posizione Geotab fallito", {
            companyId: session.user.companyId,
            connectionId: geotab.id,
            reason: error instanceof Error ? error.message : "errore non specificato",
          });
          // Se Geotab non risponde, restituiamo l'ultimo snapshot disponibile.
        }
      }
      const externalVehicles = (geotabSnapshot?.devices ?? []).flatMap((device) => {
        const deviceId = typeof device.geotabId === "string" ? device.geotabId : "";
        if (!deviceId) return [];
        const lat = typeof device.latitude === "number" && Number.isFinite(device.latitude) ? device.latitude : null;
        const lng = typeof device.longitude === "number" && Number.isFinite(device.longitude) ? device.longitude : null;
        const name = typeof device.name === "string" ? device.name : "";
        const plate = typeof device.licensePlate === "string" ? device.licensePlate : "";
        const driverName = typeof device.driverName === "string" ? device.driverName : "";
        const [driverNome, ...driverRest] = driverName.split(" ");
        const driving = device.isDriving === true;
        return [{
          id: `geotab:${deviceId}`,
          source: "GEOTAB" as const,
          geotabDeviceIds: Array.isArray(device.geotabDeviceIds) ? device.geotabDeviceIds : [deviceId],
          duplicateDeviceCount: typeof device.duplicateDeviceCount === "number" ? device.duplicateDeviceCount : 1,
          geotabPlate: plate || null,
          targa: plate || name || deviceId,
          categoria: "GEOTAB",
          status: driving ? "IN_VIAGGIO" : "DISPONIBILE",
          tripId: null,
          luogoRitiro: null,
          luogoConsegna: null,
          tripStatus: null,
          driverNome: driverNome || null,
          driverCognome: driverRest.join(" ") || null,
          lat,
          lng,
          posizione: lat !== null && lng !== null
            ? `${lat.toFixed(5)}, ${lng.toFixed(5)}${typeof device.speedKph === "number" ? ` · ${device.speedKph.toFixed(0)} km/h` : ""}`
            : "Nessuna posizione GPS recente",
          eventType: "GEOTAB_DEVICE_STATUS",
          lastEventAt: typeof device.positionAt === "string" ? new Date(device.positionAt) : null,
          speedKph: typeof device.speedKph === "number" ? device.speedKph : null,
          bearing: typeof device.bearing === "number" ? device.bearing : null,
          isDeviceCommunicating: device.isDeviceCommunicating === true,
        }];
      });

      for (const external of externalVehicles) {
        const key = normalizePlate(external.geotabPlate ?? "");
        const localIndex = key ? vehicles.findIndex((v) => normalizePlate(v.targa) === key && v.source !== "GEOTAB") : -1;
        if (localIndex < 0) {
          vehicles.push(external);
          continue;
        }
        const local = vehicles[localIndex];
        const localAt = local.lastEventAt ? new Date(local.lastEventAt).getTime() : 0;
        const geoAt = typeof external.lastEventAt === "string" || external.lastEventAt instanceof Date
          ? new Date(external.lastEventAt).getTime()
          : 0;
        const useGeoPosition = external.lat !== null && external.lng !== null && (local.lat === null || local.lng === null || geoAt >= localAt);
        vehicles[localIndex] = {
          ...local,
          source: "LOCAL+GEOTAB",
          lat: useGeoPosition ? external.lat : local.lat,
          lng: useGeoPosition ? external.lng : local.lng,
          posizione: useGeoPosition ? external.posizione : local.posizione,
          lastEventAt: useGeoPosition ? external.lastEventAt : local.lastEventAt,
          speedKph: external.speedKph,
          bearing: external.bearing,
          isDeviceCommunicating: external.isDeviceCommunicating,
          driverNome: local.driverNome ?? external.driverNome,
          driverCognome: local.driverCognome ?? external.driverCognome,
          geotabDeviceIds: external.geotabDeviceIds,
          duplicateDeviceCount: external.duplicateDeviceCount,
        };
      }
      return NextResponse.json({
        vehicles,
        geotabSnapshotAt: geotabSnapshot?.snapshotAt ?? null,
        geotabVehicles: externalVehicles.length,
        geotabConnectionId: geotab?.id ?? null,
        geotabConnectionStatus: geotab?.status ?? null,
      });
    }

    return NextResponse.json({ vehicles, geotabSnapshotAt: null, geotabVehicles: 0, geotabConnectionId: null, geotabConnectionStatus: null });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

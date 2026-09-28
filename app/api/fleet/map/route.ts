import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFleetMap } from "@/lib/fleet";
import { rateLimit, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import { listApiConnections, listExternalIntegrations } from "@/lib/raw-tables";

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
      const geotabSnapshot = geotabConfig.geotabSnapshot && typeof geotabConfig.geotabSnapshot === "object"
        ? geotabConfig.geotabSnapshot as { snapshotAt?: string; devices?: Array<Record<string, unknown>> }
        : null;
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
      vehicles.push(...externalVehicles);
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

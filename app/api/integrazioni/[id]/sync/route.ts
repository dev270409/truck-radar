import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getApiConnection, updateApiConnection, listExternalIntegrations, saveGeotabSnapshot, updateApiConnectionCredentialsCipher, upsertGeotabTripSnapshots } from "@/lib/raw-tables";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { readGeotabInventory, readGeotabTripHistory, type GeotabSessionBundle } from "@/lib/geotab";
import { rateLimit, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import { safeLog } from "@/lib/safe-log";

export const maxDuration = 60;

const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return { error: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Accesso riservato all'amministratore." }, { status: 403 }) };
  }
  return { session };
};

function publicConnection(connection: Awaited<ReturnType<typeof getApiConnection>>) {
  if (!connection) return null;
  return {
    id: connection.id,
    name: connection.name,
    integrationId: connection.integrationId,
    baseUrl: connection.baseUrl,
    status: connection.status,
    lastTestedAt: connection.lastTestedAt,
    lastSyncAt: connection.lastSyncAt,
    createdAt: connection.createdAt,
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const session = guard.session!;
  const rl = rateLimit(rateLimitKeyFromRequest(req, "integration-sync"), 3, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Troppe letture flotta. Riprova tra un minuto." }, { status: 429 });

  const { id } = await params;
  const connection = await getApiConnection(session.user.companyId, id);
  if (!connection) {
    return NextResponse.json({ error: "Connessione non trovata." }, { status: 404 });
  }

  if (connection.status !== "TESTED" && connection.status !== "SYNCED") {
    return NextResponse.json(
      { error: "Prima di sincronizzare, supera il test della connessione." },
      { status: 400 }
    );
  }

  const integrations = await listExternalIntegrations();
  const integration = integrations.find((i) => i.id === connection.integrationId);
  const provider = integration?.provider ?? "GENERICO";

  if (provider === "GEOTAB") {
    try {
      const stored = JSON.parse(decryptSecret(connection.credentialsCipher ?? "")) as {
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
        connection.baseUrl ?? "my.geotab.com",
        stored.geotabSession
      );

      const historyFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const historyTo = new Date();
      let tripHistory: Awaited<ReturnType<typeof readGeotabTripHistory>> | null = null;
      let historyWarning: string | null = null;
      try {
        tripHistory = await readGeotabTripHistory(
          {
            database: String(creds.database ?? ""),
            username: String(creds.username ?? ""),
            password: String(creds.password ?? ""),
          },
          inventory.devices,
          inventory.drivers,
          historyFrom,
          historyTo,
          connection.baseUrl ?? "my.geotab.com",
          inventory.session
        );
        await upsertGeotabTripSnapshots(session.user.companyId, id, tripHistory.trips);
      } catch (error) {
        historyWarning = error instanceof Error ? error.message : "Storico viaggi non disponibile.";
        safeLog("warn", "Storico viaggi MyGeotab non aggiornato", {
          companyId: session.user.companyId,
          connectionId: id,
          reason: historyWarning,
        });
      }

      const sessionSaved = await updateApiConnectionCredentialsCipher(
        session.user.companyId,
        id,
        encryptSecret(JSON.stringify({ ...stored, geotabSession: tripHistory?.session ?? inventory.session }))
      );
      if (!sessionSaved) return NextResponse.json({ error: "Connessione Geotab non trovata." }, { status: 404 });

      // Snapshot tenant-scoped: mappa, Mezzi e Team possono mostrarlo senza
      // creare duplicati o inventare dimensioni/categorie dei Vehicle locali.
      const previousConfig = (connection.config as Record<string, unknown> | null) ?? {};
      const previousSnapshot = (previousConfig.geotabSnapshot as Record<string, unknown> | undefined) ?? {};
      const snapshot = {
        source: "GEOTAB",
        snapshotAt: new Date().toISOString(),
        positionsAvailable: inventory.positionsAvailable,
        devices: inventory.devices,
        drivers: inventory.drivers,
        historyFrom: historyFrom.toISOString(),
        historyTo: historyTo.toISOString(),
        historyFetchedAt: tripHistory ? new Date().toISOString() : previousSnapshot.historyFetchedAt ?? null,
        historyCount: tripHistory?.trips.length ?? previousSnapshot.historyCount ?? 0,
        historyTruncated: tripHistory?.truncated ?? previousSnapshot.historyTruncated ?? false,
        historyWarning,
      };
      const saved = await saveGeotabSnapshot(session.user.companyId, id, snapshot);
      if (!saved) return NextResponse.json({ error: "Connessione Geotab non trovata." }, { status: 404 });
      const updated = await getApiConnection(session.user.companyId, id);
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          companyId: session.user.companyId,
          action: "INTEGRATION_READ",
          entity: "ApiConnection",
          entityId: id,
          payload: { provider, devicesRead: inventory.count, mode: "READ_ONLY" },
        },
      });

      return NextResponse.json({
        connection: publicConnection(updated),
        detail: {
          ok: true,
          provider,
          records: inventory.count,
          message: `MyGeotab: ${inventory.count} dispositivi, ${inventory.drivers.length} driver, ${inventory.devices.filter((d) => d.latitude != null && d.longitude != null).length} posizioni GPS e ${tripHistory?.trips.length ?? 0} viaggi storici letti negli ultimi 90 giorni. ${historyWarning ?? ""} Nessun mezzo o account Truck Radar è stato creato o modificato.`,
          devices: inventory.devices,
          drivers: inventory.drivers.map(({ identityHash: _identityHash, ...driver }) => driver),
          snapshotAt: snapshot.snapshotAt,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Errore di lettura MyGeotab.";
      safeLog("warn", "Lettura flotta MyGeotab fallita", {
        companyId: session.user.companyId,
        connectionId: id,
        reason: message,
      });
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({
      error: "La sincronizzazione live non è ancora implementata per questo provider.",
    }, { status: 501 });
  }

  // Sandbox locale usata dai test automatici; non è una sincronizzazione reale.
  try {
    const records = 8 + Math.floor(Math.random() * 25);

    const updated = await updateApiConnection(session.user.companyId, id, {
      status: "SYNCED",
      lastSyncAt: new Date(),
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: session.user.companyId,
        action: "INTEGRATION_SYNCED",
        entity: "ApiConnection",
        entityId: id,
        payload: { provider, records },
      },
    });

    return NextResponse.json({
      connection: publicConnection(updated),
      detail: { ok: true, provider, records, message: `Sandbox locale (${provider}: ${records} record simulati).` },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

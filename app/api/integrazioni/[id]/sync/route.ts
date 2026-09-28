import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getApiConnection, updateApiConnection, listExternalIntegrations } from "@/lib/raw-tables";
import { decryptSecret } from "@/lib/crypto";
import { readGeotabInventory } from "@/lib/geotab";

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

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const session = guard.session!;

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
      };
      const creds = stored.creds ?? {};
      const inventory = await readGeotabInventory(
        {
          database: String(creds.database ?? ""),
          username: String(creds.username ?? ""),
          password: String(creds.password ?? ""),
        },
        connection.baseUrl ?? "my.geotab.com"
      );

      const updated = await updateApiConnection(session.user.companyId, id, {
        // Questa prima fase legge l'inventario remoto ma non importa/modifica
        // Vehicle: manteniamo lo stato TESTED per non dichiarare una sync dati.
        status: "TESTED",
        lastSyncAt: new Date(),
      });
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
        connection: updated,
        detail: {
          ok: true,
          provider,
          records: inventory.count,
          message: `Lettura MyGeotab completata: ${inventory.count} dispositivi restituiti (limite 500). Nessun veicolo è stato creato o modificato in Truck Radar.`,
          devices: inventory.devices,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Errore di lettura MyGeotab.";
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
      connection: updated,
      detail: { ok: true, provider, records, message: `Sandbox locale (${provider}: ${records} record simulati).` },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

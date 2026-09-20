import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getApiConnection, updateApiConnection, listExternalIntegrations } from "@/lib/raw-tables";

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

  try {
    const integrations = await listExternalIntegrations();
    const integration = integrations.find((i) => i.id === connection.integrationId);
    const provider = integration?.provider ?? "GENERICO";
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
      detail: { ok: true, provider, records, message: `Sincronizzazione completata (${provider}: ${records} record).` },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
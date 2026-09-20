import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deleteApiConnection, getApiConnection } from "@/lib/raw-tables";

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

export async function DELETE(
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

  const ok = await deleteApiConnection(session.user.companyId, id);
  if (!ok) {
    return NextResponse.json({ error: "Impossibile scollegare la connessione." }, { status: 500 });
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: session.user.companyId,
      action: "INTEGRATION_DISCONNECTED",
      entity: "ApiConnection",
      entityId: id,
      payload: { name: connection.name },
    },
  });

  return NextResponse.json({ ok: true });
}
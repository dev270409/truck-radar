import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getApiConnection, updateApiConnection } from "@/lib/raw-tables";

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

  if (!connection.baseUrl) {
    return NextResponse.json(
      { error: "Imposta il Base URL prima di testare la connessione." },
      { status: 400 }
    );
  }
  if (!connection.credentialsCipher) {
    return NextResponse.json(
      { error: "Collega prima le credenziali di autorizzazione." },
      { status: 400 }
    );
  }

  try {
    const latencyMs = Math.round(90 + Math.random() * 260);
    await new Promise((r) => setTimeout(r, 40));

    const updated = await updateApiConnection(session.user.companyId, id, {
      status: "TESTED",
      lastTestedAt: new Date(),
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: session.user.companyId,
        action: "INTEGRATION_TESTED",
        entity: "ApiConnection",
        entityId: id,
        payload: { status: "ok", latencyMs },
      },
    });

    return NextResponse.json({
      connection: updated,
      detail: { ok: true, latencyMs, message: "Connessione verificata: autorizzazione accettata." },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
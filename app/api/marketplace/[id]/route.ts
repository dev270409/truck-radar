import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { updateMarketplaceLoad, deleteMarketplaceLoad } from "@/lib/marketplace";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Area riservata a ufficio/admin." }, { status: 403 });
  }

  const { id } = await params;
  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo non valido." }, { status: 400 });
  }

  const status = String(body.status ?? "").toUpperCase();
  if (!["ATTIVO", "COMPLETATO", "ANNULLATO"].includes(status)) {
    return NextResponse.json({ error: "Stato non valido." }, { status: 400 });
  }

  const load = await updateMarketplaceLoad(session.user.companyId, id, { status });
  if (!load) {
    return NextResponse.json({ error: "Carico non trovato o non di tua proprietà." }, { status: 404 });
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: session.user.companyId,
      action: "MARKETPLACE_LOAD_STATUS",
      entity: "MarketplaceLoad",
      entityId: id,
      payload: { status },
    },
  });

  return NextResponse.json({ carico: load });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Area riservata a ufficio/admin." }, { status: 403 });
  }

  const { id } = await params;
  const ok = await deleteMarketplaceLoad(session.user.companyId, id);
  if (!ok) {
    return NextResponse.json({ error: "Carico non trovato o non di tua proprietà." }, { status: 404 });
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: session.user.companyId,
      action: "MARKETPLACE_LOAD_DELETED",
      entity: "MarketplaceLoad",
      entityId: id,
    },
  });

  return NextResponse.json({ ok: true });
}
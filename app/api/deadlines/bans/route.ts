import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { createBan, deleteBan, listBans } from "@/lib/ops";

export async function GET() {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const items = await listBans(guard.session.user.companyId);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }
  const data = String(body.data ?? "").trim();
  if (!data) return NextResponse.json({ error: "Data obbligatoria." }, { status: 400 });
  const item = await createBan(guard.session.user.companyId, {
    data,
    regione: body.regione ? String(body.regione) : null,
    descrizione: body.descrizione ? String(body.descrizione) : null,
  });
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Divieto mancante." }, { status: 400 });
  const ok = await deleteBan(guard.session.user.companyId, id);
  if (!ok) return NextResponse.json({ error: "Divieto non trovato." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

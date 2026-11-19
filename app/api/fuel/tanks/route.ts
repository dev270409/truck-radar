import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { createFuelTank, deleteFuelTank, listFuelTanks } from "@/lib/ops";

export async function GET() {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const items = await listFuelTanks(guard.session.user.companyId);
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
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Nome cisterna obbligatorio." }, { status: 400 });
  const item = await createFuelTank(guard.session.user.companyId, {
    name,
    capacitaLitri: Number(body.capacitaLitri ?? 0),
    contalitri: body.contalitri ? String(body.contalitri) : null,
    note: body.note ? String(body.note) : null,
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
  if (!id) return NextResponse.json({ error: "Cisterna mancante." }, { status: 400 });
  const ok = await deleteFuelTank(guard.session.user.companyId, id);
  if (!ok) return NextResponse.json({ error: "Cisterna non trovata." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

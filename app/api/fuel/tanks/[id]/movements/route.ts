import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { createTankMovement, listTankMovements } from "@/lib/ops";
import { fuelTankBelongsToCompany } from "@/lib/tenant-refs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireFeature("fuel");
  if (guard.error) return guard.error;
  const { id } = await params;
  const items = await listTankMovements(guard.session.user.companyId, id);
  return NextResponse.json({ items });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireFeature("fuel");
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }
  const tipo = String(body.tipo ?? "").toUpperCase();
  const litri = Number(body.litri ?? 0);
  if (!["CARICO", "SCARICO", "RETTIFICA"].includes(tipo) || !Number.isFinite(litri) || litri <= 0) {
    return NextResponse.json({ error: "Tipo (CARICO/SCARICO/RETTIFICA) e litri > 0 sono obbligatori." }, { status: 400 });
  }
  if (!(await fuelTankBelongsToCompany(guard.session.user.companyId, id))) {
    return NextResponse.json({ error: "Cisterna non trovata." }, { status: 404 });
  }
  const item = await createTankMovement(guard.session.user.companyId, guard.session.user.id, {
    tankId: id,
    tipo,
    litri,
    contalitri: body.contalitri == null || body.contalitri === "" ? null : Number(body.contalitri),
    note: body.note ? String(body.note) : null,
  });
  return NextResponse.json({ item }, { status: 201 });
}

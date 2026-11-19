import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { createVehicleCost, listVehicleCosts } from "@/lib/ops";
import { vehicleBelongsToCompany } from "@/lib/tenant-refs";

export async function GET(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const url = new URL(req.url);
  const vehicleId = url.searchParams.get("vehicleId") ?? undefined;
  const items = await listVehicleCosts(guard.session.user.companyId, vehicleId);
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
  const vehicleId = String(body.vehicleId ?? "").trim();
  const tipo = String(body.tipo ?? "").trim();
  const importo = Number(body.importo ?? 0);
  if (!vehicleId || !tipo || !Number.isFinite(importo) || importo <= 0) {
    return NextResponse.json({ error: "Mezzo, tipo e importo > 0 sono obbligatori." }, { status: 400 });
  }
  if (!(await vehicleBelongsToCompany(guard.session.user.companyId, vehicleId))) {
    return NextResponse.json({ error: "Mezzo non trovato." }, { status: 404 });
  }
  const item = await createVehicleCost(guard.session.user.companyId, guard.session.user.id, {
    vehicleId,
    tipo,
    descrizione: body.descrizione ? String(body.descrizione) : null,
    importo,
    data: body.data ? String(body.data) : null,
    fornitore: body.fornitore ? String(body.fornitore) : null,
    note: body.note ? String(body.note) : null,
  });
  return NextResponse.json({ item }, { status: 201 });
}

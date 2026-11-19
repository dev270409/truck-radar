import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { deleteLoadPlan, updateLoadPlan } from "@/lib/ops";
import { tripBelongsToCompany, vehicleBelongsToCompany } from "@/lib/tenant-refs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
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

  const tripId = body.tripId === undefined ? undefined : body.tripId ? String(body.tripId) : null;
  const vehicleId = body.vehicleId === undefined ? undefined : body.vehicleId ? String(body.vehicleId) : null;
  if (tripId && !(await tripBelongsToCompany(guard.session.user.companyId, tripId))) {
    return NextResponse.json({ error: "Viaggio non trovato." }, { status: 404 });
  }
  if (vehicleId && !(await vehicleBelongsToCompany(guard.session.user.companyId, vehicleId))) {
    return NextResponse.json({ error: "Mezzo non trovato." }, { status: 404 });
  }

  const item = await updateLoadPlan(guard.session.user.companyId, id, {
    name: body.name ? String(body.name) : undefined,
    tripId,
    vehicleId,
    vehicleType: body.vehicleType ? String(body.vehicleType) : undefined,
    containerType: body.containerType === undefined ? undefined : body.containerType ? String(body.containerType) : null,
    items: Array.isArray(body.items) ? body.items : undefined,
    totals: body.totals && typeof body.totals === "object" ? (body.totals as Record<string, unknown>) : undefined,
  });
  if (!item) return NextResponse.json({ error: "Piano non trovato." }, { status: 404 });
  return NextResponse.json({ item });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }
  const { id } = await params;
  const ok = await deleteLoadPlan(guard.session.user.companyId, id);
  if (!ok) return NextResponse.json({ error: "Piano non trovato." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

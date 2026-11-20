import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { getTenantDb } from "@/lib/tenant";
import { addTripCost, listTripCosts } from "@/lib/trip-costs";

async function guardTrip(companyId: string, tripId: string) {
  const tenantDb = getTenantDb(companyId);
  return tenantDb.trips.findFirst({ where: { id: tripId } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireFeature("trips");
  if (guard.error) return guard.error;
  const { id } = await params;
  const trip = await guardTrip(guard.session.user.companyId, id);
  if (!trip) return NextResponse.json({ error: "Viaggio non trovato." }, { status: 404 });

  const summary = await listTripCosts(guard.session.user.companyId, id);
  return NextResponse.json({ ...summary, prezzo: trip.prezzo, margine: trip.prezzo != null ? trip.prezzo - summary.total : null });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireFeature("trips");
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  const { id } = await params;
  const trip = await guardTrip(guard.session.user.companyId, id);
  if (!trip) return NextResponse.json({ error: "Viaggio non trovato." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  try {
    const result = await addTripCost(guard.session.user.companyId, id, guard.session.user.id, {
      tipo: String(body.tipo ?? ""),
      label: body.label ? String(body.label) : null,
      quantity: body.quantity === undefined || body.quantity === "" ? 0 : Number(body.quantity),
      unit: body.unit ? String(body.unit) : null,
      unitCost: body.unitCost === undefined || body.unitCost === "" ? 0 : Number(body.unitCost),
      amount: body.amount === undefined || body.amount === "" ? undefined : Number(body.amount),
      note: body.note ? String(body.note) : null,
      source: body.source ? String(body.source) : "MANUAL",
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

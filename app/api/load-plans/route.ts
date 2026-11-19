import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { createLoadPlan, listLoadPlans } from "@/lib/ops";
import { tripBelongsToCompany, vehicleBelongsToCompany } from "@/lib/tenant-refs";

export async function GET() {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const items = await listLoadPlans(guard.session.user.companyId);
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

  if (!String(body.name ?? "").trim() && !Array.isArray(body.items)) {
    return NextResponse.json({ error: "Inserire un nome o almeno un collo." }, { status: 400 });
  }

  const tripId = body.tripId ? String(body.tripId) : null;
  const vehicleId = body.vehicleId ? String(body.vehicleId) : null;
  if (tripId && !(await tripBelongsToCompany(guard.session.user.companyId, tripId))) {
    return NextResponse.json({ error: "Viaggio non trovato." }, { status: 404 });
  }
  if (vehicleId && !(await vehicleBelongsToCompany(guard.session.user.companyId, vehicleId))) {
    return NextResponse.json({ error: "Mezzo non trovato." }, { status: 404 });
  }

  const item = await createLoadPlan(guard.session.user.companyId, guard.session.user.id, {
    name: body.name ? String(body.name) : undefined,
    tripId,
    vehicleId,
    vehicleType: body.vehicleType ? String(body.vehicleType) : undefined,
    containerType: body.containerType ? String(body.containerType) : null,
    items: Array.isArray(body.items) ? body.items : [],
    totals: body.totals && typeof body.totals === "object" ? (body.totals as Record<string, unknown>) : {},
  });
  return NextResponse.json({ item }, { status: 201 });
}

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { createRoutePlan, listRoutePlans } from "@/lib/ops";

export async function GET() {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const items = await listRoutePlans(guard.session.user.companyId);
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
  const item = await createRoutePlan(guard.session.user.companyId, guard.session.user.id, {
    name: body.name ? String(body.name) : undefined,
    stops: Array.isArray(body.stops) ? body.stops : [],
    optimized: Array.isArray(body.optimized) ? body.optimized : [],
    totalKm: Number(body.totalKm ?? 0),
    totalCost: Number(body.totalCost ?? 0),
    suggestedPrice: Number(body.suggestedPrice ?? 0),
  });
  return NextResponse.json({ item }, { status: 201 });
}

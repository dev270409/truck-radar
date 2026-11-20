import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { optimizeStopOrder, type GeoStop } from "@/lib/routes";

export async function POST(req: Request) {
  const guard = await requireFeature("routes");
  if (guard.error) return guard.error;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const rawStops = Array.isArray(body.stops) ? body.stops : [];
  const stops: GeoStop[] = rawStops
    .map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      return {
        name: String(o.name ?? o.address ?? "").trim(),
        address: o.address ? String(o.address) : undefined,
        lat: o.lat == null || o.lat === "" ? null : Number(o.lat),
        lng: o.lng == null || o.lng === "" ? null : Number(o.lng),
      };
    })
    .filter((s) => s.name.length > 0);

  if (stops.length < 2) {
    return NextResponse.json({ error: "Servono almeno due tappe." }, { status: 400 });
  }
  if (stops.some((s) => s.lat == null || s.lng == null || !Number.isFinite(s.lat) || !Number.isFinite(s.lng))) {
    return NextResponse.json(
      { error: "Alcune tappe non hanno coordinate. Geocodifica gli indirizzi prima di ottimizzare." },
      { status: 400 }
    );
  }

  const startIndex = Math.max(0, Math.min(stops.length - 1, Number(body.startIndex ?? 0)));
  const returnToDepot = body.returnToDepot !== false;
  const result = optimizeStopOrder(stops, { startIndex, returnToDepot });
  const ordered = result.order.map((i) => stops[i]);
  return NextResponse.json({ order: result.order, ordered, totalKm: result.totalKm });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getVehicleTrack } from "@/lib/fleet";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const url = new URL(req.url);
  const vehicleId = url.searchParams.get("vehicleId");
  const tripId = url.searchParams.get("tripId") ?? undefined;
  if (!vehicleId) {
    return NextResponse.json({ error: "Mezzo mancante." }, { status: 400 });
  }

  try {
    const owned = await db.vehicle.findFirst({
      where: { id: vehicleId, companyId: session.user.companyId },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "Mezzo non trovato." }, { status: 404 });
    }
    const track = await getVehicleTrack(session.user.companyId, vehicleId, tripId);
    return NextResponse.json({ track });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
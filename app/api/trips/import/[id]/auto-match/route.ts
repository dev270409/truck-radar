import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { db } from "@/lib/db";
import { autoMatchStatement } from "@/lib/trip-auto-match";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireFeature("trips");
  if (guard.error) return guard.error;
  if (guard.session.user.role !== "ADMIN" && guard.session.user.role !== "UFFICIO") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  const { id } = await params;
  let result;
  try {
    result = await autoMatchStatement(guard.session.user.companyId, id);
  } catch (error) {
    console.error("TRIP_AUTO_MATCH_FAILED", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore nel match automatico." },
      { status: 500 }
    );
  }
  if (!result) {
    return NextResponse.json({ error: "Rendiconto non trovato." }, { status: 404 });
  }

  await db.auditLog.create({
    data: {
      userId: guard.session.user.id,
      companyId: guard.session.user.companyId,
      action: "TRIP_STATEMENT_AUTO_MATCHED",
      entity: "TripStatement",
      entityId: id,
      payload: {
        matchedVehicles: result.matchedVehicles,
        matchedDrivers: result.matchedDrivers,
        emptyTrips: result.emptyTrips,
        emptyKm: result.emptyKm,
      },
    },
  });

  return NextResponse.json({ autoMatch: result });
}

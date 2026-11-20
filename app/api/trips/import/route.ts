import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { listTripStatements } from "@/lib/trip-statements";

export async function GET() {
  const guard = await requireFeature("trips");
  if (guard.error) return guard.error;
  if (guard.session.user.role !== "ADMIN" && guard.session.user.role !== "UFFICIO") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  const items = await listTripStatements(guard.session.user.companyId, 20);
  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      fileName: item.fileName,
      provider: item.provider,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      declaredTrips: item.declaredTrips,
      parsedTrips: item.parsedTrips,
      importedTrips: item.importedTrips,
      parsedTotal: item.parsedTotal,
      status: item.status,
      createdAt: item.createdAt,
      importedAt: item.importedAt,
    })),
  });
}

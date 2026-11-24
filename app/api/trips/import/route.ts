import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { getEarningsForecast } from "@/lib/trip-forecast";
import { listTripStatements } from "@/lib/trip-statements";

export async function GET() {
  const guard = await requireFeature("trips");
  if (guard.error) return guard.error;
  if (guard.session.user.role !== "ADMIN" && guard.session.user.role !== "UFFICIO") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  const [items, forecast] = await Promise.all([
    listTripStatements(guard.session.user.companyId, 20),
    getEarningsForecast(guard.session.user.companyId),
  ]);
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
      parserMode: item.parserMode,
      status: item.status,
      createdAt: item.createdAt,
      importedAt: item.importedAt,
    })),
    forecast,
  });
}

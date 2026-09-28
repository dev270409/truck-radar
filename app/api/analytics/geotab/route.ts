import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { listApiConnections, listExternalIntegrations } from "@/lib/raw-tables";

const MAX_RANGE_DAYS = 365;
const MAX_ROWS = 5000;

export async function GET(req: Request) {
  const session = await auth();
  const companyId = session?.user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "UFFICIO") {
    return NextResponse.json({ error: "Accesso riservato alla sede." }, { status: 403 });
  }

  const [connections, integrations] = await Promise.all([
    listApiConnections(companyId),
    listExternalIntegrations(),
  ]);
  const geotabIds = new Set(integrations.filter((i) => i.provider === "GEOTAB").map((i) => i.id));
  const connection = connections.find((c) => geotabIds.has(c.integrationId));
  if (!connection) {
    return NextResponse.json({ connected: false, trips: [], byVehicle: [], byDriver: [], totalTrips: 0, totalKm: 0 });
  }

  const url = new URL(req.url);
  const now = new Date();
  const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : now;
  const from = url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : new Date(now.getTime() - 90 * 86400000);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) {
    return NextResponse.json({ error: "Intervallo date non valido." }, { status: 400 });
  }
  if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * 86400000) {
    return NextResponse.json({ error: "L'intervallo massimo consultabile è 365 giorni." }, { status: 400 });
  }

  const rows = await db.$queryRawUnsafe(
    `SELECT "geotabTripId", "geotabDeviceId", "geotabDriverId", "deviceName", "licensePlate",
            "driverName", "startAt", "stopAt", "distanceKm", "odometerMeters",
            "drivingSeconds", "idlingSeconds"
     FROM "GeotabTripSnapshot"
     WHERE "companyId" = $1 AND "connectionId" = $2 AND "startAt" >= $3 AND "startAt" <= $4
     ORDER BY "startAt" DESC
     LIMIT $5`,
    companyId,
    connection.id,
    from,
    to,
    MAX_ROWS
  ) as Array<{
    geotabTripId: string;
    geotabDeviceId: string | null;
    geotabDriverId: string | null;
    deviceName: string | null;
    licensePlate: string | null;
    driverName: string | null;
    startAt: Date;
    stopAt: Date | null;
    distanceKm: number | null;
    odometerMeters: number | null;
    drivingSeconds: string | null;
    idlingSeconds: string | null;
  }>;

  const byVehicleMap = new Map<string, { name: string; trips: number; km: number }>();
  const byDriverMap = new Map<string, { name: string; trips: number; km: number }>();
  let totalKm = 0;
  for (const row of rows) {
    const km = Number.isFinite(row.distanceKm) ? Number(row.distanceKm) : 0;
    totalKm += km;
    const vehicleName = row.licensePlate?.trim() || row.deviceName?.trim() || row.geotabDeviceId || "Mezzo Geotab";
    const v = byVehicleMap.get(vehicleName) ?? { name: vehicleName, trips: 0, km: 0 };
    v.trips += 1;
    v.km += km;
    byVehicleMap.set(vehicleName, v);
    const driverName = row.driverName?.trim() || "Driver non associato";
    const d = byDriverMap.get(driverName) ?? { name: driverName, trips: 0, km: 0 };
    d.trips += 1;
    d.km += km;
    byDriverMap.set(driverName, d);
  }

  const snapshot = (connection.config as Record<string, unknown> | null)?.geotabSnapshot as Record<string, unknown> | undefined;
  return NextResponse.json({
    connected: true,
    connectionStatus: connection.status,
    from: from.toISOString(),
    to: to.toISOString(),
    historyFetchedAt: snapshot?.historyFetchedAt ?? null,
    historyWarning: typeof snapshot?.historyWarning === "string" ? snapshot.historyWarning : null,
    totalTrips: rows.length,
    totalKm: Math.round(totalKm * 10) / 10,
    byVehicle: [...byVehicleMap.values()].map((row) => ({ ...row, km: Math.round(row.km * 10) / 10 })).sort((a, b) => b.km - a.km),
    byDriver: [...byDriverMap.values()].map((row) => ({ ...row, km: Math.round(row.km * 10) / 10 })).sort((a, b) => b.km - a.km),
    trips: rows.slice(0, 100).map((row) => ({
      id: row.geotabTripId,
      vehicle: row.licensePlate?.trim() || row.deviceName || "Mezzo Geotab",
      driver: row.driverName?.trim() || "—",
      startAt: row.startAt,
      stopAt: row.stopAt,
      km: row.distanceKm,
      odometerMeters: row.odometerMeters,
    })),
    truncated: rows.length === MAX_ROWS,
    unladenKm: null,
    unladenKmReason: "Geotab registra distanza percorsa, ma non identifica da solo se il mezzo viaggiava vuoto. Serve associare i viaggi/carichi di Truck Radar o un dato operativo equivalente.",
  });
}

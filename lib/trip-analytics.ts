import { db } from "./db";
import { normalizePlate } from "./geotab";
import { getTripStatement } from "./trip-statements";

export interface StatementTripSummary {
  code: string;
  date: string;
  customer: string;
  description: string;
  amount: number;
}

export interface StatementAnalytics {
  statementId: string;
  periodStart: string | null;
  periodEnd: string | null;
  totalEarnings: number;
  tripCount: number;
  activeDays: number;
  avgPerTrip: number;
  avgPerActiveDay: number;
  projectedYear: number;
  topTrips: StatementTripSummary[];
  bottomTrips: StatementTripSummary[];
  topRevenuePerKm: Array<{ code: string; km: number; amount: number; revenuePerKm: number }>;
  geotab: {
    available: boolean;
    totalKm: number;
    movementKm: number;
    movementCount: number;
    realTripKm: number;
    realTripCount: number;
    matchedKm: number;
    matchedTrips: number;
    unassignedTrips: number;
    unallocatedKm: number;
    unmatchedGeotabTrips: number;
    coveragePct: number;
  };
  warnings: string[];
}

interface LineWithTrip {
  code: string;
  date: string | Date;
  amount: number;
  tripId: string | null;
  tripStart: Date | string | null;
  vehicleId: string | null;
  targa: string | null;
}

interface SnapshotRow {
  id: string;
  geotabTripId: string;
  licensePlate: string | null;
  startAt: Date;
  stopAt: Date | null;
  distanceKm: number | null;
  drivingSeconds: string | null;
  idlingSeconds: string | null;
}

const MOVEMENT_MAX_KM = 3;
const MOVEMENT_MAX_MINUTES = 8;

function dayKey(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isMovement(snapshot: SnapshotRow): boolean {
  const km = Number(snapshot.distanceKm ?? 0);
  const minutes = snapshot.stopAt
    ? (snapshot.stopAt.getTime() - snapshot.startAt.getTime()) / 60_000
    : 0;
  return km > 0 && (km < MOVEMENT_MAX_KM || (minutes > 0 && minutes < MOVEMENT_MAX_MINUTES && km < 10));
}

export async function analyzeTripStatement(
  companyId: string,
  statementId: string
): Promise<StatementAnalytics | null> {
  const statement = await getTripStatement(companyId, statementId);
  if (!statement) return null;

  const lines = (await db.$queryRawUnsafe(
    `SELECT l.code, l.date, l.amount, l."tripId", t."dataRitiro" AS "tripStart", t."vehicleId", v.targa
     FROM "TripStatementLine" l
     LEFT JOIN "Trip" t ON t.id = l."tripId"
     LEFT JOIN "Vehicle" v ON v.id = t."vehicleId"
     WHERE l."companyId" = $1 AND l."statementId" = $2
     ORDER BY l.date ASC`,
    companyId,
    statementId
  )) as LineWithTrip[];
  const normalizedLines = lines.map((line) => ({
    ...line,
    date: line.date instanceof Date ? dayKey(line.date) : String(line.date).slice(0, 10),
  }));

  const payloadLines = statement.payload.lines;
  const trips: StatementTripSummary[] = payloadLines
    .map((line) => ({
      code: line.code,
      date: line.date,
      customer: line.customer,
      description: line.description,
      amount: line.amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  const totalEarnings = round(
    payloadLines.reduce((sum, line) => sum + line.amount, 0),
    2
  );
  const activeDays = statement.declaredDays ?? new Set(payloadLines.map((line) => line.date)).size;
  const avgPerTrip = payloadLines.length > 0 ? round(totalEarnings / payloadLines.length, 2) : 0;
  const avgPerActiveDay = activeDays > 0 ? round(totalEarnings / activeDays, 2) : 0;

  const snapshots = (await db.$queryRawUnsafe(
    `SELECT id, "geotabTripId", "licensePlate", "startAt", "stopAt", "distanceKm", "drivingSeconds", "idlingSeconds"
     FROM "GeotabTripSnapshot"
     WHERE "companyId" = $1
       AND "startAt" >= $2::date - interval '1 day'
       AND "startAt" < $3::date + interval '2 days'
     ORDER BY "startAt" ASC`,
    companyId,
    statement.periodStart,
    statement.periodEnd
  )) as SnapshotRow[];

  const normalizedSnapshots = snapshots.map((snapshot) => ({
    ...snapshot,
    startAt: new Date(snapshot.startAt),
    stopAt: snapshot.stopAt ? new Date(snapshot.stopAt) : null,
    distanceKm: snapshot.distanceKm == null ? null : Number(snapshot.distanceKm),
  }));
  const movements = normalizedSnapshots.filter(isMovement);
  const realTrips = normalizedSnapshots.filter((snapshot) => !isMovement(snapshot));
  const totalKm = round(normalizedSnapshots.reduce((sum, row) => sum + (row.distanceKm ?? 0), 0), 1);
  const movementKm = round(movements.reduce((sum, row) => sum + (row.distanceKm ?? 0), 0), 1);
  const realTripKm = round(realTrips.reduce((sum, row) => sum + (row.distanceKm ?? 0), 0), 1);

  const warnings: string[] = [];
  const usedSnapshots = new Set<string>();
  const revenuePerKm: Array<{ code: string; km: number; amount: number; revenuePerKm: number }> = [];
  let matchedKm = 0;
  let matchedTrips = 0;
  let unassignedTrips = 0;

  for (const line of normalizedLines) {
    if (!line.tripId) continue;
    if (!line.vehicleId || !line.targa) {
      unassignedTrips += 1;
      continue;
    }
    const plate = normalizePlate(line.targa);
    const day = line.date;
    const departure = line.tripStart ? new Date(line.tripStart).getTime() : null;
    const candidates = realTrips.filter(
      (snapshot) =>
        !usedSnapshots.has(snapshot.id) &&
        dayKey(snapshot.startAt) === day &&
        snapshot.licensePlate &&
        normalizePlate(snapshot.licensePlate) === plate
    );
    if (candidates.length === 0) continue;
    const best = candidates.reduce((chosen, snapshot) => {
      if (!departure) return chosen;
      const chosenDelta = Math.abs(chosen.startAt.getTime() - departure);
      const snapshotDelta = Math.abs(snapshot.startAt.getTime() - departure);
      return snapshotDelta < chosenDelta ? snapshot : chosen;
    });
    usedSnapshots.add(best.id);
    matchedTrips += 1;
    const km = Number(best.distanceKm ?? 0);
    matchedKm += km;
    if (km > 0 && line.amount > 0) {
      revenuePerKm.push({
        code: line.code,
        km: round(km, 1),
        amount: line.amount,
        revenuePerKm: round(line.amount / km, 2),
      });
    }
  }

  if (normalizedSnapshots.length === 0) {
    warnings.push("Nessun dato Geotab nel periodo: km e viaggi a vuoto non calcolabili.");
  } else if (unassignedTrips > 0) {
    warnings.push(
      `${unassignedTrips} viaggi importati non hanno un mezzo assegnato: il collegamento a Geotab è parziale.`
    );
  }

  const unallocatedKm = round(Math.max(0, realTripKm - matchedKm), 1);
  const coverageBase = normalizedLines.filter((line) => line.tripId && line.targa).length;
  const coveragePct = coverageBase > 0 ? Math.round((matchedTrips / coverageBase) * 100) : 0;

  return {
    statementId,
    periodStart: statement.periodStart,
    periodEnd: statement.periodEnd,
    totalEarnings,
    tripCount: payloadLines.length,
    activeDays,
    avgPerTrip,
    avgPerActiveDay,
    projectedYear: round(totalEarnings * 12, 2),
    topTrips: trips.slice(0, 5),
    bottomTrips: trips.slice(-5).reverse(),
    topRevenuePerKm: revenuePerKm.sort((a, b) => b.revenuePerKm - a.revenuePerKm).slice(0, 5),
    geotab: {
      available: normalizedSnapshots.length > 0,
      totalKm,
      movementKm,
      movementCount: movements.length,
      realTripKm,
      realTripCount: realTrips.length,
      matchedKm: round(matchedKm, 1),
      matchedTrips,
      unassignedTrips,
      unallocatedKm,
      unmatchedGeotabTrips: Math.max(0, realTrips.length - usedSnapshots.size),
      coveragePct,
    },
    warnings,
  };
}

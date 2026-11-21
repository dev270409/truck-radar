import { db } from "./db";
import { normalizePlate } from "./geotab";
import { isGeotabMovement } from "./geotab-classify";
import { romeDayKey } from "./trip-statement";
import { getEarningsForecast, type EarningsForecast } from "./trip-forecast";
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
  forecast: EarningsForecast;
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
    emptyKm: number;
    emptyTrips: number;
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

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
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
    date: line.date instanceof Date ? romeDayKey(line.date) : String(line.date).slice(0, 10),
  }));

  const persistedMatches = (await db.$queryRawUnsafe(
    `SELECT m."tripId", m."geotabTripId", m."distanceKm"
     FROM "TripGeotabMatch" m
     JOIN "TripStatementLine" l ON l."tripId" = m."tripId"
     WHERE l."companyId" = $1 AND l."statementId" = $2`,
    companyId,
    statementId
  )) as Array<{ tripId: string; geotabTripId: string; distanceKm: number | null }>;
  const matchByTripId = new Map(persistedMatches.map((match) => [match.tripId, match]));

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
  const forecast = await getEarningsForecast(companyId);

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
  const movements = normalizedSnapshots.filter(isGeotabMovement);
  const realTrips = normalizedSnapshots.filter((snapshot) => !isGeotabMovement(snapshot));
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
    }

    const persisted = matchByTripId.get(line.tripId);
    if (persisted) {
      matchedTrips += 1;
      usedSnapshots.add(persisted.geotabTripId);
      const km = Number(persisted.distanceKm ?? 0);
      matchedKm += km;
      if (km > 0 && line.amount > 0) {
        revenuePerKm.push({
          code: line.code,
          km: round(km, 1),
          amount: line.amount,
          revenuePerKm: round(line.amount / km, 2),
        });
      }
      continue;
    }

    if (!line.vehicleId || !line.targa) continue;
    const plate = normalizePlate(line.targa);
    const day = line.date;
    const departure = line.tripStart ? new Date(line.tripStart).getTime() : null;
    const candidates = realTrips.filter(
      (snapshot) =>
        !usedSnapshots.has(snapshot.geotabTripId) &&
        romeDayKey(snapshot.startAt) === day &&
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
    usedSnapshots.add(best.geotabTripId);
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

  const emptySnapshots = realTrips.filter(
    (snapshot) => !usedSnapshots.has(snapshot.geotabTripId)
  );
  const emptyKm = round(
    emptySnapshots.reduce((sum, snapshot) => sum + Number(snapshot.distanceKm ?? 0), 0),
    1
  );
  const emptyTrips = emptySnapshots.length;
  const unallocatedKm = emptyKm;
  const coverageBase = normalizedLines.filter((line) => line.tripId).length;
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
    projectedYear: forecast.projected12m,
    forecast,
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
      emptyKm,
      emptyTrips,
      unmatchedGeotabTrips: emptyTrips,
      coveragePct,
    },
    warnings,
  };
}

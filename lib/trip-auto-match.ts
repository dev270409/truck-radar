import { db } from "./db";
import { normalizePlate } from "./geotab";
import { isGeotabMovement } from "./geotab-classify";
import { romeDateTime, romeDayKey } from "./trip-statement";
import { getTripStatement, listStatementLines } from "./trip-statements";

export interface AutoMatchDetail {
  code: string;
  tripId: string;
  vehicleId: string;
  plate: string;
  driverId: string | null;
  matchType: "AUTO_TIME" | "AUTO_DAY" | "AUTO_RANK";
  confidence: "ALTA" | "MEDIA" | "BASSA";
  geotabTripId: string;
  snapshotStart: string;
  snapshotStop: string | null;
  snapshotKm: number | null;
}

export interface AutoMatchResult {
  matchedVehicles: number;
  matchedDrivers: number;
  emptyTrips: number;
  emptyKm: number;
  details: AutoMatchDetail[];
}

interface SnapshotRow {
  id: string;
  geotabTripId: string;
  licensePlate: string | null;
  driverName: string | null;
  startAt: Date;
  stopAt: Date | null;
  distanceKm: number | null;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normName(value: string) {
  return value.toUpperCase().replace(/[^A-Z]/g, "");
}

/**
 * Collega i viaggi importati ai tracciati Geotab quando il match è
 * sufficientemente certo:
 * 1. stessa ora di partenza (se il rendiconto la indica) entro 90 minuti;
 * 2. un solo mezzo con tracciati quel giorno;
 * 3. un solo viaggio pagato e un tracciato chiaramente più lungo degli altri.
 * Nei casi ambigui non assegna: l'admin sceglie (con i consigli mezzo/autista).
 */
export async function autoMatchStatement(
  companyId: string,
  statementId: string
): Promise<AutoMatchResult | null> {
  const statement = await getTripStatement(companyId, statementId);
  if (!statement) return null;

  const lineRows = (await listStatementLines(companyId, statementId)).filter((line) => line.tripId);
  if (lineRows.length === 0) {
    return { matchedVehicles: 0, matchedDrivers: 0, emptyTrips: 0, emptyKm: 0, details: [] };
  }

  const payloadByCode = new Map(statement.payload.lines.map((line) => [line.code, line]));
  const tripIds = lineRows.map((line) => line.tripId).filter((id): id is string => Boolean(id));
  const [trips, vehicles, users, snapshots] = await Promise.all([
    db.trip.findMany({
      where: { companyId, id: { in: tripIds } },
      select: { id: true, dataRitiro: true, vehicleId: true, driverId: true, status: true },
    }),
    db.vehicle.findMany({
      where: { companyId },
      select: { id: true, targa: true, categoria: true, portataMaxKg: true, volumeMaxM3: true },
    }),
    db.user.findMany({
      where: { companyId, role: "AUTISTA", isActive: true },
      select: { id: true, nome: true, cognome: true },
    }),
    db.$queryRawUnsafe(
      `SELECT id, "geotabTripId", "licensePlate", "driverName", "startAt", "stopAt", "distanceKm"
       FROM "GeotabTripSnapshot"
       WHERE "companyId" = $1
         AND "startAt" >= $2::date - interval '1 day'
         AND "startAt" < $3::date + interval '2 days'
       ORDER BY "startAt" ASC`,
      companyId,
      statement.periodStart,
      statement.periodEnd
    ) as Promise<SnapshotRow[]>,
  ]);

  const tripById = new Map(trips.map((trip) => [trip.id, trip]));
  const vehicleByPlate = new Map(vehicles.map((vehicle) => [normalizePlate(vehicle.targa), vehicle]));
  const driverByName = new Map(
    users.map((user) => [normName(`${user.nome} ${user.cognome}`), user.id])
  );

  const normalizedSnapshots = snapshots
    .map((snapshot) => ({
      ...snapshot,
      startAt: new Date(snapshot.startAt),
      stopAt: snapshot.stopAt ? new Date(snapshot.stopAt) : null,
      distanceKm: snapshot.distanceKm == null ? null : Number(snapshot.distanceKm),
    }))
    .filter((snapshot) => !isGeotabMovement(snapshot));

  const used = new Set<string>();
  const details: AutoMatchDetail[] = [];

  const dayKeyOfLine = (date: string | Date) =>
    date instanceof Date ? romeDayKey(date) : String(date).slice(0, 10);

  const linesByDay = new Map<string, typeof lineRows>();
  for (const line of lineRows) {
    const key = dayKeyOfLine(line.date);
    const list = linesByDay.get(key) ?? [];
    list.push(line);
    linesByDay.set(key, list);
  }

  const snapshotsByDay = new Map<string, typeof normalizedSnapshots>();
  for (const snapshot of normalizedSnapshots) {
    const key = romeDayKey(snapshot.startAt);
    const list = snapshotsByDay.get(key) ?? [];
    list.push(snapshot);
    snapshotsByDay.set(key, list);
  }

  for (const [day, dayLines] of linesByDay) {
    const daySnapshots = snapshotsByDay.get(day) ?? [];
    if (daySnapshots.length === 0) continue;

    const pending = dayLines.filter((line) => {
      const trip = line.tripId ? tripById.get(line.tripId) : null;
      return trip && !trip.vehicleId;
    });
    if (pending.length === 0) continue;

    // 1) Match per ora esplicita nel rendiconto.
    for (const line of [...pending]) {
      const payload = payloadByCode.get(line.code);
      if (!payload?.pickupTimeExplicit) continue;
      const target = romeDateTime(payload.date, payload.pickupTime).getTime();
      const candidates = daySnapshots
        .filter((snapshot) => !used.has(snapshot.id))
        .map((snapshot) => ({
          snapshot,
          delta: Math.abs(snapshot.startAt.getTime() - target),
        }))
        .filter((candidate) => candidate.delta <= 90 * 60_000)
        .sort((a, b) => a.delta - b.delta);
      if (candidates.length === 0) continue;
      const best = candidates[0];
      const second = candidates[1];
      const confident =
        candidates.length === 1 ||
        (best.delta <= 45 * 60_000 && (!second || second.delta >= best.delta * 2));
      if (!confident) continue;
      const vehicle = best.snapshot.licensePlate
        ? vehicleByPlate.get(normalizePlate(best.snapshot.licensePlate))
        : undefined;
      if (!vehicle || !line.tripId) continue;
      used.add(best.snapshot.id);
      details.push({
        code: line.code,
        tripId: line.tripId,
        vehicleId: vehicle.id,
        plate: vehicle.targa,
        driverId: best.snapshot.driverName
          ? driverByName.get(normName(best.snapshot.driverName)) ?? null
          : null,
        matchType: "AUTO_TIME",
        confidence: best.delta <= 30 * 60_000 ? "ALTA" : "MEDIA",
        geotabTripId: best.snapshot.geotabTripId,
        snapshotStart: best.snapshot.startAt.toISOString(),
        snapshotStop: best.snapshot.stopAt ? best.snapshot.stopAt.toISOString() : null,
        snapshotKm: best.snapshot.distanceKm,
      });
      const index = pending.indexOf(line);
      if (index >= 0) pending.splice(index, 1);
    }

    // 2) Un solo mezzo con tracciati quel giorno: il mezzo è certo.
    const remainingSnapshots = daySnapshots.filter((snapshot) => !used.has(snapshot.id));
    const plates = new Set(
      remainingSnapshots
        .map((snapshot) => (snapshot.licensePlate ? normalizePlate(snapshot.licensePlate) : null))
        .filter((plate): plate is string => Boolean(plate))
    );
    if (plates.size === 1 && pending.length > 0) {
      const plate = [...plates][0];
      const vehicle = vehicleByPlate.get(plate);
      if (vehicle) {
        for (const line of pending) {
          const snapshot =
            remainingSnapshots
              .filter((item) => !used.has(item.id))
              .sort((a, b) => (b.distanceKm ?? 0) - (a.distanceKm ?? 0))[0] ?? null;
          if (!snapshot || !line.tripId) continue;
          used.add(snapshot.id);
          details.push({
            code: line.code,
            tripId: line.tripId,
            vehicleId: vehicle.id,
            plate: vehicle.targa,
            driverId: snapshot.driverName
              ? driverByName.get(normName(snapshot.driverName)) ?? null
              : null,
            matchType: "AUTO_DAY",
            confidence: "MEDIA",
            geotabTripId: snapshot.geotabTripId,
            snapshotStart: snapshot.startAt.toISOString(),
            snapshotStop: snapshot.stopAt ? snapshot.stopAt.toISOString() : null,
            snapshotKm: snapshot.distanceKm,
          });
        }
      }
    } else if (plates.size > 1 && pending.length === 1) {
      // 3) Un solo viaggio pagato: prendi il tracciato più lungo se è nettamente sopra gli altri.
      const sorted = remainingSnapshots
        .filter((snapshot) => !used.has(snapshot.id))
        .sort((a, b) => (b.distanceKm ?? 0) - (a.distanceKm ?? 0));
      const best = sorted[0];
      const second = sorted[1];
      if (
        best &&
        best.licensePlate &&
        (!second || (best.distanceKm ?? 0) >= (second.distanceKm ?? 0) * 1.5)
      ) {
        const vehicle = vehicleByPlate.get(normalizePlate(best.licensePlate));
        const line = pending[0];
        if (vehicle && line.tripId) {
          used.add(best.id);
          details.push({
            code: line.code,
            tripId: line.tripId,
            vehicleId: vehicle.id,
            plate: vehicle.targa,
            driverId: best.driverName
              ? driverByName.get(normName(best.driverName)) ?? null
              : null,
            matchType: "AUTO_RANK",
            confidence: "BASSA",
            geotabTripId: best.geotabTripId,
            snapshotStart: best.startAt.toISOString(),
            snapshotStop: best.stopAt ? best.stopAt.toISOString() : null,
            snapshotKm: best.distanceKm,
          });
        }
      }
    }
  }

  if (details.length > 0) {
    await db.$transaction(
      async (tx) => {
        for (const detail of details) {
          const trip = tripById.get(detail.tripId);
          if (!trip) continue;
          const isPast = new Date(trip.dataRitiro).getTime() < Date.now();
          const data: {
            vehicleId: string;
            driverId?: string;
            status?: "ASSEGNATO" | "COMPLETATO";
          } = { vehicleId: detail.vehicleId };
          if (detail.driverId) {
            data.driverId = detail.driverId;
            data.status = isPast ? "COMPLETATO" : "ASSEGNATO";
          }
          await tx.trip.updateMany({
            where: { id: detail.tripId, companyId },
            data,
          });
          await tx.$executeRawUnsafe(
            `INSERT INTO "TripGeotabMatch"
              ("companyId", "tripId", "geotabTripId", "licensePlate", "startAt", "stopAt", "distanceKm", "matchType", confidence)
             VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7, $8, $9)
             ON CONFLICT ("companyId", "tripId", "geotabTripId")
             DO UPDATE SET "matchType" = EXCLUDED."matchType", confidence = EXCLUDED.confidence`,
            companyId,
            detail.tripId,
            detail.geotabTripId,
            detail.plate,
            detail.snapshotStart,
            detail.snapshotStop,
            detail.snapshotKm,
            detail.matchType,
            detail.confidence
          );
        }
      },
      { timeout: 30000 }
    );
  }

  const emptySnapshots = normalizedSnapshots.filter((snapshot) => !used.has(snapshot.id));
  return {
    matchedVehicles: details.length,
    matchedDrivers: details.filter((detail) => detail.driverId).length,
    emptyTrips: emptySnapshots.length,
    emptyKm: round(
      emptySnapshots.reduce((sum, snapshot) => sum + Number(snapshot.distanceKm ?? 0), 0),
      1
    ),
    details,
  };
}

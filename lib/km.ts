import { db } from "./db";
import { cityKm } from "./smart-return";

/**
 * Base dati km per viaggio (T13): ogni trip ha una stima km deterministica (Haversine
 * città + fattore stradale). ensureTripKm riempie idempotentemente i record mancanti
 * così analytics (T11/T12) ed ESG (T18) leggono sempre una base dati completa.
 */

export async function ensureTripKm(companyId: string): Promise<number> {
  const trips = await db.trip.findMany({
    where: { companyId },
    select: { id: true, luogoRitiro: true, luogoConsegna: true },
  });
  if (trips.length === 0) return 0;
  let inserted = 0;
  for (const t of trips) {
    try {
      const res = await db.$executeRawUnsafe(
        `INSERT INTO "TripKm" ("tripId", "companyId", "km")
         VALUES ($1, $2, $3)
         ON CONFLICT ("tripId") DO NOTHING`,
        t.id,
        companyId,
        cityKm(t.luogoRitiro, t.luogoConsegna)
      );
      inserted += res > 0 ? 1 : 0;
    } catch {
      /* riga già presente o dato incompleto: continua */
    }
  }
  return inserted;
}

export interface TripKmRow {
  tripId: string;
  km: number;
}

export async function tripKmMap(companyId: string): Promise<Map<string, number>> {
  await ensureTripKm(companyId);
  const rows = (await db.$queryRawUnsafe(
    `SELECT "tripId", "km" FROM "TripKm" WHERE "companyId" = $1`,
    companyId
  )) as Array<{ tripId: string; km: number }>;
  return new Map(rows.map((r) => [r.tripId, Number(r.km ?? 0)]));
}

export async function totalKmCompany(companyId: string): Promise<number> {
  const map = await tripKmMap(companyId);
  return [...map.values()].reduce((a, b) => a + b, 0);
}
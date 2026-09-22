import { randomBytes } from "crypto";
import { db } from "./db";

/**
 * VISTA COMMITTENTE (§53): condivisione della pagina di tracking spedizione verso il
 * committente tramite token univoco. La pagina pubblica espone SOLO i dati autorizzati
 * (posizione, stato consegna, DDT, info operative) e nessuna credenziale/altro tenant.
 */

export interface TripShareRow {
  id: string;
  tripId: string;
  companyId: string;
  token: string;
  enabled: boolean;
  note: string | null;
  createdBy: string;
  createdAt: Date;
}

export function newShareToken(): string {
  return randomBytes(16).toString("hex");
}

export async function listTripShares(companyId: string, tripId?: string): Promise<TripShareRow[]> {
  if (tripId) {
    return db.$queryRawUnsafe(
      `SELECT * FROM "TripShare" WHERE "companyId" = $1 AND "tripId" = $2 ORDER BY "createdAt" DESC`,
      companyId,
      tripId
    ) as Promise<TripShareRow[]>;
  }
  return db.$queryRawUnsafe(
    `SELECT * FROM "TripShare" WHERE "companyId" = $1 ORDER BY "createdAt" DESC`,
    companyId
  ) as Promise<TripShareRow[]>;
}

export async function getTripShareByToken(token: string): Promise<TripShareRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT * FROM "TripShare" WHERE "token" = $1 AND "enabled" = true`,
    token
  )) as TripShareRow[];
  return rows[0] ?? null;
}

export async function createTripShare(data: {
  tripId: string;
  companyId: string;
  note?: string | null;
  createdBy: string;
}): Promise<TripShareRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "TripShare" ("tripId", "companyId", "token", "enabled", "note", "createdBy")
     VALUES ($1, $2, $3, true, $4, $5)
     RETURNING *`,
    data.tripId,
    data.companyId,
    newShareToken(),
    data.note ?? null,
    data.createdBy
  )) as TripShareRow[];
  return rows[0];
}

export async function setTripShareEnabled(companyId: string, id: string, enabled: boolean): Promise<boolean> {
  const res = await db.$executeRawUnsafe(
    `UPDATE "TripShare" SET "enabled" = $1 WHERE "id" = $2 AND "companyId" = $3`,
    enabled,
    id,
    companyId
  );
  return res > 0;
}

export async function deleteTripShare(companyId: string, id: string): Promise<boolean> {
  const res = await db.$executeRawUnsafe(
    `DELETE FROM "TripShare" WHERE "id" = $1 AND "companyId" = $2`,
    id,
    companyId
  );
  return res > 0;
}
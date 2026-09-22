import { db } from "./db";

export interface GeofenceAreaRow {
  id: string;
  companyId: string;
  name: string;
  latCenter: number | null;
  lngCenter: number | null;
  raggioM: number;
  color: string;
  note: string | null;
  createdAt: Date;
}

export interface NewGeofenceArea {
  name: string;
  latCenter?: number | null;
  lngCenter?: number | null;
  raggioM?: number;
  color?: string;
  note?: string | null;
}

export async function createGeofence(companyId: string, data: NewGeofenceArea): Promise<GeofenceAreaRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "GeofenceArea" ("companyId", name, "latCenter", "lngCenter", "raggioM", color, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    companyId,
    data.name,
    data.latCenter ?? null,
    data.lngCenter ?? null,
    data.raggioM ?? 1000,
    data.color ?? "#3b82f6",
    data.note ?? null
  )) as GeofenceAreaRow[];
  return normalizeDates(rows[0]);
}

export async function updateGeofence(companyId: string, id: string, data: Partial<NewGeofenceArea>): Promise<GeofenceAreaRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `UPDATE "GeofenceArea" SET
       name = COALESCE($3, name),
       "latCenter" = COALESCE($4, "latCenter"),
       "lngCenter" = COALESCE($5, "lngCenter"),
       "raggioM" = COALESCE($6, "raggioM"),
       color = COALESCE($7, color),
       note = COALESCE($8, note)
     WHERE id = $1 AND "companyId" = $2
     RETURNING *`,
    id,
    companyId,
    data.name ?? null,
    data.latCenter ?? null,
    data.lngCenter ?? null,
    data.raggioM ?? null,
    data.color ?? null,
    data.note ?? null
  )) as GeofenceAreaRow[];
  return rows[0] ? normalizeDates(rows[0]) : null;
}

export async function deleteGeofence(companyId: string, id: string): Promise<boolean> {
  const n = (await db.$executeRawUnsafe(
    `DELETE FROM "GeofenceArea" WHERE id = $1 AND "companyId" = $2`,
    id,
    companyId
  )) as number;
  return n > 0;
}

export async function listGeofences(companyId: string): Promise<GeofenceAreaRow[]> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT * FROM "GeofenceArea" WHERE "companyId" = $1 ORDER BY "createdAt" ASC`,
    companyId
  )) as GeofenceAreaRow[];
  return rows.map(normalizeDates);
}

function normalizeDates(r: GeofenceAreaRow): GeofenceAreaRow {
  return {
    ...r,
    createdAt: r.createdAt ? new Date(r.createdAt) : r.createdAt,
  };
}
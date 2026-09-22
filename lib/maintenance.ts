import { db } from "./db";

export interface VehicleMaintenanceRow {
  id: string;
  vehicleId: string;
  companyId: string;
  tipo: string;
  descrizione: string | null;
  kmProssimo: number | null;
  dataProssima: Date | null;
  kmEseguito: number | null;
  dataEseguito: Date | null;
  costo: number | null;
  fornitore: string | null;
  note: string | null;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewMaintenance {
  vehicleId: string;
  tipo: string;
  descrizione?: string | null;
  kmProssimo?: number | null;
  dataProssima?: string | Date | null;
  costo?: number | null;
  fornitore?: string | null;
  note?: string | null;
}

export async function createMaintenance(companyId: string, data: NewMaintenance, createdBy: string): Promise<VehicleMaintenanceRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "VehicleMaintenance"
       ("vehicleId", "companyId", "tipo", "descrizione", "kmProssimo", "dataProssima", "costo", "fornitore", "note", "status", "createdBy")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PROGRAMMATO', $10)
     RETURNING *`,
    data.vehicleId,
    companyId,
    data.tipo,
    data.descrizione ?? null,
    data.kmProssimo ?? null,
    data.dataProssima ? new Date(data.dataProssima) : null,
    data.costo ?? null,
    data.fornitore ?? null,
    data.note ?? null,
    createdBy
  )) as VehicleMaintenanceRow[];
  return normalizeDates(rows[0]);
}

export async function listMaintenanceByVehicle(companyId: string, vehicleId?: string): Promise<VehicleMaintenanceRow[]> {
  const rows = vehicleId
    ? ((await db.$queryRawUnsafe(
        `SELECT * FROM "VehicleMaintenance" WHERE "companyId" = $1 AND "vehicleId" = $2 ORDER BY "createdAt" DESC`,
        companyId,
        vehicleId
      )) as VehicleMaintenanceRow[])
    : ((await db.$queryRawUnsafe(
        `SELECT * FROM "VehicleMaintenance" WHERE "companyId" = $1 ORDER BY "createdAt" DESC`,
        companyId
      )) as VehicleMaintenanceRow[]);
  return rows.map(normalizeDates);
}

export async function setMaintenanceStatus(companyId: string, id: string, status: string): Promise<VehicleMaintenanceRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `UPDATE "VehicleMaintenance"
     SET status = $3, "dataEseguito" = CASE WHEN $3 = 'ESEGUITO' THEN COALESCE("dataEseguito", now()) ELSE "dataEseguito" END,
         "updatedAt" = now()
     WHERE id = $1 AND "companyId" = $2
     RETURNING *`,
    id,
    companyId,
    status
  )) as VehicleMaintenanceRow[];
  return rows[0] ? normalizeDates(rows[0]) : null;
}

export async function deleteMaintenance(companyId: string, id: string): Promise<boolean> {
  const n = (await db.$executeRawUnsafe(
    `DELETE FROM "VehicleMaintenance" WHERE id = $1 AND "companyId" = $2`,
    id,
    companyId
  )) as number;
  return n > 0;
}

function normalizeDates(r: VehicleMaintenanceRow): VehicleMaintenanceRow {
  return {
    ...r,
    dataProssima: r.dataProssima ? new Date(r.dataProssima) : null,
    dataEseguito: r.dataEseguito ? new Date(r.dataEseguito) : null,
    createdAt: r.createdAt ? new Date(r.createdAt) : r.createdAt,
    updatedAt: r.updatedAt ? new Date(r.updatedAt) : r.updatedAt,
  };
}
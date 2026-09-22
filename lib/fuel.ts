import { db } from "./db";

export interface FuelLogRow {
  id: string;
  vehicleId: string;
  companyId: string;
  tripId: string | null;
  litri: number;
  costo: number;
  odometerKm: number;
  pieno: boolean;
  luogo: string | null;
  fornitore: string | null;
  note: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface NewFuelLog {
  vehicleId: string;
  tripId?: string | null;
  litri: number;
  costo: number;
  odometerKm: number;
  pieno: boolean;
  luogo?: string | null;
  fornitore?: string | null;
  note?: string | null;
}

export interface FuelStats {
  totalLitri: number;
  totalCosto: number;
  mediaKmPerLitro: number | null;
  mediaCostoPerKm: number | null;
  kmTotali: number;
  perVehicle: Array<{
    vehicleId: string;
    targa: string;
    litri: number;
    costo: number;
    kmPercorsi: number;
    kmPerLitro: number | null;
    costoPerKm: number | null;
  }>;
}

export async function createFuelLog(companyId: string, data: NewFuelLog, createdBy: string): Promise<FuelLogRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "FuelLog"
       ("vehicleId", "companyId", "tripId", "litri", "costo", "odometerKm", "pieno", "luogo", "fornitore", "note", "createdBy")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    data.vehicleId,
    companyId,
    data.tripId ?? null,
    data.litri,
    data.costo,
    data.odometerKm,
    data.pieno,
    data.luogo ?? null,
    data.fornitore ?? null,
    data.note ?? null,
    createdBy
  )) as FuelLogRow[];
  return normalizeDate(rows[0]);
}

export async function listFuelLogs(companyId: string, vehicleId?: string): Promise<FuelLogRow[]> {
  const rows = vehicleId
    ? ((await db.$queryRawUnsafe(
        `SELECT * FROM "FuelLog" WHERE "companyId" = $1 AND "vehicleId" = $2 ORDER BY "odometerKm" DESC, "createdAt" DESC`,
        companyId,
        vehicleId
      )) as FuelLogRow[])
    : ((await db.$queryRawUnsafe(
        `SELECT * FROM "FuelLog" WHERE "companyId" = $1 ORDER BY "createdAt" DESC`,
        companyId
      )) as FuelLogRow[]);
  return rows.map(normalizeDate);
}

export async function deleteFuelLog(companyId: string, id: string): Promise<boolean> {
  const n = (await db.$executeRawUnsafe(
    `DELETE FROM "FuelLog" WHERE id = $1 AND "companyId" = $2`,
    id,
    companyId
  )) as number;
  return n > 0;
}

export async function getFuelStats(companyId: string, rows: FuelLogRow[]): Promise<FuelStats> {
  const totalLitri = rows.reduce((s, r) => s + r.litri, 0);
  const totalCosto = rows.reduce((s, r) => s + r.costo, 0);

  const perVehicle = new Map<
    string,
    { vehicleId: string; targa: string; litri: number; costo: number; count: number; minKm: number; maxKm: number }
  >();
  for (const r of rows) {
    const agg = perVehicle.get(r.vehicleId) ?? {
      vehicleId: r.vehicleId,
      targa: "",
      litri: 0,
      costo: 0,
      count: 0,
      minKm: Number.POSITIVE_INFINITY,
      maxKm: Number.NEGATIVE_INFINITY,
    };
    agg.litri += r.litri;
    agg.costo += r.costo;
    agg.count += 1;
    agg.minKm = Math.min(agg.minKm, r.odometerKm);
    agg.maxKm = Math.max(agg.maxKm, r.odometerKm);
    perVehicle.set(r.vehicleId, agg);
  }

  const vehicles = await db.vehicle.findMany({
    where: { companyId },
    select: { id: true, targa: true },
  });
  const targaById = new Map(vehicles.map((v) => [v.id, v.targa]));

  const perVehicleArr = [...perVehicle.values()].map((agg) => {
    const kmPercorsi = agg.count > 1 ? Math.max(0, agg.maxKm - agg.minKm) : 0;
    const kmPerLitro = kmPercorsi > 0 && agg.litri > 0 ? kmPercorsi / agg.litri : null;
    const costoPerKm = kmPercorsi > 0 ? agg.costo / kmPercorsi : null;
    return {
      vehicleId: agg.vehicleId,
      targa: targaById.get(agg.vehicleId) ?? agg.vehicleId,
      litri: round2(agg.litri),
      costo: round2(agg.costo),
      kmPercorsi: Math.round(kmPercorsi),
      kmPerLitro: kmPerLitro != null ? round2(kmPerLitro) : null,
      costoPerKm: costoPerKm != null ? round2(costoPerKm) : null,
    };
  });

  const statSummary = perVehicleArr.filter((v) => v.kmPerLitro != null);
  const mediaKmPerLitro =
    statSummary.length > 0 ? round2(statSummary.reduce((s, v) => s + (v.kmPerLitro ?? 0), 0) / statSummary.length) : null;
  const kmTotali = perVehicleArr.reduce((s, v) => s + v.kmPercorsi, 0);
  const mediaCostoPerKm =
    kmTotali > 0 ? round2(perVehicleArr.reduce((s, v) => s + (v.costoPerKm ?? 0), 0) / perVehicleArr.length) : null;

  return {
    totalLitri: round2(totalLitri),
    totalCosto: round2(totalCosto),
    mediaKmPerLitro,
    mediaCostoPerKm,
    kmTotali,
    perVehicle: perVehicleArr.sort((a, b) => (b.kmPerLitro ?? 0) - (a.kmPerLitro ?? 0)),
  };
}

function normalizeDate(r: FuelLogRow): FuelLogRow {
  return { ...r, createdAt: r.createdAt ? new Date(r.createdAt) : r.createdAt };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
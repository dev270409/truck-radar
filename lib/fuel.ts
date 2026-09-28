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

/**
 * Stima consumi quando non ci sono abbastanza rifornimenti reali.
 * Basata sui km reali percorsi (Geotab/storico) e su un consumo medio di
 * riferimento per categoria di mezzo. È una STIMA dichiarata, non un dato
 * preciso, e non riguarda i km a vuoto (non stimabili in modo affidabile).
 */
export const STIMA_CONSUMO_MEDIO_KM_PER_LITRO: Record<string, number> = {
  FRIGO: 3.2,
  TELONATO: 3.5,
  SPONDA_IDRAULICA: 3.4,
  CISTERNA: 3.0,
  ADR: 3.0,
};
export const STIMA_PREZZO_GASOLIO_EUR_PER_LITRO = 1.75;

export interface FuelEstimate {
  estimated: true;
  kmTotali: number;
  kmSource: "GEOTAB" | "TRIPS" | "NESSUNO";
  litriStimati: number;
  costoStimato: number;
  kmPerLitroMedio: number;
  prezzoRiferimento: number;
  nota: string;
}

export async function estimateFuelForCompany(companyId: string): Promise<FuelEstimate> {
  // Km reali dagli snapshot Geotab, se presenti.
  const geotabKmRows = (await db.$queryRawUnsafe(
    `SELECT COALESCE(SUM(g."distanceKm"), 0)::float8 AS km
     FROM "GeotabTripSnapshot" g
     WHERE g."companyId" = $1 AND g."startAt" >= now() - interval '30 days'`,
    companyId
  )) as Array<{ km: number }>;
  let kmTotali = Number(geotabKmRows[0]?.km ?? 0);
  let kmSource: FuelEstimate["kmSource"] = kmTotali > 0 ? "GEOTAB" : "NESSUNO";

  if (kmTotali <= 0) {
    // Ripiego: km dai viaggi registrati (tabella TripKm).
    const tripKmRows = (await db.$queryRawUnsafe(
      `SELECT COALESCE(SUM("km"), 0)::float8 AS km FROM "TripKm" WHERE "companyId" = $1`,
      companyId
    )) as Array<{ km: number }>;
    kmTotali = Number(tripKmRows[0]?.km ?? 0);
    if (kmTotali > 0) kmSource = "TRIPS";
  }

  const vehicles = await db.vehicle.findMany({
    where: { companyId },
    select: { categoria: true },
  });
  const avgKmPerLitro =
    vehicles.length > 0
      ? vehicles.reduce((sum, v) => sum + (STIMA_CONSUMO_MEDIO_KM_PER_LITRO[v.categoria] ?? 3.3), 0) / vehicles.length
      : 3.3;

  const litriStimati = avgKmPerLitro > 0 ? kmTotali / avgKmPerLitro : 0;
  const costoStimato = litriStimati * STIMA_PREZZO_GASOLIO_EUR_PER_LITRO;

  return {
    estimated: true,
    kmTotali: Math.round(kmTotali),
    kmSource,
    litriStimati: round2(litriStimati),
    costoStimato: round2(costoStimato),
    kmPerLitroMedio: round2(avgKmPerLitro),
    prezzoRiferimento: STIMA_PREZZO_GASOLIO_EUR_PER_LITRO,
    nota:
      kmSource === "NESSUNO"
        ? "Nessun km disponibile: collega Geotab o registra viaggi per una stima basata su dati reali."
        : `Stima su ${Math.round(kmTotali).toLocaleString("it-IT")} km reali (${kmSource === "GEOTAB" ? "Geotab" : "viaggi"}) e consumo medio ${round2(avgKmPerLitro)} km/l. Non include i km a vuoto.`,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
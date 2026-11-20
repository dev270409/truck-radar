import { db } from "./db";
import { normalizePlate } from "./geotab";

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

export interface FuelEstimateDetail {
  vehicleId: string;
  targa: string;
  km: number;
  kmPerLitro: number;
  fonte: "REALE" | "STIMA";
  litri: number;
  costo: number;
  prezzo: number;
  segmentiReali: number;
}

export interface FuelEstimate {
  estimated: true;
  kmTotali: number;
  kmSource: "GEOTAB" | "TRIPS" | "NESSUNO";
  litriStimati: number;
  costoStimato: number;
  kmPerLitroMedio: number;
  prezzoRiferimento: number;
  metodo: "REALE" | "MISTO" | "STIMA" | "NESSUNO";
  kmConConsumoReale: number;
  kmConStima: number;
  prezzoSource: "RIFORNIMENTI" | "RIFERIMENTO";
  dettaglio: FuelEstimateDetail[];
  nota: string;
}

/** Consumo pieno-pieno: litri tra due pieni / km tra i due odometri. */
function realConsumption(rows: FuelLogRow[]): { kmPerLitro: number; segments: number } | null {
  const sorted = [...rows].sort((a, b) => a.odometerKm - b.odometerKm);
  const fulls = sorted.filter((row) => row.pieno);
  const values: number[] = [];
  for (let i = 1; i < fulls.length; i++) {
    const previous = fulls[i - 1];
    const current = fulls[i];
    const liters = sorted
      .filter(
        (row) =>
          row.odometerKm > previous.odometerKm && row.odometerKm <= current.odometerKm
      )
      .reduce((sum, row) => sum + row.litri, 0);
    const km = current.odometerKm - previous.odometerKm;
    if (km > 0 && liters > 0) values.push(km / liters);
  }
  if (values.length === 0) return null;
  return {
    kmPerLitro: values.reduce((sum, value) => sum + value, 0) / values.length,
    segments: values.length,
  };
}

function fuelPrice(rows: FuelLogRow[]): number | null {
  const liters = rows.reduce((sum, row) => sum + row.litri, 0);
  const cost = rows.reduce((sum, row) => sum + row.costo, 0);
  return liters > 0 && cost > 0 ? cost / liters : null;
}

export async function estimateFuelForCompany(companyId: string): Promise<FuelEstimate> {
  const vehicles = await db.vehicle.findMany({
    where: { companyId },
    select: { id: true, targa: true, categoria: true },
  });

  // Km reali per targa dagli snapshot Geotab degli ultimi 30 giorni.
  const geotabRows = (await db.$queryRawUnsafe(
    `SELECT "licensePlate", COALESCE(SUM("distanceKm"), 0)::float8 AS km
     FROM "GeotabTripSnapshot"
     WHERE "companyId" = $1 AND "startAt" >= now() - interval '30 days'
     GROUP BY "licensePlate"`,
    companyId
  )) as Array<{ licensePlate: string | null; km: number }>;

  const kmByVehicle = new Map<string, number>();
  let unmatchedKm = 0;
  let kmTotali = 0;
  let kmSource: FuelEstimate["kmSource"] = "NESSUNO";
  const plateMap = new Map(vehicles.map((vehicle) => [normalizePlate(vehicle.targa), vehicle]));

  if (geotabRows.length > 0) {
    kmSource = "GEOTAB";
    for (const row of geotabRows) {
      const km = Number(row.km ?? 0);
      kmTotali += km;
      const vehicle = row.licensePlate ? plateMap.get(normalizePlate(row.licensePlate)) : undefined;
      if (vehicle) {
        kmByVehicle.set(vehicle.id, (kmByVehicle.get(vehicle.id) ?? 0) + km);
      } else {
        unmatchedKm += km;
      }
    }
  } else {
    // Ripiego: km dei viaggi registrati, raggruppati per mezzo.
    const tripKmRows = (await db.$queryRawUnsafe(
      `SELECT t."vehicleId", COALESCE(SUM(k."km"), 0)::float8 AS km
       FROM "TripKm" k
       JOIN "Trip" t ON t.id = k."tripId"
       WHERE k."companyId" = $1 AND t."vehicleId" IS NOT NULL
       GROUP BY t."vehicleId"`,
      companyId
    )) as Array<{ vehicleId: string; km: number }>;
    for (const row of tripKmRows) {
      const km = Number(row.km ?? 0);
      kmByVehicle.set(row.vehicleId, km);
      kmTotali += km;
    }
    if (kmTotali > 0) kmSource = "TRIPS";
  }

  // Rifornimenti reali degli ultimi 12 mesi, per consumo pieno-pieno e prezzo.
  const fuelRows = (await db.$queryRawUnsafe(
    `SELECT * FROM "FuelLog"
     WHERE "companyId" = $1 AND "createdAt" >= now() - interval '365 days'
     ORDER BY "vehicleId" ASC, "odometerKm" ASC`,
    companyId
  )) as FuelLogRow[];

  const fuelByVehicle = new Map<string, FuelLogRow[]>();
  for (const row of fuelRows) {
    const list = fuelByVehicle.get(row.vehicleId) ?? [];
    list.push(row);
    fuelByVehicle.set(row.vehicleId, list);
  }
  const globalPrice = fuelPrice(fuelRows);
  const price = globalPrice ?? STIMA_PREZZO_GASOLIO_EUR_PER_LITRO;

  const detail: FuelEstimateDetail[] = [];
  let kmConConsumoReale = 0;
  let kmConStima = 0;
  let litriStimati = 0;
  let costoStimato = 0;
  let weightedKm = 0;

  for (const vehicle of vehicles) {
    const km = kmByVehicle.get(vehicle.id) ?? 0;
    const rows = fuelByVehicle.get(vehicle.id) ?? [];
    const real = realConsumption(rows);
    const vehiclePrice = fuelPrice(rows) ?? price;
    const kmPerLitro = real?.kmPerLitro ?? STIMA_CONSUMO_MEDIO_KM_PER_LITRO[vehicle.categoria] ?? 3.3;
    const liters = kmPerLitro > 0 ? km / kmPerLitro : 0;
    const cost = liters * vehiclePrice;

    if (km > 0) {
      if (real) kmConConsumoReale += km;
      else kmConStima += km;
      litriStimati += liters;
      costoStimato += cost;
      weightedKm += km;
      detail.push({
        vehicleId: vehicle.id,
        targa: vehicle.targa,
        km: Math.round(km),
        kmPerLitro: round2(kmPerLitro),
        fonte: real ? "REALE" : "STIMA",
        litri: round2(liters),
        costo: round2(cost),
        prezzo: round2(vehiclePrice),
        segmentiReali: real?.segments ?? 0,
      });
    }
  }

  // Km Geotab non associati a un mezzo in anagrafica: stima con i valori medi.
  if (unmatchedKm > 0) {
    const fallbackKmPerLitro = 3.3;
    const liters = unmatchedKm / fallbackKmPerLitro;
    litriStimati += liters;
    costoStimato += liters * price;
    kmConStima += unmatchedKm;
    weightedKm += unmatchedKm;
  }

  const avgKmPerLitro = litriStimati > 0 ? weightedKm / litriStimati : 0;
  const metodo: FuelEstimate["metodo"] =
    kmTotali <= 0
      ? "NESSUNO"
      : kmConConsumoReale > 0 && kmConStima > 0
        ? "MISTO"
        : kmConConsumoReale > 0
          ? "REALE"
          : "STIMA";
  const prezzoSource: FuelEstimate["prezzoSource"] = globalPrice ? "RIFORNIMENTI" : "RIFERIMENTO";
  const copertura = kmTotali > 0 ? Math.round((kmConConsumoReale / kmTotali) * 100) : 0;

  return {
    estimated: true,
    kmTotali: Math.round(kmTotali),
    kmSource,
    litriStimati: round2(litriStimati),
    costoStimato: round2(costoStimato),
    kmPerLitroMedio: round2(avgKmPerLitro || 0),
    prezzoRiferimento: round2(price),
    metodo,
    kmConConsumoReale: Math.round(kmConConsumoReale),
    kmConStima: Math.round(kmConStima),
    prezzoSource,
    dettaglio: detail.sort((a, b) => b.km - a.km),
    nota:
      metodo === "NESSUNO"
        ? "Nessun km disponibile: collega Geotab o registra viaggi per una stima basata su dati reali."
        : `Stima su ${Math.round(kmTotali).toLocaleString("it-IT")} km reali (${
            kmSource === "GEOTAB" ? "Geotab" : "viaggi"
          }) · ${copertura}% coperto da consumi pieno-pieno · prezzo ${
            prezzoSource === "RIFORNIMENTI"
              ? `medio ${round2(price).toFixed(2)} €/l dai rifornimenti`
              : `${STIMA_PREZZO_GASOLIO_EUR_PER_LITRO.toFixed(2)} €/l di riferimento`
          }. Non include i km a vuoto.`,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
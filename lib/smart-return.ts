import { db } from "./db";
import { findReturnMatches, type LoadWithCompany } from "./marketplace";

/**
 * Smart Return V1 deterministico (§32/§33/§34/§35/§55):
 * 1. Trovare carichi CERCO in direzione inversa sul network (o propri).
 * 2. Metriche: KM A VUOTO PRIMA (il viaggio di ritorno vuoto) vs DOPO (carico di ritorno coperto)
 *    e RICAVO AGGIUNTIVO (prezzo del carico di ritorno).
 * La stima km usa coordinate statiche delle principali città con fattore stradale 1.25 (Haversine).
 */

const CITY_COORDS: Record<string, [number, number]> = {
  milano: [45.4642, 9.19],
  roma: [41.8919, 12.5113],
  torino: [45.0703, 7.6869],
  napoli: [40.8518, 14.2681],
  firenze: [43.7696, 11.2558],
  bologna: [44.4949, 11.3426],
  genova: [44.4056, 8.9463],
  verona: [45.4384, 10.9916],
  venezia: [45.4408, 12.3155],
  bari: [41.1171, 16.8719],
  palermo: [38.1157, 13.3615],
  catania: [37.5079, 15.083],
  trieste: [45.6495, 13.7768],
  pescara: [42.4618, 14.2141],
  perugia: [43.1122, 12.3888],
  cagliari: [39.2238, 9.1217],
  "reggio calabria": [38.1105, 15.661],
  bergamo: [45.6983, 9.6773],
  brescia: [45.5416, 10.2118],
  parma: [44.8015, 10.3279],
};

export function cityKm(a: string, b: string): number {
  const ca = CITY_COORDS[a.trim().toLowerCase()];
  const cb = CITY_COORDS[b.trim().toLowerCase()];
  if (!ca || !cb) return 0;
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLon = toRad(cb[1] - ca[1]);
  const dLat = toRad(cb[0] - ca[0]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(ca[0])) * Math.cos(toRad(cb[0])) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return Math.round((R * c * 1.25) / 10) * 10;
}

export interface SmartReturnRow {
  id: string;
  tripId: string;
  companyId: string;
  matchLoadId: string | null;
  kmOneWay: number;
  kmVuotiPrima: number;
  kmVuotiDopo: number;
  ricavoAggiuntivo: number;
  candidato: boolean;
  createdAt: Date;
}

export async function listSmartReturns(companyId: string, tripId?: string): Promise<SmartReturnRow[]> {
  if (tripId) {
    return db.$queryRawUnsafe(
      `SELECT * FROM "SmartReturn" WHERE "companyId" = $1 AND "tripId" = $2 ORDER BY "createdAt" DESC`,
      companyId,
      tripId
    ) as Promise<SmartReturnRow[]>;
  }
  return db.$queryRawUnsafe(
    `SELECT * FROM "SmartReturn" WHERE "companyId" = $1 ORDER BY "createdAt" DESC`,
    companyId
  ) as Promise<SmartReturnRow[]>;
}

export async function saveSmartReturn(data: {
  companyId: string;
  tripId: string;
  matchLoadId: string | null;
  kmOneWay: number;
  kmVuotiPrima: number;
  kmVuotiDopo: number;
  ricavoAggiuntivo: number;
  candidato: boolean;
}): Promise<SmartReturnRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "SmartReturn"
     ("tripId", "companyId", "matchLoadId", "kmOneWay", "kmVuotiPrima", "kmVuotiDopo", "ricavoAggiuntivo", "candidato")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    data.tripId,
    data.companyId,
    data.matchLoadId,
    data.kmOneWay,
    data.kmVuotiPrima,
    data.kmVuotiDopo,
    data.ricavoAggiuntivo,
    data.candidato
  )) as SmartReturnRow[];
  return rows[0];
}

export interface SmartReturnAnalysis {
  tripId: string;
  luogoRitiro: string;
  luogoConsegna: string;
  dataRitiro: string;
  category: string | null;
  kmOneWay: number;
  kmVuotiPrima: number;
  kmVuotiDopo: number;
  ricavoPrima: number;
  ricavoAggiuntivo: number;
  matches: LoadWithCompany[];
  applicati: SmartReturnRow[];
}

/** Analisi smart return per un viaggio: km a vuoto prima/dopo e carichi di ritorno. */
export async function analyzeSmartReturn(opts: {
  tripId: string;
  companyId: string;
}): Promise<SmartReturnAnalysis> {
  const trip = await db.trip.findFirst({
    where: { id: opts.tripId, companyId: opts.companyId },
    include: { vehicle: true },
  });
  if (!trip) throw new Error("TripNotFound");

  const kmOneWay = cityKm(trip.luogoRitiro, trip.luogoConsegna);

  // Carichi di ritorno (match inverso) tra network + propri
  const matches = await findReturnMatches(opts.companyId, {
    luogoRitiro: trip.luogoRitiro,
    luogoConsegna: trip.luogoConsegna,
    dataRitiro: trip.dataRitiro,
    vehicleCategory: trip.vehicle?.categoria ?? null,
    pesoKg: trip.pesoKg,
  });

  const best = matches[0] ?? null;
  const ricavoAggiuntivo = best?.prezzo ?? 0;
  const kmVuotiDopo = best ? 0 : kmOneWay;

  const applicati = await listSmartReturns(opts.companyId, opts.tripId);

  return {
    tripId: trip.id,
    luogoRitiro: trip.luogoRitiro,
    luogoConsegna: trip.luogoConsegna,
    dataRitiro: trip.dataRitiro.toISOString(),
    category: trip.vehicle?.categoria ?? null,
    kmOneWay,
    kmVuotiPrima: kmOneWay,
    kmVuotiDopo,
    ricavoPrima: 0,
    ricavoAggiuntivo,
    matches,
    applicati,
  };
}

/** Stima km a vuoto "PRIMA": somma km dei viaggi (ritorno stimato vuoto) senza smart return. */
export async function totalEmptyKmBaseline(companyId: string): Promise<number> {
  const trips = await db.trip.findMany({
    where: { companyId, status: { in: ["COMPLETATO", "IN_CORSO", "ASSEGNATO"] } },
    select: { luogoRitiro: true, luogoConsegna: true },
  });
  return trips.reduce((acc, t) => acc + cityKm(t.luogoRitiro, t.luogoConsegna), 0);
}

/** Km a vuoto "DOPO": baseline meno i km coperti dagli smart return applicati. */
export async function totalEmptyKmAfter(companyId: string): Promise<number> {
  const baseline = await totalEmptyKmBaseline(companyId);
  const rows = (await db.$queryRawUnsafe(
    `SELECT COALESCE(SUM("kmVuotiPrima" - "kmVuotiDopo"), 0)::float8 AS km
     FROM "SmartReturn" WHERE "companyId" = $1 AND "candidato" = false`,
    companyId
  )) as Array<{ km: number }>;
  return Math.max(0, Math.round(baseline - Number(rows[0]?.km ?? 0) * 100) / 100);
}
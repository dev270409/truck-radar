import { db } from "./db";
import { cityKm } from "./smart-return";

/** ESG §48/§49 — km totali, km a vuoto, km evitati (Smart Return), stima CO₂ */

export const CO2_KM_CARICO = 0.9;   // kg CO₂ per km (viaggio carico)
export const CO2_KM_VUOTO = 0.75;   // kg CO₂ per km (trasferimento a vuoto)

export interface EsgPeriod {
  label: string;
  trips: number;
  kmTotale: number;
  kmVuoto: number;
  kmEvitati: number;
  co2Carico: number; // t CO₂
  co2Vuoto: number;  // t CO₂
  co2Evitato: number; // t CO₂
}

export interface EsgIndicators {
  kmMediPerViaggio: number;
  pctKmVuoti: number;
  caricoMedioTon: number;
  co2RisparmiatoTon: number;
}

export interface EsgReport {
  periods: EsgPeriod[];
  totals: EsgPeriod;
  indicators: EsgIndicators;
}

interface TripRow {
  id: string;
  status: string;
  dataConsegna: Date;
  pesoKg: number | null;
  luogoRitiro: string;
  luogoConsegna: string;
  km: number | null;
}

export async function getEsgReport(
  companyId: string,
  from: Date,
  to: Date,
  granularity: "mese" | "anno" = "mese"
): Promise<EsgReport> {
  const trips = (await db.$queryRawUnsafe(
    `SELECT t.id, t.status, t."dataConsegna", t."pesoKg", t."luogoRitiro", t."luogoConsegna", k.km
     FROM "Trip" t
     LEFT JOIN "TripKm" k ON k."tripId" = t.id
     WHERE t."companyId" = $1 AND t."dataConsegna" IS NOT NULL
       AND t."dataConsegna" >= $2 AND t."dataConsegna" <= $3`,
    companyId,
    from,
    to
  )) as TripRow[];

  const smart = (await db.$queryRawUnsafe(
    `SELECT "kmVuotiPrima", "kmVuotiDopo", "candidato" FROM "SmartReturn" WHERE "companyId" = $1`,
    companyId
  )) as Array<{ kmVuotiPrima: number; kmVuotiDopo: number; candidato: boolean }>;

  const kmEvitatiPerTrip = new Map<string, number>();
  const kmVuotoPerTrip = new Map<string, number>();
  // kmVuoti "prima" di smart-return: quando retto, mappiamo il trip del candidato
  // utilizziamo i km evitati complessivi (candidato=false => applicato)
  const applied = smart.filter((s) => !s.candidato);
  const totalKmEvitati = applied.reduce((sum, s) => sum + Math.max(0, (s.kmVuotiPrima ?? 0) - (s.kmVuotiDopo ?? 0)), 0);
  const totalKmVuotoStimati = smart.reduce((sum, s) => sum + (s.kmVuotiPrima ?? 0), 0);

  const fmt = granularity === "anno" ? (d: Date) => String(d.getUTCFullYear()) : (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  const buckets = new Map<string, EsgPeriod>();
  const addKm = (label: string, km: number, kmEv: number, co2v: number, tripsAdd: number) => {
    const b = buckets.get(label) ?? {
      label,
      trips: 0,
      kmTotale: 0,
      kmVuoto: 0,
      kmEvitati: 0,
      co2Carico: 0,
      co2Vuoto: 0,
      co2Evitato: 0,
    };
    b.trips += tripsAdd;
    b.kmTotale += km;
    b.kmVuoto += kmEv;
    b.kmEvitati += kmEv;
    b.co2Carico += (km * CO2_KM_CARICO) / 1000;
    b.co2Vuoto += (kmEv * CO2_KM_VUOTO) / 1000;
    b.co2Evitato += (kmEv * CO2_KM_VUOTO) / 1000;
    buckets.set(label, b);
  };

  // Assegnazione km vuoti: stimiamo per il viaggio (trasferimento NON coperto dal traffico utile)
  // — nel report aggregato per periodo, imputiamo i kmEvitati totali al periodo del viaggio con km maggiori.
  for (const t of trips) {
    if (t.status === "ANNULLATO") continue;
    const label = fmt(new Date(t.dataConsegna));
    const km = t.km ?? cityKm(t.luogoRitiro ?? "", t.luogoConsegna ?? "");
    addKm(label, km, 0, 0, 1);
  }

  // distribuzione km evitati sul totale: attributi al periodo con più km (approssimazione)
  if (buckets.size > 0 && totalKmEvitati > 0) {
    let maxLabel: string | null = null;
    let maxKm = -1;
    for (const [l, b] of buckets) {
      if (b.kmTotale > maxKm) {
        maxKm = b.kmTotale;
        maxLabel = l;
      }
    }
    if (maxLabel) {
      const b = buckets.get(maxLabel)!;
      b.kmVuoto += totalKmEvitati;
      b.kmEvitati += totalKmEvitati;
      b.co2Vuoto += (totalKmEvitati * CO2_KM_VUOTO) / 1000;
      b.co2Evitato += (totalKmEvitati * CO2_KM_VUOTO) / 1000;
    }
  }

  const periods = [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label));
  const totals: EsgPeriod = {
    label: "Totale",
    trips: periods.reduce((s, p) => s + p.trips, 0),
    kmTotale: periods.reduce((s, p) => s + p.kmTotale, 0),
    kmVuoto: periods.reduce((s, p) => s + p.kmVuoto, 0),
    kmEvitati: periods.reduce((s, p) => s + p.kmEvitati, 0),
    co2Carico: periods.reduce((s, p) => s + p.co2Carico, 0),
    co2Vuoto: periods.reduce((s, p) => s + p.co2Vuoto, 0),
    co2Evitato: periods.reduce((s, p) => s + p.co2Evitato, 0),
  };

  const pesi = trips.filter((t) => t.status !== "ANNULLATO" && t.pesoKg != null && t.pesoKg > 0);
  const caricoMedioTon = pesi.length > 0 ? pesi.reduce((s, t) => s + (t.pesoKg ?? 0), 0) / pesi.length / 1000 : 0;

  const indicators: EsgIndicators = {
    kmMediPerViaggio: totals.trips > 0 ? Math.round(totals.kmTotale / totals.trips) : 0,
    pctKmVuoti: totals.kmTotale + totals.kmVuoto > 0 ? (totals.kmVuoto / (totals.kmTotale + totals.kmVuoto)) * 100 : 0,
    caricoMedioTon: Math.round(caricoMedioTon * 10) / 10,
    co2RisparmiatoTon: Math.round(totalKmEvitati * CO2_KM_VUOTO) / 1000,
  };
  void kmEvitatiPerTrip;
  void kmVuotoPerTrip;
  void totalKmVuotoStimati;

  return { periods, totals, indicators };
}
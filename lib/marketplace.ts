import { db } from "./db";

/**
 * Borsa carichi interna (MarketplaceLoad): entità §61 non presente in schema.prisma.
 * NB: nessuna credential / dato cross-tenant sensibile viene esposto: i carichi del
 * network vengono esposti solo per le aziende VERIFICATE.
 */

export interface MarketplaceLoadRow {
  id: string;
  companyId: string;
  kind: "OFFRO" | "CERCO";
  luogoRitiro: string;
  luogoConsegna: string;
  dataRitiro: Date;
  dataConsegna: Date;
  tipoMerce: string | null;
  pesoKg: number | null;
  volumeM3: number | null;
  vehicleCategory: string | null;
  prezzo: number | null;
  note: string | null;
  status: "ATTIVO" | "COMPLETATO" | "ANNULLATO";
  createdAt: Date;
}

export function normalizeCity(s: string): string {
  return String(s).trim().toLowerCase();
}

export function cityCompat(a: string, b: string): boolean {
  const x = normalizeCity(a);
  const y = normalizeCity(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

export function dateWithinDays(a: Date | string, b: Date | string, days = 7): boolean {
  const diff = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return diff <= days * 86_400_000;
}

export async function listMarketplaceLoads(filter: {
  status?: string | null;
  kind?: string | null;
}): Promise<MarketplaceLoadRow[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.status) {
    params.push(filter.status);
    clauses.push(`"status" = $${params.length}`);
  }
  if (filter.kind) {
    params.push(filter.kind);
    clauses.push(`"kind" = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db.$queryRawUnsafe(
    `SELECT * FROM "MarketplaceLoad" ${where} ORDER BY "createdAt" DESC`,
    ...params
  ) as Promise<MarketplaceLoadRow[]>;
}

export async function getMarketplaceLoad(id: string): Promise<MarketplaceLoadRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT * FROM "MarketplaceLoad" WHERE "id" = $1`,
    id
  )) as MarketplaceLoadRow[];
  return rows[0] ?? null;
}

export async function createMarketplaceLoad(data: {
  companyId: string;
  kind: string;
  luogoRitiro: string;
  luogoConsegna: string;
  dataRitiro: Date;
  dataConsegna: Date;
  tipoMerce?: string | null;
  pesoKg?: number | null;
  volumeM3?: number | null;
  vehicleCategory?: string | null;
  prezzo?: number | null;
  note?: string | null;
}): Promise<MarketplaceLoadRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "MarketplaceLoad"
     ("companyId", "kind", "luogoRitiro", "luogoConsegna", "dataRitiro", "dataConsegna",
      "tipoMerce", "pesoKg", "volumeM3", "vehicleCategory", "prezzo", "note", "status")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ATTIVO')
     RETURNING *`,
    data.companyId,
    data.kind,
    data.luogoRitiro,
    data.luogoConsegna,
    data.dataRitiro,
    data.dataConsegna,
    data.tipoMerce ?? null,
    data.pesoKg ?? null,
    data.volumeM3 ?? null,
    data.vehicleCategory ?? null,
    data.prezzo ?? null,
    data.note ?? null
  )) as MarketplaceLoadRow[];
  return rows[0];
}

export async function updateMarketplaceLoad(
  companyId: string,
  id: string,
  data: { status?: string }
): Promise<MarketplaceLoadRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `UPDATE "MarketplaceLoad" SET "status" = $1
     WHERE "id" = $2 AND "companyId" = $3
     RETURNING *`,
    data.status,
    id,
    companyId
  )) as MarketplaceLoadRow[];
  return rows[0] ?? null;
}

export async function deleteMarketplaceLoad(companyId: string, id: string): Promise<boolean> {
  const res = await db.$executeRawUnsafe(
    `DELETE FROM "MarketplaceLoad" WHERE "id" = $1 AND "companyId" = $2`,
    id,
    companyId
  );
  return res > 0;
}

/**
 * Aziende VERIFICATE del network (§21): abbonamento attivo + KYC completato
 * + almeno una connessione API sincronizzata.
 */
export async function getVerifiedCompanyIds(): Promise<Set<string>> {
  const rows = (await db.$queryRawUnsafe(`
    SELECT c.id
    FROM "Company" c
    WHERE c."subscriptionStatus" = 'ACTIVE'::"SubscriptionStatus"
      AND NOT EXISTS (
        SELECT 1 FROM "KycDocument" k
        WHERE k."companyId" = c.id AND k.status IN ('IN_ATTESA'::"KycStatus", 'RIFIUTATO'::"KycStatus")
      )
      AND EXISTS (
        SELECT 1 FROM "ApiConnection" a WHERE a."companyId" = c.id AND a."status" = 'SYNCED'
      )
  `)) as Array<{ id: string }>;
  return new Set(rows.map((r) => r.id));
}

export async function verifyCompany(companyId: string): Promise<{ verified: boolean; missing: string[] }> {
  const verifiedIds = await getVerifiedCompanyIds();
  if (verifiedIds.has(companyId)) return { verified: true, missing: [] };
  const missing: string[] = [];

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { subscriptionStatus: true },
  });
  if (company?.subscriptionStatus !== "ACTIVE") missing.push("abbonamento attivo");

  const kyc = await db.kycDocument.findMany({
    where: { companyId },
    select: { status: true },
  });
  const pending = kyc.filter((k) => k.status === "IN_ATTESA" || k.status === "RIFIUTATO").length;
  if (kyc.length === 0 || pending > 0) missing.push("verifica KYC completata");

  const api = await db.$queryRawUnsafe(
    `SELECT "id" FROM "ApiConnection" WHERE "companyId" = $1 AND "status" = 'SYNCED' LIMIT 1`,
    companyId
  );
  if ((api as Array<{ id: string }>).length === 0) missing.push("connessione API sincronizzata");

  return { verified: missing.length === 0, missing };
}

/** Matching deterministico V1 (§33): cerca carichi CERCO in direzione inversa. */
export interface MatchInput {
  luogoRitiro: string;
  luogoConsegna: string;
  dataRitiro: Date | string;
  vehicleCategory?: string | null;
  pesoKg?: number | null;
}

export interface LoadWithCompany extends MarketplaceLoadRow {
  companyName: string;
  companyVerified: boolean;
  score: number;
}

export async function findReturnMatches(
  currentCompanyId: string,
  input: MatchInput
): Promise<LoadWithCompany[]> {
  const loads = await listMarketplaceLoads({ status: "ATTIVO", kind: "CERCO" });
  const verified = await getVerifiedCompanyIds();

  const names = await db.company.findMany({
    where: { id: { in: loads.map((l) => l.companyId) } },
    select: { id: true, ragioneSociale: true },
  });
  const nameMap = new Map(names.map((n) => [n.id, n.ragioneSociale]));

  const results: LoadWithCompany[] = [];
  for (const load of loads) {
    const reverseStart = cityCompat(load.luogoRitiro, input.luogoConsegna);
    const reverseEnd = cityCompat(load.luogoConsegna, input.luogoRitiro);
    if (!reverseStart || !reverseEnd) continue;

    let score = 0;
    if (reverseStart) score += 1;
    if (reverseEnd) score += 1;
    if (dateWithinDays(load.dataRitiro, input.dataRitiro, 7)) score += 1;
    if (load.vehicleCategory && input.vehicleCategory && load.vehicleCategory === input.vehicleCategory) {
      score += 1;
    }
    if (load.pesoKg && input.pesoKg && load.pesoKg <= input.pesoKg) score += 1;

    const isOwn = load.companyId === currentCompanyId;
    results.push({
      ...load,
      companyName: nameMap.get(load.companyId) ?? "Azienda",
      companyVerified: verified.has(load.companyId),
      score: isOwn ? score - 0.5 : score, // favorire rete esterna per smart return
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * SMART RETURN IBRIDO — Priorità 2 (§34): se la rete interna non ha match, interrogare
 * le piattaforme esterne alle quali il cliente è già abbonato (ApiConnection BORSA-CARICHI).
 * I carichi esterni (ExternalLoad) vengono consolidati localmente e fatti girare con lo
 * stesso matching deterministico inverso.
 */
export interface ExternalLoadRow {
  id: string;
  provider: string;
  luogoRitiro: string;
  luogoConsegna: string;
  dataRitiro: Date;
  dataConsegna: Date;
  tipoMerce: string | null;
  pesoKg: number | null;
  volumeM3: number | null;
  vehicleCategory: string | null;
  prezzo: number | null;
  note: string | null;
  status: string;
  createdAt: Date;
}

export interface ExternalMatch extends ExternalLoadRow {
  companyName: string;
  companyVerified: boolean;
  score: number;
  source: "ESTERNO";
  providerName: string;
}

export async function getConnectedBorsaProviders(companyId: string): Promise<Set<string>> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT i."provider" AS "providerKey"
     FROM "ApiConnection" a
     JOIN "ExternalIntegration" i ON i.id = a."integrationId"
     WHERE a."companyId" = $1 AND a."status" = 'SYNCED' AND i."type" = 'BORSA'`,
    companyId
  )) as Array<{ providerKey: string }>;
  return new Set(rows.map((r) => r.providerKey));
}

/**
 * SMART RETURN IBRIDO — Priorità 2 (§34): le piattaforme esterne interrogabili sono quelle
 * del catalogo BORSA collegate (SYNCED). Gli ExternalLoad sono consolidati per provider
 * di piattaforma (TimoCom/Teleroute/…): se il cliente ha UNA connessione Borsa attiva
 * tratta tutti i carichi consolidati come interrogabili (autorizzazione BORSA presente).
 */
export async function hasBorsaConnections(companyId: string): Promise<boolean> {
  const providers = await getConnectedBorsaProviders(companyId);
  return providers.size > 0;
}

/** Matching inverso sui carichi esterni: il carico CERCO va nella direzione opposta al viaggio. */
export async function findExternalReturnMatches(
  currentCompanyId: string,
  input: MatchInput
): Promise<ExternalMatch[]> {
  // Priorità 2: solo se il cliente è abbonato/collegato a una borsa carichi esterna.
  if (!(await hasBorsaConnections(currentCompanyId))) return [];

  const loads = (await db.$queryRawUnsafe(
    `SELECT * FROM "ExternalLoad" WHERE "status" = 'ATTIVO'`,
  )) as ExternalLoadRow[];
  if (loads.length === 0) return [];

  const results: ExternalMatch[] = [];
  for (const load of loads) {
    const reverseStart = cityCompat(load.luogoRitiro, input.luogoConsegna);
    const reverseEnd = cityCompat(load.luogoConsegna, input.luogoRitiro);
    if (!reverseStart || !reverseEnd) continue;

    let score = 0;
    if (reverseStart) score += 1;
    if (reverseEnd) score += 1;
    if (dateWithinDays(load.dataRitiro, input.dataRitiro, 7)) score += 1;
    if (load.vehicleCategory && input.vehicleCategory && load.vehicleCategory === input.vehicleCategory) {
      score += 1;
    }
    if (load.pesoKg && input.pesoKg && load.pesoKg <= input.pesoKg) score += 1;

    results.push({
      ...load,
      companyName: load.provider,
      companyVerified: true,
      score,
      source: "ESTERNO",
      providerName: load.provider,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
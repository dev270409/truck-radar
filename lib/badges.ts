import { db } from "./db";
import { getVerifiedCompanyIds } from "./marketplace";
import { cityKm } from "./smart-return";
import { reputationOf } from "./reviews";

/**
 * Badge automatici (§46): criteri misurabili; nessuna assegnazione manuale.
 * computeBadges è idempotente e assegna i badge "earned" man mano che i criteri diventano veri.
 */

export interface BadgeDef {
  code: string;
  label: string;
  description: string;
  level: "base" | "pro" | "top";
}

export const BADGE_DEFS: BadgeDef[] = [
  { code: "ACCOUNT_VERIFICATO", label: "Account Verificato", description: "Secondo livello (§21): abbonamento attivo, KYC, API collegate.", level: "base" },
  { code: "PRIMO_VIAGGIO", label: "Primo Viaggio", description: "Hai completato almeno un viaggio.", level: "base" },
  { code: "FRECCIA", label: "Freccia", description: "10+ viaggi completati.", level: "pro" },
  { code: "PUNTUALITA_ELEVATA", label: "Puntualità Elevata", description: "Almeno l'80% dei viaggi chiuse in consegna.", level: "pro" },
  { code: "DOCUMENTAZIONE_OK", label: "Documentazione OK", description: "KYC e documenti mezzi in regola.", level: "base" },
  { code: "REPUTAZIONE_TOP", label: "Reputazione Top", description: "Media recensioni pubblicate ≥ 4.5.", level: "top" },
  { code: "SMART_RETURN", label: "Smart Return", description: "Hai riempito un ritorno (km a vuoto evitati).", level: "pro" },
  { code: "SUBAPPALTO_OK", label: "Network Attivo", description: "Subappalto confermato sul network.", level: "pro" },
];

export interface EarndBadge {
  code: string;
  label: string;
  description: string;
  level: BadgeDef["level"];
  earnedAt: Date | null;
}

export async function computeBadges(companyId: string): Promise<EarndBadge[]> {
  const verified = await getVerifiedCompanyIds();
  const isVerified = verified.has(companyId);

  const [completedCount, tripCount, kycAll, subConfirmed, smartApplied, avgRep] = await Promise.all([
    db.trip.count({ where: { companyId, status: "COMPLETATO" } }),
    db.trip.count({ where: { companyId } }),
    db.kycDocument.findMany({ where: { companyId }, select: { status: true } }),
    db.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS n FROM "Subcontract" WHERE "parentCompanyId" = $1 AND "status" = 'CONFERMATO'`,
      companyId
    ) as Promise<Array<{ n: number }>>,
    db.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS n FROM "SmartReturn" WHERE "companyId" = $1 AND "candidato" = false`,
      companyId
    ) as Promise<Array<{ n: number }>>,
    reputationOf(companyId),
  ]);

  const allTrips = await db.trip.findMany({
    where: { companyId },
    select: { status: true },
  });
  const nonAnnullati = allTrips.filter((t) => t.status !== "ANNULLATO").length;
  const puntualita = nonAnnullati > 0 ? completedCount / nonAnnullati : 0;

  const kycPending = kycAll.filter((k) => k.status === "IN_ATTESA" || k.status === "RIFIUTATO").length;
  const kycOk = kycAll.length > 0 && kycPending === 0;
  const vehicleDocsOk = await docsVehicleOk(companyId);

  const earners = new Map<string, boolean>();
  earners.set("ACCOUNT_VERIFICATO", isVerified);
  earners.set("PRIMO_VIAGGIO", completedCount >= 1);
  earners.set("FRECCIA", completedCount >= 10);
  earners.set("PUNTUALITA_ELEVATA", tripCount > 0 && puntualita >= 0.8);
  earners.set("DOCUMENTAZIONE_OK", kycOk && vehicleDocsOk);
  earners.set("REPUTAZIONE_TOP", avgRep.count >= 1 && avgRep.avg >= 4.5);
  earners.set("SMART_RETURN", Number((await smartApplied)[0]?.n ?? 0) >= 1);
  earners.set("SUBAPPALTO_OK", Number((await subConfirmed)[0]?.n ?? 0) >= 1);

  for (const [code, earned] of earners) {
    if (!earned) continue;
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO "Badge" ("id", "companyId", "code", "earnedAt")
         VALUES (gen_random_uuid(), $1, $2, now())
         ON CONFLICT ("companyId", "code") DO NOTHING`,
        companyId,
        code
      );
    } catch {
      /* badge già assegnato */
    }
  }

  const rows = (await db.$queryRawUnsafe(
    `SELECT "code", "earnedAt" FROM "Badge" WHERE "companyId" = $1`,
    companyId
  )) as Array<{ code: string; earnedAt: Date | null }>;
  const earnedMap = new Map(rows.map((r) => [r.code, r.earnedAt]));

  return BADGE_DEFS.map((b) => ({
    ...b,
    earnedAt: earnedMap.get(b.code) ?? null,
  }));
}

async function docsVehicleOk(companyId: string): Promise<boolean> {
  const vehicles = await db.vehicle.findMany({
    where: { companyId },
    include: { documents: { select: { id: true } } },
  });
  if (vehicles.length === 0) return false;
  for (const v of vehicles) {
    if (v.documents.length === 0) return false;
  }
  return true;
}

export async function badgesByCompany(companyIds: string[]): Promise<Map<string, EarndBadge[]>> {
  const map = new Map<string, EarndBadge[]>();
  for (const cid of companyIds) {
    map.set(cid, await computeBadges(cid));
  }
  return map;
}
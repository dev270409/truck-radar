import { db } from "./db";
import { listSubcontracts } from "./subcontract";

/**
 * Reviews blind (§45): recensione bidirezionale VETTORE↔COMMITTENTE dopo un subappalto
 * confermato. Le recensioni restano nascoste (publishedAt NULL) per 7 giorni (finestra
 * "blind"): nessun partecipante può condizionare l'altro. publishDueReviews le rende
 * pubbliche a scadenza. La reputazione (media) usa solo recensioni pubblicate.
 */

export interface ReviewRow {
  id: string;
  tripId: string;
  reviewerCompanyId: string;
  reviewedCompanyId: string;
  role: string;
  rating: number;
  comment: string | null;
  publishedAt: Date | null;
  createdAt: Date;
}

export interface TripParticipants {
  parentCompanyId: string;
  carrierCompanyId: string;
  confirmedBy: string;
}

export async function publishDueReviews(): Promise<number> {
  const res = await db.$executeRawUnsafe(
    `UPDATE "Review" SET "publishedAt" = now()
     WHERE "publishedAt" IS NULL AND "createdAt" <= now() - interval '7 days'`
  );
  return res;
}

export async function listReviews(filter: {
  reviewedCompanyId?: string;
  tripId?: string;
  onlyPublished?: boolean;
}): Promise<ReviewRow[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.reviewedCompanyId) {
    params.push(filter.reviewedCompanyId);
    clauses.push(`"reviewedCompanyId" = $${params.length}`);
  }
  if (filter.tripId) {
    params.push(filter.tripId);
    clauses.push(`"tripId" = $${params.length}`);
  }
  if (filter.onlyPublished) {
    clauses.push(`"publishedAt" IS NOT NULL`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db.$queryRawUnsafe(
    `SELECT * FROM "Review" ${where} ORDER BY "createdAt" DESC`,
    ...params
  ) as Promise<ReviewRow[]>;
}

export async function getTripParticipants(tripId: string): Promise<TripParticipants | null> {
  const props = await listSubcontracts({ tripId, status: "CONFERMATO" });
  if (props.length === 0) return null;
  const p = props[0];
  return { parentCompanyId: p.parentCompanyId, carrierCompanyId: p.carrierCompanyId, confirmedBy: p.createdBy };
}

export async function createReview(data: {
  tripId: string;
  reviewerCompanyId: string;
  reviewedCompanyId: string;
  role: string;
  rating: number;
  comment?: string | null;
}): Promise<ReviewRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "Review" ("tripId", "reviewerCompanyId", "reviewedCompanyId", "role", "rating", "comment")
     SELECT $1, $2, $3, $4, $5, $6
     WHERE NOT EXISTS (
       SELECT 1 FROM "Review" r WHERE r."tripId" = $1 AND r."reviewerCompanyId" = $2
     )
     RETURNING *`,
    data.tripId,
    data.reviewerCompanyId,
    data.reviewedCompanyId,
    data.role,
    data.rating,
    data.comment ?? null
  )) as ReviewRow[];
  return rows[0] ?? null;
}

export async function reputationOf(companyId: string): Promise<{ avg: number; count: number }> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT COALESCE(AVG("rating"), 0)::float8 AS avg, COUNT(*)::int AS count
     FROM "Review" WHERE "reviewedCompanyId" = $1 AND "publishedAt" IS NOT NULL`,
    companyId
  )) as Array<{ avg: number; count: number }>;
  return { avg: Number(rows[0]?.avg ?? 0), count: Number(rows[0]?.count ?? 0) };
}
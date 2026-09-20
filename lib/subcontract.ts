import { db } from "./db";

export interface SubcontractRow {
  id: string;
  tripId: string;
  parentCompanyId: string;
  carrierCompanyId: string;
  marketplaceLoadId: string | null;
  price: number | null;
  status: string;
  createdBy: string;
  createdAt: Date;
}

export async function listSubcontracts(filter: {
  parentCompanyId?: string;
  tripId?: string;
  status?: string | null;
}): Promise<SubcontractRow[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.parentCompanyId) {
    params.push(filter.parentCompanyId);
    clauses.push(`"parentCompanyId" = $${params.length}`);
  }
  if (filter.tripId) {
    params.push(filter.tripId);
    clauses.push(`"tripId" = $${params.length}`);
  }
  if (filter.status) {
    params.push(filter.status);
    clauses.push(`"status" = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db.$queryRawUnsafe(
    `SELECT * FROM "Subcontract" ${where} ORDER BY "createdAt" DESC`,
    ...params
  ) as Promise<SubcontractRow[]>;
}

export async function createSubcontract(data: {
  parentCompanyId: string;
  tripId: string;
  carrierCompanyId: string;
  price?: number | null;
  marketplaceLoadId?: string | null;
  createdBy: string;
}): Promise<SubcontractRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "Subcontract" ("tripId", "parentCompanyId", "carrierCompanyId", "marketplaceLoadId", "price", "status", "createdBy")
     SELECT $1, $2, $3, $4, $5, 'PROPOSTO', $6
     WHERE NOT EXISTS (
       SELECT 1 FROM "Subcontract" s
       WHERE s."tripId" = $1 AND s."carrierCompanyId" = $3 AND s."status" = 'PROPOSTO'
     )
     RETURNING *`,
    data.tripId,
    data.parentCompanyId,
    data.carrierCompanyId,
    data.marketplaceLoadId ?? null,
    data.price ?? null,
    data.createdBy
  )) as SubcontractRow[];
  return rows[0] ?? null;
}

export async function setSubcontractStatus(data: {
  parentCompanyId: string;
  id: string;
  status: string;
}): Promise<SubcontractRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `UPDATE "Subcontract" SET "status" = $1
     WHERE "id" = $2 AND "parentCompanyId" = $3
     RETURNING *`,
    data.status,
    data.id,
    data.parentCompanyId
  )) as SubcontractRow[];
  return rows[0] ?? null;
}

export async function subcontractReviewAverage(companyIds: string[]): Promise<
  Array<{ companyId: string; avg: number; count: string }>
> {
  if (companyIds.length === 0) return [];
  const rows = (await db.$queryRawUnsafe(
    `SELECT "reviewedCompanyId" AS "companyId",
            COALESCE(AVG("rating"), 0)::float8 AS "avg",
            COUNT(*)::text AS "count"
     FROM "Review"
     WHERE "reviewedCompanyId" = ANY($1::text[]) AND "publishedAt" IS NOT NULL
     GROUP BY "reviewedCompanyId"`,
    companyIds
  )) as Array<{ companyId: string; avg: number; count: string }>;
  return rows;
}
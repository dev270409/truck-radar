import { db } from "./db";
import {
  romeDateTime,
  splitRoute,
  type ParsedTripStatement,
} from "./trip-statement";

export interface TripStatementRow {
  id: string;
  companyId: string;
  fileName: string;
  fileUrl: string | null;
  provider: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  declaredTrips: number | null;
  declaredDays: number | null;
  declaredTotal: number | null;
  parsedTrips: number;
  importedTrips: number;
  parsedTotal: number;
  parserMode: string;
  status: string;
  payload: ParsedTripStatement;
  warnings: string[];
  createdBy: string;
  createdAt: string;
  importedAt: string | null;
}

function toDateOnly(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && value.length >= 10) return value.slice(0, 10);
  return null;
}

function normalizeStatement(row: TripStatementRow): TripStatementRow {
  return {
    ...row,
    periodStart: toDateOnly(row.periodStart),
    periodEnd: toDateOnly(row.periodEnd),
    payload:
      typeof row.payload === "string"
        ? (JSON.parse(row.payload) as ParsedTripStatement)
        : row.payload,
    warnings:
      typeof row.warnings === "string" ? (JSON.parse(row.warnings) as string[]) : row.warnings,
  };
}

export interface TripStatementLineRow {
  id: string;
  statementId: string;
  companyId: string;
  code: string;
  date: string;
  description: string;
  customer: string | null;
  amount: number;
  tripId: string | null;
  createdAt: string;
}

export async function createTripStatement(
  companyId: string,
  createdBy: string,
  file: { fileName: string; fileUrl: string },
  parsed: ParsedTripStatement,
  parserMode = "DETERMINISTIC"
): Promise<TripStatementRow> {
  const total = Math.round(parsed.lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100;
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "TripStatement"
      ("companyId", "fileName", "fileUrl", provider, "periodStart", "periodEnd", "declaredTrips", "declaredDays", "declaredTotal", "parsedTrips", "parsedTotal", "parserMode", payload, warnings, "createdBy")
     VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15)
     RETURNING *`,
    companyId,
    file.fileName,
    file.fileUrl,
    parsed.provider,
    parsed.periodStart,
    parsed.periodEnd,
    parsed.declaredTrips,
    parsed.declaredDays,
    parsed.declaredTotal,
    parsed.lines.length,
    total,
    parserMode,
    JSON.stringify(parsed),
    JSON.stringify(parsed.warnings),
    createdBy
  )) as TripStatementRow[];
  return normalizeStatement(rows[0]);
}

export async function getTripStatement(
  companyId: string,
  id: string
): Promise<TripStatementRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT * FROM "TripStatement" WHERE id = $1 AND "companyId" = $2 LIMIT 1`,
    id,
    companyId
  )) as TripStatementRow[];
  return rows[0] ? normalizeStatement(rows[0]) : null;
}

export async function listTripStatements(
  companyId: string,
  limit = 20
): Promise<TripStatementRow[]> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT * FROM "TripStatement" WHERE "companyId" = $1 ORDER BY "createdAt" DESC LIMIT $2`,
    companyId,
    limit
  )) as TripStatementRow[];
  return rows.map(normalizeStatement);
}

export async function listExistingStatementCodes(
  companyId: string,
  codes: string[]
): Promise<Set<string>> {
  if (codes.length === 0) return new Set();
  const rows = (await db.$queryRawUnsafe(
    `SELECT code FROM "TripStatementLine" WHERE "companyId" = $1 AND code = ANY($2::text[])`,
    companyId,
    codes
  )) as Array<{ code: string }>;
  return new Set(rows.map((row) => row.code));
}

export async function listStatementLines(
  companyId: string,
  statementId: string
): Promise<TripStatementLineRow[]> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT * FROM "TripStatementLine"
     WHERE "companyId" = $1 AND "statementId" = $2
     ORDER BY date ASC, code ASC`,
    companyId,
    statementId
  )) as TripStatementLineRow[];
  return rows.map((row) => ({ ...row, date: toDateOnly(row.date) ?? row.date }));
}

export interface ImportedStatementLine {
  code: string;
  tripId: string;
}

export async function importTripStatement(
  companyId: string,
  createdBy: string,
  statement: TripStatementRow,
  codes: string[]
): Promise<{ imported: ImportedStatementLine[]; skipped: string[] }> {
  const wanted = [...new Set(codes)];
  const existing = await listExistingStatementCodes(companyId, wanted);
  const skipped = wanted.filter((code) => existing.has(code));
  const selected = statement.payload.lines.filter(
    (line) => wanted.includes(line.code) && !existing.has(line.code)
  );

  const imported = await db.$transaction(
    async (tx) => {
      const created: ImportedStatementLine[] = [];
      for (const line of selected) {
        const route = splitRoute(line.description);
        const pickup = romeDateTime(line.date, line.pickupTime);
        const delivery = new Date(pickup.getTime() + 8 * 60 * 60_000);
        const note = [
          `Rendiconto ${statement.provider ?? "viaggi"}`,
          statement.periodStart && statement.periodEnd
            ? `${statement.periodStart} / ${statement.periodEnd}`
            : null,
          line.code,
          line.description.slice(0, 300),
        ]
          .filter(Boolean)
          .join(" · ");
        const trip = await tx.trip.create({
          data: {
            companyId,
            luogoRitiro: route.pickup.slice(0, 255),
            luogoConsegna: route.delivery.slice(0, 255),
            dataRitiro: pickup,
            dataConsegna: delivery,
            tipoMerce: "Merce",
            pesoKg: 0,
            volumeM3: 0,
            cliente: line.customer ? line.customer.slice(0, 255) : null,
            prezzo: line.amount,
            costo: null,
            note,
            status: "DA_ASSEGNARE",
            createdBy,
          },
        });
        await tx.$executeRawUnsafe(
          `INSERT INTO "TripStatementLine"
            ("statementId", "companyId", code, date, description, customer, amount, "tripId")
           VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8)`,
          statement.id,
          companyId,
          line.code,
          line.date,
          line.description.slice(0, 2000),
          line.customer ? line.customer.slice(0, 255) : null,
          line.amount,
          trip.id
        );
        created.push({ code: line.code, tripId: trip.id });
      }
      return created;
    },
    { timeout: 30000 }
  );

  return { imported, skipped };
}

export async function markTripStatementImported(
  companyId: string,
  id: string,
  importedCount: number
): Promise<void> {
  await db.$executeRawUnsafe(
    `UPDATE "TripStatement"
     SET status = 'IMPORTED', "importedAt" = now(), "importedTrips" = $3
     WHERE id = $1 AND "companyId" = $2`,
    id,
    companyId,
    importedCount
  );
}

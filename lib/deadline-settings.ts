import type { Prisma } from "@prisma/client";
import { db } from "./db";
import {
  DEADLINE_TYPES,
  DEFAULT_ALERT_DAYS,
  deadlineAppliesToVehicle,
  deadlineType,
  type DeadlineSubject,
} from "./deadline-catalog";

export interface DeadlineSettings {
  active: Record<string, boolean>;
  alertEmails: string[];
  alertsEnabled: boolean;
  alertDays: number[];
}

export interface UnifiedDeadline {
  id: string;
  scope: DeadlineSubject;
  subjectId: string;
  subjectName: string;
  tipo: string;
  tipoLabel: string;
  dataScadenza: string;
  note: string | null;
  sourceTable: "DriverDocument" | "CompanyDeadline" | "VehicleDeadline" | "VehicleDocument";
}

export function normalizeDeadlineSettings(input: unknown): DeadlineSettings {
  const raw = input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
  const activeSource = raw.active && typeof raw.active === "object" && !Array.isArray(raw.active)
    ? (raw.active as Record<string, unknown>)
    : {};
  const active: Record<string, boolean> = {};
  for (const type of DEADLINE_TYPES) {
    active[type.id] = activeSource[type.id] !== false;
  }
  const emails = Array.isArray(raw.alertEmails)
    ? raw.alertEmails.filter((value): value is string => typeof value === "string").map((value) => value.trim().toLowerCase()).filter(Boolean)
    : [];
  const alertDays = Array.isArray(raw.alertDays)
    ? raw.alertDays.map(Number).filter((value) => Number.isFinite(value) && value >= 0 && value <= 365)
    : [];
  return {
    active,
    alertEmails: [...new Set(emails)].slice(0, 10),
    alertsEnabled: raw.alertsEnabled !== false,
    alertDays: [...new Set(alertDays.length ? alertDays : DEFAULT_ALERT_DAYS)].sort((a, b) => b - a),
  };
}

export async function getDeadlineSettings(companyId: string): Promise<DeadlineSettings> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { deadlineSettings: true },
  });
  return normalizeDeadlineSettings(company?.deadlineSettings);
}

export async function saveDeadlineSettings(
  companyId: string,
  input: unknown
): Promise<DeadlineSettings> {
  const settings = normalizeDeadlineSettings(input);
  await db.company.update({
    where: { id: companyId },
    data: { deadlineSettings: settings as unknown as Prisma.InputJsonValue },
  });
  return settings;
}

export async function listUnifiedDeadlines(companyId: string): Promise<UnifiedDeadline[]> {
  const [driverDocs, companyDeadlines, vehicleDeadlines, vehicleDocs] = await Promise.all([
    db.$queryRawUnsafe(
      `SELECT d.id, d."userId", d.tipo, d."dataScadenza", d.note, u.nome, u.cognome
       FROM "DriverDocument" d
       LEFT JOIN "User" u ON u.id = d."userId"
       WHERE d."companyId" = $1`,
      companyId
    ) as Promise<Array<{ id: string; userId: string; tipo: string; dataScadenza: Date; note: string | null; nome: string | null; cognome: string | null }>>,
    db.$queryRawUnsafe(
      `SELECT id, tipo, "dataScadenza", note FROM "CompanyDeadline" WHERE "companyId" = $1`,
      companyId
    ) as Promise<Array<{ id: string; tipo: string; dataScadenza: Date; note: string | null }>>,
    db.$queryRawUnsafe(
      `SELECT d.id, d."vehicleId", d.tipo, d."dataScadenza", d.note, v.targa
       FROM "VehicleDeadline" d
       LEFT JOIN "Vehicle" v ON v.id = d."vehicleId"
       WHERE d."companyId" = $1`,
      companyId
    ) as Promise<Array<{ id: string; vehicleId: string; tipo: string; dataScadenza: Date; note: string | null; targa: string | null }>>,
    db.$queryRawUnsafe(
      `SELECT d.id, d."vehicleId", d.tipo, d."dataScadenza", v.targa
       FROM "VehicleDocument" d
       LEFT JOIN "Vehicle" v ON v.id = d."vehicleId"
       WHERE v."companyId" = $1`,
      companyId
    ) as Promise<Array<{ id: string; vehicleId: string; tipo: string; dataScadenza: Date; targa: string | null }>>,
  ]);

  const rows: UnifiedDeadline[] = [
    ...driverDocs.map((doc) => ({
      id: doc.id,
      scope: "AUTISTA" as const,
      subjectId: doc.userId,
      subjectName: `${doc.nome ?? ""} ${doc.cognome ?? ""}`.trim() || "Autista",
      tipo: doc.tipo.toLowerCase(),
      tipoLabel: deadlineType(doc.tipo.toLowerCase())?.label ?? doc.tipo,
      dataScadenza: new Date(doc.dataScadenza).toISOString(),
      note: doc.note,
      sourceTable: "DriverDocument" as const,
    })),
    ...companyDeadlines.map((doc) => ({
      id: doc.id,
      scope: "AZIENDA" as const,
      subjectId: "company",
      subjectName: "Azienda",
      tipo: doc.tipo.toLowerCase(),
      tipoLabel: deadlineType(doc.tipo.toLowerCase())?.label ?? doc.tipo,
      dataScadenza: new Date(doc.dataScadenza).toISOString(),
      note: doc.note,
      sourceTable: "CompanyDeadline" as const,
    })),
    ...vehicleDeadlines.map((doc) => ({
      id: doc.id,
      scope: "VEICOLO" as const,
      subjectId: doc.vehicleId,
      subjectName: doc.targa ?? doc.vehicleId,
      tipo: doc.tipo.toLowerCase(),
      tipoLabel: deadlineType(doc.tipo.toLowerCase())?.label ?? doc.tipo,
      dataScadenza: new Date(doc.dataScadenza).toISOString(),
      note: doc.note,
      sourceTable: "VehicleDeadline" as const,
    })),
    ...vehicleDocs.map((doc) => ({
      id: doc.id,
      scope: "VEICOLO" as const,
      subjectId: doc.vehicleId,
      subjectName: doc.targa ?? doc.vehicleId,
      tipo: doc.tipo.toLowerCase(),
      tipoLabel: deadlineType(doc.tipo.toLowerCase())?.label ?? doc.tipo,
      dataScadenza: new Date(doc.dataScadenza).toISOString(),
      note: null,
      sourceTable: "VehicleDocument" as const,
    })),
  ];

  const unique = new Map<string, UnifiedDeadline>();
  for (const row of rows) {
    const key = `${row.scope}:${row.subjectId}:${row.tipo}:${row.dataScadenza.slice(0, 10)}`;
    if (!unique.has(key)) unique.set(key, row);
  }
  return [...unique.values()].sort(
    (a, b) => new Date(a.dataScadenza).getTime() - new Date(b.dataScadenza).getTime()
  );
}

export async function getDeadlineAlertStatus(companyId: string) {
  const rows = (await db.$queryRawUnsafe(
    `SELECT status, COUNT(*)::int AS n
     FROM "DeadlineAlert"
     WHERE "companyId" = $1
     GROUP BY status`,
    companyId
  )) as Array<{ status: string; n: number }>;
  const lastErrors = (await db.$queryRawUnsafe(
    `SELECT tipo, "lastError", "createdAt"
     FROM "DeadlineAlert"
     WHERE "companyId" = $1 AND status = 'FAILED'
     ORDER BY "createdAt" DESC
     LIMIT 3`,
    companyId
  )) as Array<{ tipo: string; lastError: string | null; createdAt: Date }>;
  const settings = await getDeadlineSettings(companyId);
  const counts = Object.fromEntries(rows.map((row) => [row.status, Number(row.n)]));
  return {
    settings,
    counts,
    pending: counts.PENDING ?? 0,
    sent: counts.SENT ?? 0,
    failed: counts.FAILED ?? 0,
    notConfigured: counts.NOT_CONFIGURED ?? 0,
    senzaDestinatari: settings.alertEmails.length === 0,
    providerConfigured: Boolean(process.env.RESEND_API_KEY),
    lastErrors,
  };
}

export async function createVehicleDeadline(
  companyId: string,
  data: { vehicleId: string; tipo: string; dataScadenza: string; note?: string | null }
) {
  const type = deadlineType(data.tipo);
  if (!type || type.subject !== "VEICOLO") throw new Error("Tipo scadenza mezzo non valido.");
  const vehicle = await db.vehicle.findFirst({
    where: { id: data.vehicleId, companyId },
    select: { categoria: true },
  });
  if (!vehicle) throw new Error("Mezzo non trovato.");
  if (!deadlineAppliesToVehicle(type, vehicle.categoria)) {
    throw new Error("Questa scadenza non si applica alla categoria del mezzo.");
  }
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "VehicleDeadline" ("companyId", "vehicleId", tipo, "dataScadenza", note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    companyId,
    data.vehicleId,
    type.id,
    new Date(data.dataScadenza),
    data.note?.trim() || null
  )) as Array<{ id: string }>;
  return rows[0];
}

export async function deleteVehicleDeadline(companyId: string, id: string): Promise<boolean> {
  const n = (await db.$executeRawUnsafe(
    `DELETE FROM "VehicleDeadline" WHERE id = $1 AND "companyId" = $2`,
    id,
    companyId
  )) as number;
  return n > 0;
}

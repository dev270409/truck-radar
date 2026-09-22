import { db } from "./db";

export interface InspectionItem {
  label: string;
  ok: boolean;
  note?: string | null;
}

export interface InspectionTemplateRow {
  id: string;
  companyId: string;
  name: string;
  items: InspectionItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleInspectionRow {
  id: string;
  vehicleId: string;
  companyId: string;
  tripId: string | null;
  templateId: string | null;
  templateName: string | null;
  esito: string;
  items: InspectionItem[];
  note: string | null;
  lat: number | null;
  lng: number | null;
  createdBy: string;
  createdAt: Date;
}

export const DEFAULT_INSPECTION_ITEMS: string[] = [
  "Sistema frenante",
  "Pneumatici (usura e pressione)",
  "Luci e indicatori",
  "Fissaggio carico",
  "Tachigrafo funzionante",
  "Documenti a bordo",
  "Specifico ADR/portata",
  "Card combustibile/carburante",
];

export async function getInspectionTemplate(companyId: string, id: string): Promise<InspectionTemplateRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT * FROM "InspectionTemplate" WHERE id = $1 AND "companyId" = $2`,
    id,
    companyId
  )) as InspectionTemplateRow[];
  if (!rows[0]) return null;
  return parseTemplate(rows[0]);
}

export async function getOrCreateInspectionTemplate(companyId: string): Promise<InspectionTemplateRow> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT * FROM "InspectionTemplate" WHERE "companyId" = $1 ORDER BY "createdAt" ASC LIMIT 1`,
    companyId
  )) as InspectionTemplateRow[];
  if (rows[0]) return parseTemplate(rows[0]);

  const items = DEFAULT_INSPECTION_ITEMS.map((label) => ({ label, ok: false }));
  const created = (await db.$queryRawUnsafe(
    `INSERT INTO "InspectionTemplate" ("companyId", name, items)
     VALUES ($1, 'Check-list pre-partenza', $2::jsonb)
     RETURNING *`,
    companyId,
    JSON.stringify(items)
  )) as InspectionTemplateRow[];
  return parseTemplate(created[0]);
}

export async function saveTemplateItems(companyId: string, id: string, name: string, items: string[]): Promise<InspectionTemplateRow | null> {
  const formatted = items.map((label) => ({ label, ok: false }));
  const rows = (await db.$queryRawUnsafe(
    `UPDATE "InspectionTemplate" SET name = $3, items = $4::jsonb, "updatedAt" = now()
     WHERE id = $1 AND "companyId" = $2
     RETURNING *`,
    id,
    companyId,
    name,
    JSON.stringify(formatted)
  )) as InspectionTemplateRow[];
  return rows[0] ? parseTemplate(rows[0]) : null;
}

export async function createInspection(data: {
  vehicleId: string;
  companyId: string;
  tripId?: string | null;
  templateId?: string | null;
  templateName?: string | null;
  items: InspectionItem[];
  note?: string | null;
  lat?: number | null;
  lng?: number | null;
  createdBy: string;
}): Promise<VehicleInspectionRow> {
  const hasFail = data.items.some((i) => !i.ok);
  const esito = hasFail ? "KO" : "OK";
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "VehicleInspection"
       ("vehicleId", "companyId", "tripId", "templateId", "templateName", esito, items, note, lat, lng, "createdBy")
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11)
     RETURNING *`,
    data.vehicleId,
    data.companyId,
    data.tripId ?? null,
    data.templateId ?? null,
    data.templateName ?? null,
    esito,
    JSON.stringify(data.items),
    data.note ?? null,
    data.lat ?? null,
    data.lng ?? null,
    data.createdBy
  )) as VehicleInspectionRow[];
  return parseInspection(rows[0]);
}

export async function listInspections(companyId: string, vehicleId?: string, limit = 20): Promise<VehicleInspectionRow[]> {
  const rows = vehicleId
    ? ((await db.$queryRawUnsafe(
        `SELECT * FROM "VehicleInspection" WHERE "companyId" = $1 AND "vehicleId" = $2 ORDER BY "createdAt" DESC LIMIT $3`,
        companyId,
        vehicleId,
        limit
      )) as VehicleInspectionRow[])
    : ((await db.$queryRawUnsafe(
        `SELECT * FROM "VehicleInspection" WHERE "companyId" = $1 ORDER BY "createdAt" DESC LIMIT $2`,
        companyId,
        limit
      )) as VehicleInspectionRow[]);
  return rows.map(parseInspection);
}

export interface InspectionVehicleEnriched extends VehicleInspectionRow {
  targa: string;
}

export async function listInspectionsEnriched(companyId: string, limit = 20): Promise<InspectionVehicleEnriched[]> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT vi.*, v.targa AS targa
     FROM "VehicleInspection" vi
     LEFT JOIN "Vehicle" v ON v.id = vi."vehicleId"
     WHERE vi."companyId" = $1
     ORDER BY vi."createdAt" DESC
     LIMIT $2`,
    companyId,
    limit
  )) as InspectionVehicleEnriched[];
  return rows.map((r) => ({ ...parseInspection(r), targa: r.targa }));
}

function parseTemplate(r: InspectionTemplateRow): InspectionTemplateRow {
  return {
    ...r,
    items: Array.isArray(r.items) ? (r.items as InspectionItem[]) : [],
    createdAt: r.createdAt ? new Date(r.createdAt) : r.createdAt,
    updatedAt: r.updatedAt ? new Date(r.updatedAt) : r.updatedAt,
  };
}

function parseInspection(r: VehicleInspectionRow): VehicleInspectionRow {
  return {
    ...r,
    items: Array.isArray(r.items) ? (r.items as InspectionItem[]) : [],
    createdAt: r.createdAt ? new Date(r.createdAt) : r.createdAt,
  };
}
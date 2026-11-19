import { db } from "./db";
import {
  deriveInboxStatus,
  isDocInboxSource,
  isDocInboxStatus,
  normalizeDocType,
} from "./doc-inbox-shared";

export * from "./doc-inbox-shared";

export interface DocumentInboxRow {
  id: string;
  companyId: string;
  source: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  fileSize: number | null;
  status: string;
  docType: string | null;
  docNumber: string | null;
  docDate: Date | null;
  amount: number | null;
  customerName: string | null;
  tripId: string | null;
  vehicleId: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tripLabel?: string | null;
  vehicleTarga?: string | null;
}

const SELECT_BASE = `
  SELECT d.*,
         CASE
           WHEN t.id IS NULL THEN NULL
           ELSE t."luogoRitiro" || ' - ' || t."luogoConsegna"
         END AS "tripLabel",
         v."targa" AS "vehicleTarga"
  FROM "DocumentInbox" d
  LEFT JOIN "Trip" t ON t.id = d."tripId" AND t."companyId" = d."companyId"
  LEFT JOIN "Vehicle" v ON v.id = d."vehicleId" AND v."companyId" = d."companyId"
`;

export async function listDocumentInbox(
  companyId: string,
  status?: string | null
): Promise<DocumentInboxRow[]> {
  if (status && isDocInboxStatus(status)) {
    return db.$queryRawUnsafe(
      `${SELECT_BASE}
       WHERE d."companyId" = $1 AND d."status" = $2
       ORDER BY d."createdAt" DESC
       LIMIT 200`,
      companyId,
      status
    ) as Promise<DocumentInboxRow[]>;
  }
  return db.$queryRawUnsafe(
    `${SELECT_BASE}
     WHERE d."companyId" = $1
     ORDER BY d."createdAt" DESC
     LIMIT 200`,
    companyId
  ) as Promise<DocumentInboxRow[]>;
}

export async function getDocumentInbox(
  companyId: string,
  id: string
): Promise<DocumentInboxRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `${SELECT_BASE} WHERE d."companyId" = $1 AND d.id = $2 LIMIT 1`,
    companyId,
    id
  )) as DocumentInboxRow[];
  return rows[0] ?? null;
}

export async function createDocumentInbox(data: {
  companyId: string;
  source?: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSize?: number | null;
  docType?: string | null;
  docNumber?: string | null;
  docDate?: string | null;
  amount?: number | null;
  customerName?: string | null;
  tripId?: string | null;
  vehicleId?: string | null;
  notes?: string | null;
  createdBy: string;
}): Promise<DocumentInboxRow> {
  const docType = normalizeDocType(data.docType);
  const status = deriveInboxStatus({
    docType,
    tripId: data.tripId,
    vehicleId: data.vehicleId,
    customerName: data.customerName,
  });

  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "DocumentInbox"
      ("companyId", source, "fileName", "fileUrl", "mimeType", "fileSize", status, "docType", "docNumber", "docDate", amount, "customerName", "tripId", "vehicleId", notes, "createdBy")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING id`,
    data.companyId,
    isDocInboxSource(data.source) ? data.source : "UPLOAD",
    data.fileName.trim(),
    data.fileUrl.trim(),
    data.mimeType ?? null,
    data.fileSize ?? null,
    status,
    docType,
    data.docNumber?.trim() || null,
    data.docDate ? new Date(data.docDate) : null,
    data.amount ?? null,
    data.customerName?.trim() || null,
    data.tripId ?? null,
    data.vehicleId ?? null,
    data.notes?.trim() || null,
    data.createdBy
  )) as Array<{ id: string }>;

  const created = await getDocumentInbox(data.companyId, rows[0].id);
  if (!created) throw new Error("Documento non creato.");
  return created;
}

export async function updateDocumentInbox(
  companyId: string,
  id: string,
  data: {
    status?: string;
    docType?: string | null;
    docNumber?: string | null;
    docDate?: string | null;
    amount?: number | null;
    customerName?: string | null;
    tripId?: string | null;
    vehicleId?: string | null;
    notes?: string | null;
  }
): Promise<DocumentInboxRow | null> {
  const sets: string[] = [];
  const params: unknown[] = [];

  const add = (column: string, value: unknown) => {
    params.push(value);
    sets.push(`"${column}" = $${params.length}`);
  };

  if (data.status !== undefined && isDocInboxStatus(data.status)) add("status", data.status);
  if (data.docType !== undefined) add("docType", normalizeDocType(data.docType));
  if (data.docNumber !== undefined) add("docNumber", data.docNumber?.trim() || null);
  if (data.docDate !== undefined) add("docDate", data.docDate ? new Date(data.docDate) : null);
  if (data.amount !== undefined) add("amount", data.amount);
  if (data.customerName !== undefined) add("customerName", data.customerName?.trim() || null);
  if (data.tripId !== undefined) add("tripId", data.tripId);
  if (data.vehicleId !== undefined) add("vehicleId", data.vehicleId);
  if (data.notes !== undefined) add("notes", data.notes?.trim() || null);

  if (sets.length === 0) return getDocumentInbox(companyId, id);

  sets.push(`"updatedAt" = now()`);
  params.push(id);
  params.push(companyId);

  const rows = (await db.$queryRawUnsafe(
    `UPDATE "DocumentInbox"
     SET ${sets.join(", ")}
     WHERE id = $${params.length - 1} AND "companyId" = $${params.length}
     RETURNING id`,
    ...params
  )) as Array<{ id: string }>;

  if (!rows[0]) return null;
  return getDocumentInbox(companyId, id);
}

export async function deleteDocumentInbox(companyId: string, id: string): Promise<boolean> {
  const count = await db.$executeRawUnsafe(
    `DELETE FROM "DocumentInbox" WHERE id = $1 AND "companyId" = $2`,
    id,
    companyId
  );
  return count > 0;
}

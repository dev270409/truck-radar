import { db } from "./db";

/**
 * Helper per modelli non presenti in schema.prisma (vedi scripts/ensure-raw-tables.ts).
 * Accesso SQL raw sempre scoped per companyId (multi-tenancy).
 */

export interface TripDocumentRow {
  id: string;
  tripId: string;
  companyId: string;
  tipo: string;
  fileUrl: string;
  note: string | null;
  createdBy: string;
  createdAt: Date;
}

export async function listTripDocuments(
  companyId: string,
  tripId: string
): Promise<TripDocumentRow[]> {
  return db.$queryRawUnsafe(
    `SELECT * FROM "TripDocument"
     WHERE "companyId" = $1 AND "tripId" = $2
     ORDER BY "createdAt" ASC`,
    companyId,
    tripId
  ) as Promise<TripDocumentRow[]>;
}

export async function createTripDocument(data: {
  tripId: string;
  companyId: string;
  tipo: string;
  fileUrl: string;
  note?: string | null;
  createdBy: string;
}): Promise<TripDocumentRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "TripDocument" ("tripId", "companyId", "tipo", "fileUrl", "note", "createdBy")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    data.tripId,
    data.companyId,
    data.tipo,
    data.fileUrl,
    data.note ?? null,
    data.createdBy
  )) as TripDocumentRow[];
  return rows[0];
}

export async function deleteTripDocument(companyId: string, id: string): Promise<boolean> {
  const res = await db.$executeRawUnsafe(
    `DELETE FROM "TripDocument" WHERE "id" = $1 AND "companyId" = $2`,
    id,
    companyId
  );
  return res > 0;
}

// ---------- TrackingEvent ----------

export interface TrackingEventRow {
  id: string;
  tripId: string;
  companyId: string;
  eventType: string;
  lat: number | null;
  lng: number | null;
  posizione: string | null;
  note: string | null;
  createdBy: string;
  createdAt: Date;
}

export async function listTrackingEvents(
  companyId: string,
  tripId: string,
  limit = 50
): Promise<TrackingEventRow[]> {
  return db.$queryRawUnsafe(
    `SELECT * FROM "TrackingEvent"
     WHERE "companyId" = $1 AND "tripId" = $2
     ORDER BY "createdAt" ASC
     LIMIT $3`,
    companyId,
    tripId,
    limit
  ) as Promise<TrackingEventRow[]>;
}

export async function createTrackingEvent(data: {
  tripId: string;
  companyId: string;
  eventType: string;
  lat?: number | null;
  lng?: number | null;
  posizione?: string | null;
  note?: string | null;
  createdBy: string;
}): Promise<TrackingEventRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "TrackingEvent" ("tripId", "companyId", "eventType", "lat", "lng", "posizione", "note", "createdBy")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    data.tripId,
    data.companyId,
    data.eventType,
    data.lat ?? null,
    data.lng ?? null,
    data.posizione ?? null,
    data.note ?? null,
    data.createdBy
  )) as TrackingEventRow[];
  return rows[0];
}

// ---------- ExternalIntegration (catalogo) e ApiConnection ----------

export interface ExternalIntegrationRow {
  id: string;
  provider: string;
  name: string;
  type: string;
  docsUrl: string | null;
  enabled: boolean;
  createdAt: Date;
}

export interface ApiConnectionRow {
  id: string;
  companyId: string;
  integrationId: string;
  name: string;
  baseUrl: string | null;
  credentialsCipher: string | null;
  status: string;
  config: Record<string, unknown> | null;
  lastTestedAt: Date | null;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function listExternalIntegrations(): Promise<ExternalIntegrationRow[]> {
  return db.$queryRawUnsafe(
    `SELECT * FROM "ExternalIntegration" ORDER BY "type" ASC, "name" ASC`
  ) as Promise<ExternalIntegrationRow[]>;
}

export async function getExternalIntegration(id: string): Promise<ExternalIntegrationRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT * FROM "ExternalIntegration" WHERE "id" = $1`,
    id
  )) as ExternalIntegrationRow[];
  return rows[0] ?? null;
}

export async function listApiConnections(companyId: string): Promise<ApiConnectionRow[]> {
  return db.$queryRawUnsafe(
    `SELECT * FROM "ApiConnection" WHERE "companyId" = $1 ORDER BY "createdAt" DESC`,
    companyId
  ) as Promise<ApiConnectionRow[]>;
}

export async function getApiConnection(companyId: string, id: string): Promise<ApiConnectionRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT * FROM "ApiConnection" WHERE "id" = $1 AND "companyId" = $2`,
    id,
    companyId
  )) as ApiConnectionRow[];
  return rows[0] ?? null;
}

export async function createApiConnection(data: {
  companyId: string;
  integrationId: string;
  name: string;
  baseUrl?: string | null;
  credentialsCipher: string | null;
  config?: Record<string, unknown> | null;
}): Promise<ApiConnectionRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "ApiConnection" ("companyId", "integrationId", "name", "baseUrl", "credentialsCipher", "status", "config")
     VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6)
     RETURNING *`,
    data.companyId,
    data.integrationId,
    data.name,
    data.baseUrl ?? null,
    data.credentialsCipher,
    (data.config ?? null) as unknown as string | null
  )) as ApiConnectionRow[];
  return rows[0];
}

export async function updateApiConnection(
  companyId: string,
  id: string,
  data: { status?: string; lastTestedAt?: Date | null; lastSyncAt?: Date | null }
): Promise<ApiConnectionRow | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (data.status !== undefined) {
    params.push(data.status);
    sets.push(`"status" = $${params.length}`);
  }
  if (data.lastTestedAt !== undefined) {
    params.push(data.lastTestedAt);
    sets.push(`"lastTestedAt" = $${params.length}`);
  }
  if (data.lastSyncAt !== undefined) {
    params.push(data.lastSyncAt);
    sets.push(`"lastSyncAt" = $${params.length}`);
  }
  if (sets.length === 0) return (await getApiConnection(companyId, id)) ?? null;
  params.push(new Date());
  sets.push(`"updatedAt" = $${params.length}`);
  params.push(id);
  sets.push(`"id" = $${params.length}`);
  params.push(companyId);
  sets.push(`"companyId" = $${params.length}`);

  const rows = (await db.$queryRawUnsafe(
    `UPDATE "ApiConnection" SET ${sets.join(", ")} WHERE "id" = $${params.length - 1} AND "companyId" = $${params.length} RETURNING *`,
    ...params
  )) as ApiConnectionRow[];
  return rows[0] ?? null;
}

export async function deleteApiConnection(companyId: string, id: string): Promise<boolean> {
  const res = await db.$executeRawUnsafe(
    `DELETE FROM "ApiConnection" WHERE "id" = $1 AND "companyId" = $2`,
    id,
    companyId
  );
  return res > 0;
}
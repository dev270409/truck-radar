import { db } from "./db";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface LoadPlanRow {
  id: string;
  companyId: string;
  tripId: string | null;
  vehicleId: string | null;
  name: string;
  vehicleType: string;
  containerType: string | null;
  items: unknown[];
  totals: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuoteRow {
  id: string;
  companyId: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  pickup: string;
  delivery: string;
  goods: string | null;
  weightKg: number;
  volumeM3: number;
  linearM: number;
  price: number;
  cost: number;
  status: string;
  validUntil: Date | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderRow {
  id: string;
  companyId: string;
  quoteId: string | null;
  tripId: string | null;
  customerId: string | null;
  customerName: string;
  customerEmail: string | null;
  pickup: string;
  delivery: string;
  goods: string | null;
  weightKg: number;
  volumeM3: number;
  price: number;
  status: string;
  notes: string | null;
  attachmentUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerRow {
  id: string;
  companyId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  vat: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortalRow {
  id: string;
  companyId: string;
  token: string;
  enabled: boolean;
  brandName: string | null;
  brandColor: string;
  createdBy: string;
  createdAt: Date;
}

export interface RoutePlanRow {
  id: string;
  companyId: string;
  name: string;
  stops: unknown[];
  optimized: unknown[];
  totalKm: number;
  totalCost: number;
  suggestedPrice: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleCostRow {
  id: string;
  companyId: string;
  vehicleId: string;
  tipo: string;
  descrizione: string | null;
  importo: number;
  data: Date;
  fornitore: string | null;
  note: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface DriverDocumentRow {
  id: string;
  companyId: string;
  userId: string;
  tipo: string;
  dataScadenza: Date;
  fileUrl: string | null;
  note: string | null;
  createdAt: Date;
  nome?: string;
  cognome?: string;
}

export interface CompanyDeadlineRow {
  id: string;
  companyId: string;
  tipo: string;
  dataScadenza: Date;
  note: string | null;
  createdAt: Date;
}

export interface BanRow {
  id: string;
  companyId: string;
  data: Date;
  regione: string | null;
  descrizione: string | null;
  createdAt: Date;
}

export interface FuelTankRow {
  id: string;
  companyId: string;
  name: string;
  capacitaLitri: number;
  contalitri: string | null;
  note: string | null;
  createdAt: Date;
  litriCorrenti?: number;
  ultimoContalitri?: number | null;
}

export interface FuelTankMovementRow {
  id: string;
  companyId: string;
  tankId: string;
  tipo: string;
  litri: number;
  contalitri: number | null;
  note: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface TripPodRow {
  id: string;
  tripId: string;
  companyId: string;
  tipo: string;
  fileUrl: string | null;
  firmaData: string | null;
  note: string | null;
  createdBy: string;
  createdAt: Date;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

/* ------------------------------------------------------------------ */
/* Load plans                                                          */
/* ------------------------------------------------------------------ */

export async function listLoadPlans(companyId: string): Promise<LoadPlanRow[]> {
  return db.$queryRawUnsafe(
    `SELECT * FROM "LoadPlan" WHERE "companyId" = $1 ORDER BY "updatedAt" DESC`,
    companyId
  ) as Promise<LoadPlanRow[]>;
}

export async function createLoadPlan(
  companyId: string,
  createdBy: string,
  data: {
    name?: string;
    tripId?: string | null;
    vehicleId?: string | null;
    vehicleType?: string;
    containerType?: string | null;
    items?: unknown[];
    totals?: Record<string, unknown>;
  }
): Promise<LoadPlanRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "LoadPlan" ("companyId", "tripId", "vehicleId", name, "vehicleType", "containerType", items, totals, "createdBy")
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
     RETURNING *`,
    companyId,
    data.tripId ?? null,
    data.vehicleId ?? null,
    data.name?.trim() || "Piano di carico",
    data.vehicleType || "MOTRICE",
    data.containerType ?? null,
    JSON.stringify(data.items ?? []),
    JSON.stringify(data.totals ?? {}),
    createdBy
  )) as LoadPlanRow[];
  return rows[0];
}

export async function updateLoadPlan(
  companyId: string,
  id: string,
  data: {
    name?: string;
    tripId?: string | null;
    vehicleId?: string | null;
    vehicleType?: string;
    containerType?: string | null;
    items?: unknown[];
    totals?: Record<string, unknown>;
  }
): Promise<LoadPlanRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `UPDATE "LoadPlan"
     SET name = COALESCE($3, name),
         "tripId" = COALESCE($4, "tripId"),
         "vehicleId" = COALESCE($5, "vehicleId"),
         "vehicleType" = COALESCE($6, "vehicleType"),
         "containerType" = COALESCE($7, "containerType"),
         items = COALESCE($8::jsonb, items),
         totals = COALESCE($9::jsonb, totals),
         "updatedAt" = now()
     WHERE id = $1 AND "companyId" = $2
     RETURNING *`,
    id,
    companyId,
    str(data.name),
    data.tripId === undefined ? null : data.tripId,
    data.vehicleId === undefined ? null : data.vehicleId,
    str(data.vehicleType),
    data.containerType === undefined ? null : data.containerType,
    data.items === undefined ? null : JSON.stringify(data.items),
    data.totals === undefined ? null : JSON.stringify(data.totals)
  )) as LoadPlanRow[];
  return rows[0] ?? null;
}

export async function deleteLoadPlan(companyId: string, id: string): Promise<boolean> {
  const n = (await db.$executeRawUnsafe(
    `DELETE FROM "LoadPlan" WHERE id = $1 AND "companyId" = $2`,
    id,
    companyId
  )) as number;
  return n > 0;
}

/* ------------------------------------------------------------------ */
/* Customers / quotes / orders                                        */
/* ------------------------------------------------------------------ */

export async function listCustomers(companyId: string): Promise<CustomerRow[]> {
  return db.$queryRawUnsafe(
    `SELECT * FROM "Customer" WHERE "companyId" = $1 ORDER BY name ASC`,
    companyId
  ) as Promise<CustomerRow[]>;
}

export async function createCustomer(
  companyId: string,
  data: { name: string; email?: string | null; phone?: string | null; address?: string | null; vat?: string | null; notes?: string | null }
): Promise<CustomerRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "Customer" ("companyId", name, email, phone, address, vat, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    companyId,
    data.name.trim(),
    str(data.email),
    str(data.phone),
    str(data.address),
    str(data.vat),
    str(data.notes)
  )) as CustomerRow[];
  return rows[0];
}

export async function listQuotes(companyId: string): Promise<QuoteRow[]> {
  return db.$queryRawUnsafe(
    `SELECT * FROM "Quote" WHERE "companyId" = $1 ORDER BY "createdAt" DESC`,
    companyId
  ) as Promise<QuoteRow[]>;
}

export async function createQuote(
  companyId: string,
  createdBy: string,
  data: {
    customerId?: string | null;
    customerName: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
    pickup: string;
    delivery: string;
    goods?: string | null;
    weightKg?: number;
    volumeM3?: number;
    linearM?: number;
    price?: number;
    cost?: number;
    status?: string;
    validUntil?: string | null;
    notes?: string | null;
  }
): Promise<QuoteRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "Quote" ("companyId", "customerId", "customerName", "customerEmail", "customerPhone", pickup, delivery, goods, "weightKg", "volumeM3", "linearM", price, cost, status, "validUntil", notes, "createdBy")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING *`,
    companyId,
    data.customerId ?? null,
    data.customerName.trim(),
    str(data.customerEmail),
    str(data.customerPhone),
    data.pickup.trim(),
    data.delivery.trim(),
    str(data.goods),
    num(data.weightKg),
    num(data.volumeM3),
    num(data.linearM),
    num(data.price),
    num(data.cost),
    data.status || "BOZZA",
    data.validUntil ? new Date(data.validUntil) : null,
    str(data.notes),
    createdBy
  )) as QuoteRow[];
  return rows[0];
}

export async function updateQuote(
  companyId: string,
  id: string,
  data: Partial<{
    status: string;
    price: number;
    cost: number;
    notes: string | null;
    validUntil: string | null;
  }>
): Promise<QuoteRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `UPDATE "Quote"
     SET status = COALESCE($3, status),
         price = COALESCE($4, price),
         cost = COALESCE($5, cost),
         notes = COALESCE($6, notes),
         "validUntil" = COALESCE($7, "validUntil"),
         "updatedAt" = now()
     WHERE id = $1 AND "companyId" = $2
     RETURNING *`,
    id,
    companyId,
    str(data.status),
    data.price === undefined ? null : num(data.price),
    data.cost === undefined ? null : num(data.cost),
    data.notes === undefined ? null : str(data.notes),
    data.validUntil === undefined ? null : data.validUntil ? new Date(data.validUntil) : null
  )) as QuoteRow[];
  return rows[0] ?? null;
}

export async function deleteQuote(companyId: string, id: string): Promise<boolean> {
  const n = (await db.$executeRawUnsafe(
    `DELETE FROM "Quote" WHERE id = $1 AND "companyId" = $2`,
    id,
    companyId
  )) as number;
  return n > 0;
}

export async function listOrders(companyId: string): Promise<OrderRow[]> {
  return db.$queryRawUnsafe(
    `SELECT * FROM "CustomerOrder" WHERE "companyId" = $1 ORDER BY "createdAt" DESC`,
    companyId
  ) as Promise<OrderRow[]>;
}

export async function createOrder(
  companyId: string,
  data: {
    quoteId?: string | null;
    tripId?: string | null;
    customerId?: string | null;
    customerName: string;
    customerEmail?: string | null;
    pickup: string;
    delivery: string;
    goods?: string | null;
    weightKg?: number;
    volumeM3?: number;
    price?: number;
    status?: string;
    notes?: string | null;
    attachmentUrl?: string | null;
  }
): Promise<OrderRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "CustomerOrder" ("companyId", "quoteId", "tripId", "customerId", "customerName", "customerEmail", pickup, delivery, goods, "weightKg", "volumeM3", price, status, notes, "attachmentUrl")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    companyId,
    data.quoteId ?? null,
    data.tripId ?? null,
    data.customerId ?? null,
    data.customerName.trim(),
    str(data.customerEmail),
    data.pickup.trim(),
    data.delivery.trim(),
    str(data.goods),
    num(data.weightKg),
    num(data.volumeM3),
    num(data.price),
    data.status || "RICEVUTO",
    str(data.notes),
    str(data.attachmentUrl)
  )) as OrderRow[];
  return rows[0];
}

export async function updateOrder(
  companyId: string,
  id: string,
  data: Partial<{ status: string; tripId: string | null; price: number; notes: string | null }>
): Promise<OrderRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `UPDATE "CustomerOrder"
     SET status = COALESCE($3, status),
         "tripId" = COALESCE($4, "tripId"),
         price = COALESCE($5, price),
         notes = COALESCE($6, notes),
         "updatedAt" = now()
     WHERE id = $1 AND "companyId" = $2
     RETURNING *`,
    id,
    companyId,
    str(data.status),
    data.tripId === undefined ? null : data.tripId,
    data.price === undefined ? null : num(data.price),
    data.notes === undefined ? null : str(data.notes)
  )) as OrderRow[];
  return rows[0] ?? null;
}

/* ------------------------------------------------------------------ */
/* Customer portal                                                     */
/* ------------------------------------------------------------------ */

export async function getPortal(companyId: string): Promise<PortalRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT * FROM "CustomerPortal" WHERE "companyId" = $1`,
    companyId
  )) as PortalRow[];
  return rows[0] ?? null;
}

export async function ensurePortal(
  companyId: string,
  createdBy: string,
  brandName?: string | null,
  brandColor?: string | null
): Promise<PortalRow> {
  const existing = await getPortal(companyId);
  if (existing) return existing;
  const token = crypto.randomUUID().replace(/-/g, "");
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "CustomerPortal" ("companyId", token, "brandName", "brandColor", "createdBy")
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT ("companyId") DO UPDATE SET "brandName" = COALESCE(EXCLUDED."brandName", "CustomerPortal"."brandName")
     RETURNING *`,
    companyId,
    token,
    str(brandName),
    str(brandColor) || "#F5B800",
    createdBy
  )) as PortalRow[];
  return rows[0];
}

export async function updatePortal(
  companyId: string,
  data: { enabled?: boolean; brandName?: string | null; brandColor?: string | null }
): Promise<PortalRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `UPDATE "CustomerPortal"
     SET enabled = COALESCE($2, enabled),
         "brandName" = COALESCE($3, "brandName"),
         "brandColor" = COALESCE($4, "brandColor")
     WHERE "companyId" = $1
     RETURNING *`,
    companyId,
    data.enabled === undefined ? null : data.enabled,
    data.brandName === undefined ? null : str(data.brandName),
    data.brandColor === undefined ? null : str(data.brandColor)
  )) as PortalRow[];
  return rows[0] ?? null;
}

export async function getPortalByToken(token: string): Promise<PortalRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT * FROM "CustomerPortal" WHERE token = $1 AND enabled = true`,
    token
  )) as PortalRow[];
  return rows[0] ?? null;
}

export async function listPortalOrders(companyId: string, limit = 50): Promise<OrderRow[]> {
  return db.$queryRawUnsafe(
    `SELECT * FROM "CustomerOrder" WHERE "companyId" = $1 ORDER BY "createdAt" DESC LIMIT $2`,
    companyId,
    limit
  ) as Promise<OrderRow[]>;
}

/* ------------------------------------------------------------------ */
/* Route plans                                                         */
/* ------------------------------------------------------------------ */

export async function listRoutePlans(companyId: string): Promise<RoutePlanRow[]> {
  return db.$queryRawUnsafe(
    `SELECT * FROM "RoutePlan" WHERE "companyId" = $1 ORDER BY "updatedAt" DESC`,
    companyId
  ) as Promise<RoutePlanRow[]>;
}

export async function createRoutePlan(
  companyId: string,
  createdBy: string,
  data: {
    name?: string;
    stops?: unknown[];
    optimized?: unknown[];
    totalKm?: number;
    totalCost?: number;
    suggestedPrice?: number;
  }
): Promise<RoutePlanRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "RoutePlan" ("companyId", name, stops, optimized, "totalKm", "totalCost", "suggestedPrice", "createdBy")
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8)
     RETURNING *`,
    companyId,
    data.name?.trim() || "Giro",
    JSON.stringify(data.stops ?? []),
    JSON.stringify(data.optimized ?? []),
    num(data.totalKm),
    num(data.totalCost),
    num(data.suggestedPrice),
    createdBy
  )) as RoutePlanRow[];
  return rows[0];
}

export async function deleteRoutePlan(companyId: string, id: string): Promise<boolean> {
  const n = (await db.$executeRawUnsafe(
    `DELETE FROM "RoutePlan" WHERE id = $1 AND "companyId" = $2`,
    id,
    companyId
  )) as number;
  return n > 0;
}

/* ------------------------------------------------------------------ */
/* Vehicle costs / TCO                                                 */
/* ------------------------------------------------------------------ */

export async function listVehicleCosts(companyId: string, vehicleId?: string): Promise<VehicleCostRow[]> {
  if (vehicleId) {
    return db.$queryRawUnsafe(
      `SELECT * FROM "VehicleCost" WHERE "companyId" = $1 AND "vehicleId" = $2 ORDER BY "data" DESC`,
      companyId,
      vehicleId
    ) as Promise<VehicleCostRow[]>;
  }
  return db.$queryRawUnsafe(
    `SELECT * FROM "VehicleCost" WHERE "companyId" = $1 ORDER BY "data" DESC`,
    companyId
  ) as Promise<VehicleCostRow[]>;
}

export async function createVehicleCost(
  companyId: string,
  createdBy: string,
  data: {
    vehicleId: string;
    tipo: string;
    descrizione?: string | null;
    importo: number;
    data?: string | null;
    fornitore?: string | null;
    note?: string | null;
  }
): Promise<VehicleCostRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "VehicleCost" ("companyId", "vehicleId", tipo, descrizione, importo, data, fornitore, note, "createdBy")
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()), $7, $8, $9)
     RETURNING *`,
    companyId,
    data.vehicleId,
    data.tipo.trim(),
    str(data.descrizione),
    num(data.importo),
    data.data ? new Date(data.data) : null,
    str(data.fornitore),
    str(data.note),
    createdBy
  )) as VehicleCostRow[];
  return rows[0];
}

export async function deleteVehicleCost(companyId: string, id: string): Promise<boolean> {
  const n = (await db.$executeRawUnsafe(
    `DELETE FROM "VehicleCost" WHERE id = $1 AND "companyId" = $2`,
    id,
    companyId
  )) as number;
  return n > 0;
}

/* ------------------------------------------------------------------ */
/* Deadlines / bans                                                    */
/* ------------------------------------------------------------------ */

export async function listDriverDocuments(companyId: string): Promise<DriverDocumentRow[]> {
  return db.$queryRawUnsafe(
    `SELECT d.*, u.nome, u.cognome
     FROM "DriverDocument" d
     LEFT JOIN "User" u ON u.id = d."userId"
     WHERE d."companyId" = $1
     ORDER BY d."dataScadenza" ASC`,
    companyId
  ) as Promise<DriverDocumentRow[]>;
}

export async function createDriverDocument(
  companyId: string,
  data: { userId: string; tipo: string; dataScadenza: string; fileUrl?: string | null; note?: string | null }
): Promise<DriverDocumentRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "DriverDocument" ("companyId", "userId", tipo, "dataScadenza", "fileUrl", note)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    companyId,
    data.userId,
    data.tipo.trim(),
    new Date(data.dataScadenza),
    str(data.fileUrl),
    str(data.note)
  )) as DriverDocumentRow[];
  return rows[0];
}

export async function deleteDriverDocument(companyId: string, id: string): Promise<boolean> {
  const n = (await db.$executeRawUnsafe(
    `DELETE FROM "DriverDocument" WHERE id = $1 AND "companyId" = $2`,
    id,
    companyId
  )) as number;
  return n > 0;
}

export async function listCompanyDeadlines(companyId: string): Promise<CompanyDeadlineRow[]> {
  return db.$queryRawUnsafe(
    `SELECT * FROM "CompanyDeadline" WHERE "companyId" = $1 ORDER BY "dataScadenza" ASC`,
    companyId
  ) as Promise<CompanyDeadlineRow[]>;
}

export async function createCompanyDeadline(
  companyId: string,
  data: { tipo: string; dataScadenza: string; note?: string | null }
): Promise<CompanyDeadlineRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "CompanyDeadline" ("companyId", tipo, "dataScadenza", note)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    companyId,
    data.tipo.trim(),
    new Date(data.dataScadenza),
    str(data.note)
  )) as CompanyDeadlineRow[];
  return rows[0];
}

export async function deleteCompanyDeadline(companyId: string, id: string): Promise<boolean> {
  const n = (await db.$executeRawUnsafe(
    `DELETE FROM "CompanyDeadline" WHERE id = $1 AND "companyId" = $2`,
    id,
    companyId
  )) as number;
  return n > 0;
}

export async function listBans(companyId: string): Promise<BanRow[]> {
  return db.$queryRawUnsafe(
    `SELECT * FROM "HeavyVehicleBan" WHERE "companyId" = $1 ORDER BY "data" ASC`,
    companyId
  ) as Promise<BanRow[]>;
}

export async function createBan(
  companyId: string,
  data: { data: string; regione?: string | null; descrizione?: string | null }
): Promise<BanRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "HeavyVehicleBan" ("companyId", data, regione, descrizione)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    companyId,
    new Date(data.data),
    str(data.regione),
    str(data.descrizione)
  )) as BanRow[];
  return rows[0];
}

export async function deleteBan(companyId: string, id: string): Promise<boolean> {
  const n = (await db.$executeRawUnsafe(
    `DELETE FROM "HeavyVehicleBan" WHERE id = $1 AND "companyId" = $2`,
    id,
    companyId
  )) as number;
  return n > 0;
}

/* ------------------------------------------------------------------ */
/* Fuel tanks / accise                                                 */
/* ------------------------------------------------------------------ */

export async function listFuelTanks(companyId: string): Promise<FuelTankRow[]> {
  return db.$queryRawUnsafe(
    `SELECT t.*,
       COALESCE(SUM(CASE WHEN m.tipo = 'CARICO' THEN m.litri WHEN m.tipo = 'SCARICO' THEN -m.litri ELSE 0 END), 0) AS "litriCorrenti",
       (SELECT m2."contalitri" FROM "FuelTankMovement" m2 WHERE m2."tankId" = t.id ORDER BY m2."createdAt" DESC LIMIT 1) AS "ultimoContalitri"
     FROM "FuelTank" t
     LEFT JOIN "FuelTankMovement" m ON m."tankId" = t.id
     WHERE t."companyId" = $1
     GROUP BY t.id
     ORDER BY t."createdAt" ASC`,
    companyId
  ) as Promise<FuelTankRow[]>;
}

export async function createFuelTank(
  companyId: string,
  data: { name: string; capacitaLitri?: number; contalitri?: string | null; note?: string | null }
): Promise<FuelTankRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "FuelTank" ("companyId", name, "capacitaLitri", contalitri, note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    companyId,
    data.name.trim(),
    num(data.capacitaLitri),
    str(data.contalitri),
    str(data.note)
  )) as FuelTankRow[];
  return rows[0];
}

export async function deleteFuelTank(companyId: string, id: string): Promise<boolean> {
  const n = (await db.$executeRawUnsafe(
    `DELETE FROM "FuelTank" WHERE id = $1 AND "companyId" = $2`,
    id,
    companyId
  )) as number;
  return n > 0;
}

export async function listTankMovements(companyId: string, tankId?: string): Promise<FuelTankMovementRow[]> {
  if (tankId) {
    return db.$queryRawUnsafe(
      `SELECT * FROM "FuelTankMovement" WHERE "companyId" = $1 AND "tankId" = $2 ORDER BY "createdAt" DESC`,
      companyId,
      tankId
    ) as Promise<FuelTankMovementRow[]>;
  }
  return db.$queryRawUnsafe(
    `SELECT * FROM "FuelTankMovement" WHERE "companyId" = $1 ORDER BY "createdAt" DESC`,
    companyId
  ) as Promise<FuelTankMovementRow[]>;
}

export async function createTankMovement(
  companyId: string,
  createdBy: string,
  data: { tankId: string; tipo: string; litri: number; contalitri?: number | null; note?: string | null }
): Promise<FuelTankMovementRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "FuelTankMovement" ("companyId", "tankId", tipo, litri, contalitri, note, "createdBy")
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    companyId,
    data.tankId,
    data.tipo,
    num(data.litri),
    data.contalitri == null ? null : num(data.contalitri),
    str(data.note),
    createdBy
  )) as FuelTankMovementRow[];
  return rows[0];
}

/* ------------------------------------------------------------------ */
/* POD                                                                 */
/* ------------------------------------------------------------------ */

export async function listTripPods(companyId: string, tripId: string): Promise<TripPodRow[]> {
  return db.$queryRawUnsafe(
    `SELECT * FROM "TripPod" WHERE "companyId" = $1 AND "tripId" = $2 ORDER BY "createdAt" DESC`,
    companyId,
    tripId
  ) as Promise<TripPodRow[]>;
}

export async function createTripPod(
  companyId: string,
  createdBy: string,
  data: { tripId: string; tipo: string; fileUrl?: string | null; firmaData?: string | null; note?: string | null }
): Promise<TripPodRow> {
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "TripPod" ("tripId", "companyId", tipo, "fileUrl", "firmaData", note, "createdBy")
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    data.tripId,
    companyId,
    data.tipo,
    str(data.fileUrl),
    str(data.firmaData),
    str(data.note),
    createdBy
  )) as TripPodRow[];
  return rows[0];
}

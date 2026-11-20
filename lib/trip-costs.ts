import { db } from "./db";
import { COST_CATEGORIES, COST_CATEGORY_MAP, costCategoryLabel, isCostCategory } from "./cost-catalog";

export const TRIP_COST_TIPES = COST_CATEGORIES.map((category) => category.code);

export interface TripCostItemRow {
  id: string;
  companyId: string;
  tripId: string;
  tipo: string;
  label: string | null;
  quantity: number;
  unit: string | null;
  unitCost: number;
  amount: number;
  source: string;
  note: string | null;
  ambito: string | null;
  tipoCosto: string | null;
  categoryLabel: string;
  createdBy: string;
  createdAt: Date;
}

export interface TripCostSummary {
  items: TripCostItemRow[];
  total: number;
  byType: Record<string, number>;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export async function listTripCosts(companyId: string, tripId: string): Promise<TripCostSummary> {
  const rawItems = (await db.$queryRawUnsafe(
    `SELECT * FROM "TripCostItem"
     WHERE "companyId" = $1 AND "tripId" = $2
     ORDER BY "createdAt" ASC`,
    companyId,
    tripId
  )) as TripCostItemRow[];
  const items = rawItems.map((item) => {
    const category = COST_CATEGORY_MAP.get(item.tipo.toUpperCase());
    return { ...item, ambito: category?.ambito ?? null, tipoCosto: category?.tipo ?? null, categoryLabel: category?.label ?? costCategoryLabel(item.tipo) };
  });

  const total = round2(items.reduce((sum, item) => sum + Number(item.amount || 0), 0));
  const byType: Record<string, number> = {};
  for (const item of items) {
    byType[item.tipo] = round2((byType[item.tipo] ?? 0) + Number(item.amount || 0));
  }
  return { items, total, byType };
}

async function syncTripCost(companyId: string, tripId: string): Promise<number> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT COALESCE(SUM(amount), 0)::float8 AS total
     FROM "TripCostItem" WHERE "companyId" = $1 AND "tripId" = $2`,
    companyId,
    tripId
  )) as Array<{ total: number }>;
  const total = round2(Number(rows[0]?.total ?? 0));
  await db.trip.updateMany({
    where: { id: tripId, companyId },
    data: { costo: total },
  });
  return total;
}

export async function addTripCost(
  companyId: string,
  tripId: string,
  createdBy: string,
  data: {
    tipo: string;
    label?: string | null;
    quantity?: number;
    unit?: string | null;
    unitCost?: number;
    amount?: number;
    note?: string | null;
    source?: string;
  }
): Promise<{ item: TripCostItemRow; total: number }> {
  const tipo = data.tipo.trim().toUpperCase();
  if (!isCostCategory(tipo)) {
    throw new Error("Categoria costo non valida.");
  }

  const quantity = Number.isFinite(data.quantity) ? Math.max(0, Number(data.quantity)) : 0;
  const unitCost = Number.isFinite(data.unitCost) ? Math.max(0, Number(data.unitCost)) : 0;
  const computed = data.amount != null && Number.isFinite(data.amount)
    ? Math.max(0, Number(data.amount))
    : quantity * unitCost;
  const amount = round2(computed);
  if (amount <= 0) throw new Error("L'importo del costo deve essere maggiore di zero.");

  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "TripCostItem"
       ("companyId", "tripId", tipo, label, quantity, unit, "unitCost", amount, source, note, "createdBy")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    companyId,
    tripId,
    tipo,
    data.label?.trim() || null,
    quantity,
    data.unit?.trim() || null,
    unitCost,
    amount,
    data.source?.trim() || "MANUAL",
    data.note?.trim() || null,
    createdBy
  )) as TripCostItemRow[];

  const total = await syncTripCost(companyId, tripId);
  return { item: rows[0], total };
}

export async function deleteTripCost(
  companyId: string,
  tripId: string,
  id: string
): Promise<boolean> {
  const deleted = await db.$executeRawUnsafe(
    `DELETE FROM "TripCostItem" WHERE id = $1 AND "tripId" = $2 AND "companyId" = $3`,
    id,
    tripId,
    companyId
  );
  if (deleted > 0) await syncTripCost(companyId, tripId);
  return deleted > 0;
}

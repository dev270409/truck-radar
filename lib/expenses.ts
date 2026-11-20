import { db } from "./db";

export interface ExpenseRow {
  id: string;
  companyId: string;
  date: Date;
  category: string;
  supplier: string | null;
  description: string;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  amount: number;
  paymentMethod: string | null;
  receiptUrl: string | null;
  receiptName: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseInputData {
  date: string;
  category: string;
  supplier?: string | null;
  description: string;
  amount: number;
  vatRate: number;
  paymentMethod?: string | null;
  receiptUrl?: string | null;
  receiptName?: string | null;
  notes?: string | null;
}

export interface ExpenseFilters {
  from?: string | null;
  to?: string | null;
  category?: string | null;
  q?: string | null;
}

function str(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * L'importo inserito è il totale del documento (IVA inclusa).
 * Imponibile e IVA vengono calcolati e salvati per l'export al commercialista.
 */
export function calculateExpenseAmounts(total: number, vatRate: number) {
  const roundedTotal = Math.round(total * 100) / 100;
  const roundedRate = Math.round(vatRate * 100) / 100;
  const vatAmount =
    roundedRate > 0
      ? Math.round(((roundedTotal * roundedRate) / (100 + roundedRate)) * 100) / 100
      : 0;
  const netAmount = Math.round((roundedTotal - vatAmount) * 100) / 100;
  return { netAmount, vatAmount, amount: roundedTotal, vatRate: roundedRate };
}

export async function listExpenses(
  companyId: string,
  filters: ExpenseFilters = {}
): Promise<ExpenseRow[]> {
  const from = filters.from?.trim() || null;
  const to = filters.to?.trim() || null;
  const category = filters.category?.trim() || null;
  const q = filters.q?.trim() || null;

  return db.$queryRawUnsafe(
    `SELECT * FROM "Expense"
     WHERE "companyId" = $1
       AND ($2::date IS NULL OR date >= $2::date)
       AND ($3::date IS NULL OR date <= $3::date)
       AND ($4::text IS NULL OR category = $4::text)
       AND (
         $5::text IS NULL
         OR description ILIKE '%' || $5::text || '%'
         OR COALESCE(supplier, '') ILIKE '%' || $5::text || '%'
       )
     ORDER BY date DESC, "createdAt" DESC`,
    companyId,
    from,
    to,
    category,
    q
  ) as Promise<ExpenseRow[]>;
}

export async function getExpense(companyId: string, id: string): Promise<ExpenseRow | null> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT * FROM "Expense" WHERE id = $1 AND "companyId" = $2 LIMIT 1`,
    id,
    companyId
  )) as ExpenseRow[];
  return rows[0] ?? null;
}

export async function createExpense(
  companyId: string,
  createdBy: string,
  data: ExpenseInputData
): Promise<ExpenseRow> {
  const amounts = calculateExpenseAmounts(data.amount, data.vatRate);
  const rows = (await db.$queryRawUnsafe(
    `INSERT INTO "Expense" ("companyId", date, category, supplier, description, "netAmount", "vatRate", "vatAmount", amount, "paymentMethod", "receiptUrl", "receiptName", notes, "createdBy")
     VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    companyId,
    new Date(data.date),
    data.category,
    str(data.supplier),
    data.description.trim(),
    amounts.netAmount,
    amounts.vatRate,
    amounts.vatAmount,
    amounts.amount,
    str(data.paymentMethod),
    str(data.receiptUrl),
    str(data.receiptName),
    str(data.notes),
    createdBy
  )) as ExpenseRow[];
  return rows[0];
}

export async function updateExpense(
  companyId: string,
  id: string,
  data: Partial<ExpenseInputData>
): Promise<ExpenseRow | null> {
  const current = await getExpense(companyId, id);
  if (!current) return null;

  const total = data.amount ?? Number(current.amount);
  const rate = data.vatRate ?? Number(current.vatRate);
  const amountsChanged = data.amount !== undefined || data.vatRate !== undefined;
  const amounts = calculateExpenseAmounts(total, rate);

  const values: unknown[] = [id, companyId];
  const sets: string[] = [];
  const push = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`"${column}" = $${values.length}`);
  };

  if (data.date !== undefined) push("date", new Date(data.date));
  if (data.category !== undefined) push("category", data.category);
  if (data.supplier !== undefined) push("supplier", str(data.supplier));
  if (data.description !== undefined) push("description", data.description.trim());
  if (data.paymentMethod !== undefined) push("paymentMethod", str(data.paymentMethod));
  if (data.receiptUrl !== undefined) push("receiptUrl", str(data.receiptUrl));
  if (data.receiptName !== undefined) push("receiptName", str(data.receiptName));
  if (data.notes !== undefined) push("notes", str(data.notes));
  if (amountsChanged) {
    push("netAmount", amounts.netAmount);
    push("vatRate", amounts.vatRate);
    push("vatAmount", amounts.vatAmount);
    push("amount", amounts.amount);
  }

  if (sets.length === 0) return current;

  const rows = (await db.$queryRawUnsafe(
    `UPDATE "Expense"
     SET ${sets.join(", ")}, "updatedAt" = now()
     WHERE id = $1 AND "companyId" = $2
     RETURNING *`,
    ...values
  )) as ExpenseRow[];
  return rows[0] ?? null;
}

export async function deleteExpense(companyId: string, id: string): Promise<boolean> {
  const removed = (await db.$executeRawUnsafe(
    `DELETE FROM "Expense" WHERE id = $1 AND "companyId" = $2`,
    id,
    companyId
  )) as number;
  return removed > 0;
}

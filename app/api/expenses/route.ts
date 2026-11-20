import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { createExpense, listExpenses } from "@/lib/expenses";
import { parseExpensePayload } from "@/lib/expense-input";

export async function GET(req: Request) {
  const guard = await requireFeature("expenses");
  if (guard.error) return guard.error;

  const url = new URL(req.url);
  const items = await listExpenses(guard.session.user.companyId, {
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    category: url.searchParams.get("category"),
    q: url.searchParams.get("q"),
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const guard = await requireFeature("expenses");
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const parsed = parseExpensePayload(body, { partial: false });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { date, category, description, amount, vatRate } = parsed.data;
  if (!date || !category || !description || amount === undefined || vatRate === undefined) {
    return NextResponse.json({ error: "Dati della spesa incompleti." }, { status: 400 });
  }

  const item = await createExpense(guard.session.user.companyId, guard.session.user.id, {
    date,
    category,
    description,
    amount,
    vatRate,
    supplier: parsed.data.supplier,
    paymentMethod: parsed.data.paymentMethod,
    receiptUrl: parsed.data.receiptUrl,
    receiptName: parsed.data.receiptName,
    notes: parsed.data.notes,
  });
  return NextResponse.json({ item }, { status: 201 });
}

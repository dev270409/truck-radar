import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { deleteExpense, updateExpense } from "@/lib/expenses";
import { parseExpensePayload } from "@/lib/expense-input";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireFeature("expenses");
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const parsed = parseExpensePayload(body, { partial: true });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const item = await updateExpense(guard.session.user.companyId, id, parsed.data);
  if (!item) return NextResponse.json({ error: "Spesa non trovata." }, { status: 404 });
  return NextResponse.json({ item });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireFeature("expenses");
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  const { id } = await params;
  const deleted = await deleteExpense(guard.session.user.companyId, id);
  if (!deleted) return NextResponse.json({ error: "Spesa non trovata." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

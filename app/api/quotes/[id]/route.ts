import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { createOrder, deleteQuote, listOrders, updateQuote } from "@/lib/ops";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const item = await updateQuote(guard.session.user.companyId, id, {
    status: body.status ? String(body.status) : undefined,
    price: body.price === undefined ? undefined : Number(body.price),
    cost: body.cost === undefined ? undefined : Number(body.cost),
    notes: body.notes === undefined ? undefined : body.notes ? String(body.notes) : null,
    validUntil: body.validUntil === undefined ? undefined : body.validUntil ? String(body.validUntil) : null,
  });
  if (!item) return NextResponse.json({ error: "Preventivo non trovato." }, { status: 404 });

  let order = null;
  if (item.status === "ACCETTATO") {
    const existing = (await listOrders(guard.session.user.companyId)).find((o) => o.quoteId === item.id);
    if (!existing) {
      order = await createOrder(guard.session.user.companyId, {
        quoteId: item.id,
        customerId: item.customerId,
        customerName: item.customerName,
        customerEmail: item.customerEmail,
        pickup: item.pickup,
        delivery: item.delivery,
        goods: item.goods,
        weightKg: item.weightKg,
        volumeM3: item.volumeM3,
        price: item.price,
        status: "CONFERMATO",
        notes: item.notes,
      });
    }
  }

  return NextResponse.json({ item, order });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }
  const { id } = await params;
  const ok = await deleteQuote(guard.session.user.companyId, id);
  if (!ok) return NextResponse.json({ error: "Preventivo non trovato." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

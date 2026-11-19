import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { createQuote, listQuotes } from "@/lib/ops";
import { customerBelongsToCompany } from "@/lib/tenant-refs";

export async function GET() {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const items = await listQuotes(guard.session.user.companyId);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const customerName = String(body.customerName ?? "").trim();
  const pickup = String(body.pickup ?? "").trim();
  const delivery = String(body.delivery ?? "").trim();
  if (!customerName || !pickup || !delivery) {
    return NextResponse.json({ error: "Cliente, ritiro e consegna sono obbligatori." }, { status: 400 });
  }
  const customerId = body.customerId ? String(body.customerId) : null;
  if (customerId && !(await customerBelongsToCompany(guard.session.user.companyId, customerId))) {
    return NextResponse.json({ error: "Cliente non trovato." }, { status: 404 });
  }

  const item = await createQuote(guard.session.user.companyId, guard.session.user.id, {
    customerId,
    customerName,
    customerEmail: body.customerEmail ? String(body.customerEmail) : null,
    customerPhone: body.customerPhone ? String(body.customerPhone) : null,
    pickup,
    delivery,
    goods: body.goods ? String(body.goods) : null,
    weightKg: Number(body.weightKg ?? 0),
    volumeM3: Number(body.volumeM3 ?? 0),
    linearM: Number(body.linearM ?? 0),
    price: Number(body.price ?? 0),
    cost: Number(body.cost ?? 0),
    status: body.status ? String(body.status) : "BOZZA",
    validUntil: body.validUntil ? String(body.validUntil) : null,
    notes: body.notes ? String(body.notes) : null,
  });
  return NextResponse.json({ item }, { status: 201 });
}

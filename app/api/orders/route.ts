import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { createOrder, listOrders } from "@/lib/ops";
import {
  customerBelongsToCompany,
  quoteBelongsToCompany,
  tripBelongsToCompany,
} from "@/lib/tenant-refs";
import { optionalHttpUrl } from "@/lib/url-safety";

export async function GET() {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const items = await listOrders(guard.session.user.companyId);
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
  const quoteId = body.quoteId ? String(body.quoteId) : null;
  const tripId = body.tripId ? String(body.tripId) : null;
  const customerId = body.customerId ? String(body.customerId) : null;
  if (quoteId && !(await quoteBelongsToCompany(guard.session.user.companyId, quoteId))) {
    return NextResponse.json({ error: "Preventivo non trovato." }, { status: 404 });
  }
  if (tripId && !(await tripBelongsToCompany(guard.session.user.companyId, tripId))) {
    return NextResponse.json({ error: "Viaggio non trovato." }, { status: 404 });
  }
  if (customerId && !(await customerBelongsToCompany(guard.session.user.companyId, customerId))) {
    return NextResponse.json({ error: "Cliente non trovato." }, { status: 404 });
  }
  if (body.attachmentUrl && !optionalHttpUrl(body.attachmentUrl)) {
    return NextResponse.json({ error: "Allegato non valido." }, { status: 400 });
  }
  const item = await createOrder(guard.session.user.companyId, {
    quoteId,
    tripId,
    customerId,
    customerName,
    customerEmail: body.customerEmail ? String(body.customerEmail) : null,
    pickup,
    delivery,
    goods: body.goods ? String(body.goods) : null,
    weightKg: Number(body.weightKg ?? 0),
    volumeM3: Number(body.volumeM3 ?? 0),
    price: Number(body.price ?? 0),
    status: body.status ? String(body.status) : "RICEVUTO",
    notes: body.notes ? String(body.notes) : null,
    attachmentUrl: optionalHttpUrl(body.attachmentUrl),
  });
  return NextResponse.json({ item }, { status: 201 });
}

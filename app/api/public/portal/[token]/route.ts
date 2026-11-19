import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createOrder, getPortalByToken, listPortalOrders } from "@/lib/ops";
import { rateLimit } from "@/lib/rate-limit";
import { optionalHttpUrl } from "@/lib/url-safety";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const portal = await getPortalByToken(token);
  if (!portal) return NextResponse.json({ error: "Portale non trovato o disattivato." }, { status: 404 });
  const company = await db.company.findUnique({
    where: { id: portal.companyId },
    select: { ragioneSociale: true, telefono: true },
  });
  return NextResponse.json({
    portal: {
      brandName: portal.brandName || company?.ragioneSociale || "Trasporti",
      brandColor: portal.brandColor,
      companyName: company?.ragioneSociale ?? null,
      phone: company?.telefono ?? null,
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rl = rateLimit(`portal:${token}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Troppe richieste. Riprova tra un minuto." }, { status: 429 });

  const portal = await getPortalByToken(token);
  if (!portal) return NextResponse.json({ error: "Portale non trovato o disattivato." }, { status: 404 });

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
    return NextResponse.json({ error: "Nome, ritiro e consegna sono obbligatori." }, { status: 400 });
  }
  if (body.attachmentUrl && !optionalHttpUrl(body.attachmentUrl)) {
    return NextResponse.json({ error: "Allegato non valido." }, { status: 400 });
  }

  const existing = await listPortalOrders(portal.companyId, 1);
  const recentSame = existing.find(
    (o) =>
      o.customerName.toLowerCase() === customerName.toLowerCase() &&
      Date.now() - new Date(o.createdAt).getTime() < 60_000
  );
  if (recentSame) return NextResponse.json({ item: recentSame, duplicate: true });

  const item = await createOrder(portal.companyId, {
    customerName,
    customerEmail: body.customerEmail ? String(body.customerEmail) : null,
    pickup,
    delivery,
    goods: body.goods ? String(body.goods) : null,
    weightKg: Number(body.weightKg ?? 0),
    volumeM3: Number(body.volumeM3 ?? 0),
    status: "RICEVUTO",
    notes: body.notes ? String(body.notes) : null,
    attachmentUrl: optionalHttpUrl(body.attachmentUrl),
  });
  return NextResponse.json({ item }, { status: 201 });
}

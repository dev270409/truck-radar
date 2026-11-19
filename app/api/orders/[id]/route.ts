import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { updateOrder } from "@/lib/ops";
import { tripBelongsToCompany } from "@/lib/tenant-refs";

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
  const tripId = body.tripId === undefined ? undefined : body.tripId ? String(body.tripId) : null;
  if (tripId && !(await tripBelongsToCompany(guard.session.user.companyId, tripId))) {
    return NextResponse.json({ error: "Viaggio non trovato." }, { status: 404 });
  }
  const item = await updateOrder(guard.session.user.companyId, id, {
    status: body.status ? String(body.status) : undefined,
    tripId,
    price: body.price === undefined ? undefined : Number(body.price),
    notes: body.notes === undefined ? undefined : body.notes ? String(body.notes) : null,
  });
  if (!item) return NextResponse.json({ error: "Ordine non trovato." }, { status: 404 });
  return NextResponse.json({ item });
}

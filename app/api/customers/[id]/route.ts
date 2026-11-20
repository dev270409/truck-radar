import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import {
  deleteCustomer,
  getCustomer,
  listCustomerAddresses,
  updateCustomer,
} from "@/lib/ops";
import { parseCustomerPayload } from "@/lib/customer-input";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireFeature("clients");
  if (guard.error) return guard.error;

  const { id } = await params;
  const item = await getCustomer(guard.session.user.companyId, id);
  if (!item) return NextResponse.json({ error: "Anagrafica non trovata." }, { status: 404 });

  const addresses = await listCustomerAddresses(guard.session.user.companyId, id);
  return NextResponse.json({ item, addresses });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireFeature("clients");
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

  const parsed = parseCustomerPayload(body, { partial: true });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const item = await updateCustomer(guard.session.user.companyId, id, parsed.data);
  if (!item) return NextResponse.json({ error: "Anagrafica non trovata." }, { status: 404 });
  return NextResponse.json({ item });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireFeature("clients");
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  const { id } = await params;
  const result = await deleteCustomer(guard.session.user.companyId, id);
  if (result.quotes > 0 || result.orders > 0) {
    const usi = [
      result.quotes > 0 ? `${result.quotes} preventiv${result.quotes === 1 ? "o" : "i"}` : null,
      result.orders > 0 ? `${result.orders} ordin${result.orders === 1 ? "e" : "i"}` : null,
    ]
      .filter(Boolean)
      .join(" e ");
    return NextResponse.json(
      { error: `Anagrafica collegata a ${usi}: non può essere eliminata.` },
      { status: 409 }
    );
  }
  if (!result.deleted) {
    return NextResponse.json({ error: "Anagrafica non trovata." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

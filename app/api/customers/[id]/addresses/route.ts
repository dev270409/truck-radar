import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { createCustomerAddress, listCustomerAddresses } from "@/lib/ops";
import { parseCustomerAddressPayload } from "@/lib/customer-input";
import { customerBelongsToCompany } from "@/lib/tenant-refs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireFeature("clients");
  if (guard.error) return guard.error;

  const { id } = await params;
  if (!(await customerBelongsToCompany(guard.session.user.companyId, id))) {
    return NextResponse.json({ error: "Anagrafica non trovata." }, { status: 404 });
  }
  const items = await listCustomerAddresses(guard.session.user.companyId, id);
  return NextResponse.json({ items });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireFeature("clients");
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  const { id } = await params;
  if (!(await customerBelongsToCompany(guard.session.user.companyId, id))) {
    return NextResponse.json({ error: "Anagrafica non trovata." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const parsed = parseCustomerAddressPayload(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const item = await createCustomerAddress(guard.session.user.companyId, id, parsed.data);
  return NextResponse.json({ item }, { status: 201 });
}

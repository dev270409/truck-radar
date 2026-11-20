import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { createCustomer, listCustomers } from "@/lib/ops";
import { parseCustomerPayload } from "@/lib/customer-input";

export async function GET(req: Request) {
  const guard = await requireFeature("clients");
  if (guard.error) return guard.error;

  const url = new URL(req.url);
  const typeParam = url.searchParams.get("type")?.toUpperCase();
  const type = typeParam === "FORNITORE" ? "FORNITORE" : typeParam === "CLIENTE" ? "CLIENTE" : null;
  const q = url.searchParams.get("q");

  const items = await listCustomers(guard.session.user.companyId, { type, q });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const guard = await requireFeature("clients");
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

  const parsed = parseCustomerPayload(body, { partial: false });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (!parsed.data.name) {
    return NextResponse.json({ error: "Il nome è obbligatorio." }, { status: 400 });
  }

  const item = await createCustomer(guard.session.user.companyId, {
    ...parsed.data,
    name: parsed.data.name,
  });
  return NextResponse.json({ item }, { status: 201 });
}

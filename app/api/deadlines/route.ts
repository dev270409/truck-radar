import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import {
  createCompanyDeadline,
  createDriverDocument,
  deleteCompanyDeadline,
  deleteDriverDocument,
  listCompanyDeadlines,
  listDriverDocuments,
} from "@/lib/ops";
import { userBelongsToCompany } from "@/lib/tenant-refs";
import { optionalHttpUrl } from "@/lib/url-safety";

export async function GET(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  if (guard.session.user.role !== "ADMIN" && guard.session.user.role !== "UFFICIO") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }
  const scope = new URL(req.url).searchParams.get("scope") === "company" ? "company" : "driver";
  if (scope === "company") {
    const items = await listCompanyDeadlines(guard.session.user.companyId);
    return NextResponse.json({ scope, items });
  }
  const items = await listDriverDocuments(guard.session.user.companyId);
  return NextResponse.json({ scope, items });
}

export async function POST(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  if (guard.session.user.role !== "ADMIN" && guard.session.user.role !== "UFFICIO") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }
  const scope = body.scope === "company" ? "company" : "driver";
  const tipo = String(body.tipo ?? "").trim();
  const dataScadenza = String(body.dataScadenza ?? "").trim();
  if (!tipo || !dataScadenza) {
    return NextResponse.json({ error: "Tipo e data di scadenza sono obbligatori." }, { status: 400 });
  }
  if (scope === "company") {
    const item = await createCompanyDeadline(guard.session.user.companyId, {
      tipo,
      dataScadenza,
      note: body.note ? String(body.note) : null,
    });
    return NextResponse.json({ item }, { status: 201 });
  }
  const userId = String(body.userId ?? "").trim();
  if (!userId) return NextResponse.json({ error: "Selezionare un autista." }, { status: 400 });
  if (!(await userBelongsToCompany(guard.session.user.companyId, userId))) {
    return NextResponse.json({ error: "Autista non trovato." }, { status: 404 });
  }
  if (body.fileUrl && !optionalHttpUrl(body.fileUrl)) {
    return NextResponse.json({ error: "File documento non valido." }, { status: 400 });
  }
  const item = await createDriverDocument(guard.session.user.companyId, {
    userId,
    tipo,
    dataScadenza,
    fileUrl: optionalHttpUrl(body.fileUrl),
    note: body.note ? String(body.note) : null,
  });
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  if (guard.session.user.role !== "ADMIN" && guard.session.user.role !== "UFFICIO") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const scope = url.searchParams.get("scope") === "company" ? "company" : "driver";
  if (!id) return NextResponse.json({ error: "Scadenza mancante." }, { status: 400 });
  const ok =
    scope === "company"
      ? await deleteCompanyDeadline(guard.session.user.companyId, id)
      : await deleteDriverDocument(guard.session.user.companyId, id);
  if (!ok) return NextResponse.json({ error: "Scadenza non trovata." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

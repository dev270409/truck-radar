import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { db } from "@/lib/db";
import { getTenantDb } from "@/lib/tenant";
import {
  createDocumentInbox,
  isDocInboxType,
  listDocumentInbox,
} from "@/lib/doc-inbox";

export async function GET(req: Request) {
  const guard = await requireFeature("documents");
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  const status = new URL(req.url).searchParams.get("status");
  const items = await listDocumentInbox(guard.session.user.companyId, status);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const guard = await requireFeature("documents");
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

  const fileName = String(body.fileName ?? "").trim();
  const fileUrl = String(body.fileUrl ?? "").trim();
  if (!fileName) {
    return NextResponse.json({ error: "Nome file mancante." }, { status: 400 });
  }
  if (!fileUrl || !/^https?:\/\//i.test(fileUrl)) {
    return NextResponse.json({ error: "File non valido: inserire un URL valido." }, { status: 400 });
  }

  const docType = body.docType ? String(body.docType) : null;
  if (docType && !isDocInboxType(docType.toUpperCase().replace(/\s+/g, "_"))) {
    return NextResponse.json({ error: "Tipo documento non valido." }, { status: 400 });
  }

  const tripId = body.tripId ? String(body.tripId) : null;
  const vehicleId = body.vehicleId ? String(body.vehicleId) : null;
  const tenantDb = getTenantDb(guard.session.user.companyId);

  if (tripId) {
    const trip = await tenantDb.trips.findFirst({ where: { id: tripId } });
    if (!trip) return NextResponse.json({ error: "Viaggio non trovato." }, { status: 404 });
  }
  if (vehicleId) {
    const vehicle = await tenantDb.vehicles.findFirst({ where: { id: vehicleId } });
    if (!vehicle) return NextResponse.json({ error: "Mezzo non trovato." }, { status: 404 });
  }

  const rawDate = body.docDate ? String(body.docDate) : "";
  const docDate = rawDate ? new Date(rawDate) : null;
  if (docDate && Number.isNaN(docDate.getTime())) {
    return NextResponse.json({ error: "Data documento non valida." }, { status: 400 });
  }

  const amount =
    body.amount === undefined || body.amount === null || body.amount === ""
      ? null
      : Number(body.amount);
  if (amount !== null && !Number.isFinite(amount)) {
    return NextResponse.json({ error: "Importo non valido." }, { status: 400 });
  }

  const fileSize =
    body.fileSize === undefined || body.fileSize === null || body.fileSize === ""
      ? null
      : Number(body.fileSize);

  try {
    const item = await createDocumentInbox({
      companyId: guard.session.user.companyId,
      source: "UPLOAD",
      fileName,
      fileUrl,
      mimeType: body.mimeType ? String(body.mimeType) : null,
      fileSize: fileSize !== null && Number.isFinite(fileSize) ? fileSize : null,
      docType,
      docNumber: body.docNumber ? String(body.docNumber) : null,
      docDate: docDate ? docDate.toISOString() : null,
      amount,
      customerName: body.customerName ? String(body.customerName) : null,
      tripId,
      vehicleId,
      notes: body.notes ? String(body.notes) : null,
      createdBy: guard.session.user.id,
    });

    await db.auditLog.create({
      data: {
        userId: guard.session.user.id,
        companyId: guard.session.user.companyId,
        action: "DOCUMENT_INBOX_CREATED",
        entity: "DocumentInbox",
        entityId: item.id,
        payload: { fileName, docType: item.docType, status: item.status },
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

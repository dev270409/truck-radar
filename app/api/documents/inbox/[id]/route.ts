import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { db } from "@/lib/db";
import { getTenantDb } from "@/lib/tenant";
import {
  deleteDocumentInbox,
  deriveInboxStatus,
  getDocumentInbox,
  isDocInboxStatus,
  isDocInboxType,
  normalizeDocType,
  updateDocumentInbox,
} from "@/lib/doc-inbox";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireFeature("documents");
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getDocumentInbox(guard.session.user.companyId, id);
  if (!existing) {
    return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const tenantDb = getTenantDb(guard.session.user.companyId);
  const nextTripId =
    body.tripId === undefined ? existing.tripId : body.tripId ? String(body.tripId) : null;
  const nextVehicleId =
    body.vehicleId === undefined ? existing.vehicleId : body.vehicleId ? String(body.vehicleId) : null;

  if (body.tripId !== undefined && nextTripId) {
    const trip = await tenantDb.trips.findFirst({ where: { id: nextTripId } });
    if (!trip) return NextResponse.json({ error: "Viaggio non trovato." }, { status: 404 });
  }
  if (body.vehicleId !== undefined && nextVehicleId) {
    const vehicle = await tenantDb.vehicles.findFirst({ where: { id: nextVehicleId } });
    if (!vehicle) return NextResponse.json({ error: "Mezzo non trovato." }, { status: 404 });
  }

  const nextDocType =
    body.docType === undefined ? existing.docType : normalizeDocType(body.docType);
  if (nextDocType && !isDocInboxType(nextDocType)) {
    return NextResponse.json({ error: "Tipo documento non valido." }, { status: 400 });
  }

  let nextStatus: string | undefined;
  if (body.status !== undefined) {
    const status = String(body.status).toUpperCase();
    if (!isDocInboxStatus(status)) {
      return NextResponse.json({ error: "Stato documento non valido." }, { status: 400 });
    }
    nextStatus = status;
  } else {
    nextStatus = deriveInboxStatus({
      docType: nextDocType,
      tripId: nextTripId,
      vehicleId: nextVehicleId,
      customerName:
        body.customerName === undefined
          ? existing.customerName
          : body.customerName
            ? String(body.customerName)
            : null,
      currentStatus: existing.status,
    });
  }

  let docDate: string | null | undefined;
  if (body.docDate !== undefined) {
    if (body.docDate === null || body.docDate === "") {
      docDate = null;
    } else {
      const parsed = new Date(String(body.docDate));
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Data documento non valida." }, { status: 400 });
      }
      docDate = parsed.toISOString();
    }
  }

  let amount: number | null | undefined;
  if (body.amount !== undefined) {
    if (body.amount === null || body.amount === "") {
      amount = null;
    } else {
      const parsed = Number(body.amount);
      if (!Number.isFinite(parsed)) {
        return NextResponse.json({ error: "Importo non valido." }, { status: 400 });
      }
      amount = parsed;
    }
  }

  const item = await updateDocumentInbox(guard.session.user.companyId, id, {
    status: nextStatus,
    docType: body.docType === undefined ? undefined : nextDocType,
    docNumber:
      body.docNumber === undefined
        ? undefined
        : body.docNumber
          ? String(body.docNumber)
          : null,
    docDate,
    amount,
    customerName:
      body.customerName === undefined
        ? undefined
        : body.customerName
          ? String(body.customerName)
          : null,
    tripId: body.tripId === undefined ? undefined : nextTripId,
    vehicleId: body.vehicleId === undefined ? undefined : nextVehicleId,
    notes: body.notes === undefined ? undefined : body.notes ? String(body.notes) : null,
  });

  if (!item) {
    return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
  }

  await db.auditLog.create({
    data: {
      userId: guard.session.user.id,
      companyId: guard.session.user.companyId,
      action: "DOCUMENT_INBOX_UPDATED",
      entity: "DocumentInbox",
      entityId: item.id,
      payload: { status: item.status, docType: item.docType, tripId: item.tripId, vehicleId: item.vehicleId },
    },
  });

  return NextResponse.json({ item });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireFeature("documents");
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  const { id } = await params;
  const ok = await deleteDocumentInbox(guard.session.user.companyId, id);
  if (!ok) return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });

  await db.auditLog.create({
    data: {
      userId: guard.session.user.id,
      companyId: guard.session.user.companyId,
      action: "DOCUMENT_INBOX_DELETED",
      entity: "DocumentInbox",
      entityId: id,
      payload: {},
    },
  });

  return NextResponse.json({ ok: true });
}

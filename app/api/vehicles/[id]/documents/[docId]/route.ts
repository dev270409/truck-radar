import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getTenantDb } from "@/lib/tenant";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "UFFICIO") {
    return NextResponse.json(
      { error: "Solo l'Admin (o Ufficio) può eliminare i documenti." },
      { status: 403 }
    );
  }

  const { id, docId } = await params;
  const tenantDb = getTenantDb(session.user.companyId);
  const vehicle = await tenantDb.vehicles.findFirst({ where: { id, companyId: session.user.companyId } });
  if (!vehicle) {
    return NextResponse.json({ error: "Veicolo non trovato." }, { status: 404 });
  }

  const document = await db.vehicleDocument.findFirst({
    where: { id: docId, vehicleId: vehicle.id },
  });
  if (!document) {
    return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
  }

  await db.vehicleDocument.deleteMany({
    where: { id: docId, vehicleId: vehicle.id },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: session.user.companyId,
      action: "VEHICLE_DOCUMENT_REMOVED",
      entity: "VehicleDocument",
      entityId: document.id,
      payload: { vehicleId: vehicle.id, targa: vehicle.targa, tipo: document.tipo },
    },
  });

  return NextResponse.json({ ok: true });
}
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getTenantDb } from "@/lib/tenant";
import type { VehicleDocType } from "@prisma/client";

const DOC_TYPES = ["ASSICURAZIONE", "REVISIONE", "TAGLIANDO", "BOLLO"];

const isAdminRole = (role: string) => role === "ADMIN" || role === "UFFICIO";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await params;
  const tenantDb = getTenantDb(session.user.companyId);
  const vehicle = await tenantDb.vehicles.findFirst({ where: { id, companyId: session.user.companyId } });
  if (!vehicle) {
    return NextResponse.json({ error: "Veicolo non trovato." }, { status: 404 });
  }

  const documents = await db.vehicleDocument.findMany({
    where: { vehicleId: vehicle.id },
    orderBy: { dataScadenza: "asc" },
  });

  return NextResponse.json({ documents });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (!isAdminRole(session.user.role as string)) {
    return NextResponse.json(
      { error: "Solo l'Admin (o Ufficio) può gestire i documenti." },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const tenantDb = getTenantDb(session.user.companyId);
    const vehicle = await tenantDb.vehicles.findFirst({ where: { id, companyId: session.user.companyId } });
    if (!vehicle) {
      return NextResponse.json({ error: "Veicolo non trovato." }, { status: 404 });
    }

    const body = await req.json();
    const tipo = String(body.tipo ?? "").toUpperCase();
    const dataScadenza = body.dataScadenza;

    if (!DOC_TYPES.includes(tipo)) {
      return NextResponse.json({ error: "Tipo documento non valido." }, { status: 400 });
    }
    if (!dataScadenza || isNaN(new Date(dataScadenza).getTime())) {
      return NextResponse.json({ error: "Data di scadenza obbligatoria e valida." }, { status: 400 });
    }

    const document = await db.vehicleDocument.create({
      data: {
        vehicleId: vehicle.id,
        tipo: tipo as VehicleDocType,
        dataScadenza: new Date(dataScadenza),
        fileUrl: body.fileUrl ? String(body.fileUrl) : null,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: session.user.companyId,
        action: "VEHICLE_DOCUMENT_ADDED",
        entity: "VehicleDocument",
        entityId: document.id,
        payload: { vehicleId: vehicle.id, targa: vehicle.targa, tipo },
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
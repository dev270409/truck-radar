import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { db } from "@/lib/db";
import { safeLog } from "@/lib/safe-log";

const CATEGORIES = ["FRIGO", "TELONATO", "SPONDA_IDRAULICA", "CISTERNA", "ADR"];
const STATUSES = ["DISPONIBILE", "IN_VIAGGIO", "IN_MANUTENZIONE", "NON_IDONEO"];

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

  // STRICT MULTI-TENANCY FILTER: where clause incorporates both vehicle id AND companyId
  const vehicle = await tenantDb.vehicles.findFirst({
    where: {
      id,
      companyId: session.user.companyId,
    },
    include: {
      documents: true,
      drivers: { select: { id: true, nome: true, cognome: true, email: true } },
    },
  });

  if (!vehicle) {
    return NextResponse.json(
      { error: "Veicolo non trovato o non appartenente alla tua azienda (404/403)." },
      { status: 404 }
    );
  }

  return NextResponse.json({ vehicle });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "UFFICIO") {
    return NextResponse.json({ error: "Solo Admin o Ufficio possono modificare i mezzi." }, { status: 403 });
  }

  const { id } = await params;
  const tenantDb = getTenantDb(session.user.companyId);
  const existing = await tenantDb.vehicles.findFirst({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Veicolo non trovato." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.targa === "string" && body.targa.trim()) {
    const cleanTarga = body.targa.trim().toUpperCase();
    const normalized = cleanTarga.replace(/[^A-Z0-9]/g, "");
    const samePlate = await tenantDb.vehicles.findMany({ select: { id: true, targa: true } });
    if (samePlate.some((v) => v.id !== id && v.targa.toUpperCase().replace(/[^A-Z0-9]/g, "") === normalized)) {
      return NextResponse.json({ error: "Un altro mezzo della flotta ha già questa targa." }, { status: 409 });
    }
    data.targa = cleanTarga;
  }
  if (typeof body.categoria === "string") {
    if (!CATEGORIES.includes(body.categoria)) {
      return NextResponse.json({ error: "Categoria non valida." }, { status: 400 });
    }
    data.categoria = body.categoria;
  }
  if (body.portataMaxKg !== undefined) {
    const value = Number(body.portataMaxKg);
    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ error: "Portata non valida." }, { status: 400 });
    }
    data.portataMaxKg = value;
  }
  if (body.volumeMaxM3 !== undefined) {
    const value = Number(body.volumeMaxM3);
    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ error: "Volume non valido." }, { status: 400 });
    }
    data.volumeMaxM3 = value;
  }
  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Stato non valido." }, { status: 400 });
    }
    data.status = body.status;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nessun campo da aggiornare." }, { status: 400 });
  }

  try {
    const vehicle = await db.vehicle.update({
      where: { id },
      data,
    });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: session.user.companyId,
        action: "VEHICLE_UPDATED",
        entity: "Vehicle",
        entityId: id,
        payload: { fields: Object.keys(data) },
      },
    });
    return NextResponse.json({ vehicle });
  } catch (error: unknown) {
    safeLog("error", "Aggiornamento veicolo fallito", { message: error instanceof Error ? error.message : "errore" });
    return NextResponse.json({ error: "Errore nell'aggiornamento del mezzo." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo l'Admin può eliminare un mezzo." }, { status: 403 });
  }

  const { id } = await params;
  const tenantDb = getTenantDb(session.user.companyId);
  const existing = await tenantDb.vehicles.findFirst({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Veicolo non trovato." }, { status: 404 });
  }

  // Non eliminare un mezzo collegato a viaggi: rischio di perdita di storico.
  const trips = await tenantDb.trips.findMany({ where: { vehicleId: id }, select: { id: true } });
  if (trips.length > 0) {
    return NextResponse.json(
      { error: `Impossibile eliminare: il mezzo è collegato a ${trips.length} viaggi. Disattivalo impostando lo stato su NON_IDONEO.` },
      { status: 409 }
    );
  }

  try {
    await db.vehicle.delete({ where: { id } });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: session.user.companyId,
        action: "VEHICLE_DELETED",
        entity: "Vehicle",
        entityId: id,
        payload: { targa: existing.targa },
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    safeLog("error", "Eliminazione veicolo fallita", { message: error instanceof Error ? error.message : "errore" });
    return NextResponse.json({ error: "Errore nell'eliminazione del mezzo." }, { status: 500 });
  }
}

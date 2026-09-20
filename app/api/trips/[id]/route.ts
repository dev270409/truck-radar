import { NextResponse } from "next/server";
import type { TripStatus } from "@prisma/client";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { db } from "@/lib/db";

const TRIP_STATUSES = [
  "DA_ASSEGNARE",
  "ASSEGNATO",
  "IN_CORSO",
  "COMPLETATO",
  "ANNULLATO",
  "SUBAPPALTATO",
] as const;

const tripIncludes = {
  vehicle: { select: { id: true, targa: true, categoria: true, portataMaxKg: true, volumeMaxM3: true } },
  driver: { select: { id: true, nome: true, cognome: true, email: true } },
  events: { orderBy: { createdAt: "desc" as const } },
} as const;

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
  const trip = await tenantDb.trips.findFirst({
    where: { id },
    include: tripIncludes,
  });

  if (!trip) {
    return NextResponse.json({ error: "Viaggio non trovato." }, { status: 404 });
  }

  return NextResponse.json({ trip });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (!isAdminRole(session.user.role as string)) {
    return NextResponse.json(
      { error: "Solo l'Admin (o Ufficio) può modificare i viaggi." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const tenantDb = getTenantDb(session.user.companyId);

  const existing = await tenantDb.trips.findFirst({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Viaggio non trovato." }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.luogoRitiro !== undefined) data.luogoRitiro = String(body.luogoRitiro).trim();
    if (body.luogoConsegna !== undefined) data.luogoConsegna = String(body.luogoConsegna).trim();
    if (body.tipoMerce !== undefined) data.tipoMerce = String(body.tipoMerce).trim();
    if (body.cliente !== undefined) data.cliente = body.cliente ? String(body.cliente).trim() : null;
    if (body.note !== undefined) data.note = body.note ? String(body.note).trim() : null;
    if (body.dataRitiro !== undefined) data.dataRitiro = new Date(body.dataRitiro);
    if (body.dataConsegna !== undefined) data.dataConsegna = new Date(body.dataConsegna);
    if (body.pesoKg !== undefined) data.pesoKg = parseFloat(body.pesoKg);
    if (body.volumeM3 !== undefined) data.volumeM3 = parseFloat(body.volumeM3);
    if (body.prezzo !== undefined && body.prezzo !== "") data.prezzo = parseFloat(body.prezzo);
    if (body.costo !== undefined && body.costo !== "") data.costo = parseFloat(body.costo);

    if (body.vehicleId !== undefined) {
      if (body.vehicleId) {
        const v = await tenantDb.vehicles.findFirst({ where: { id: body.vehicleId } });
        if (!v) {
          return NextResponse.json({ error: "Veicolo non trovato nella tua azienda." }, { status: 404 });
        }
      }
      data.vehicleId = body.vehicleId || null;
    }

    if (body.driverId !== undefined) {
      if (body.driverId) {
        const d = await tenantDb.users.findFirst({
          where: { id: body.driverId, role: "AUTISTA" },
        });
        if (!d) {
          return NextResponse.json({ error: "Autista non trovato nella tua azienda." }, { status: 404 });
        }
      }
      data.driverId = body.driverId || null;
    }

    let nextStatus: (typeof TRIP_STATUSES)[number] | undefined;
    if (body.status !== undefined) {
      if (!TRIP_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Stato del viaggio non valido." }, { status: 400 });
      }
      nextStatus = body.status;
    } else if (
      (data.vehicleId !== undefined && data.driverId !== undefined) &&
      existing.status === "DA_ASSEGNARE"
    ) {
      nextStatus = data.vehicleId && data.driverId ? "ASSEGNATO" : existing.status;
    }

    if (nextStatus && nextStatus !== existing.status) {
      data.status = nextStatus;
    }

    if (new Date(data.dataConsegna as Date) < new Date(data.dataRitiro as Date)) {
      return NextResponse.json(
        { error: "La data di consegna non può precedere la data di ritiro." },
        { status: 400 }
      );
    }

    const eventNote = body.eventNote ? String(body.eventNote).trim() : null;
    const statusChanged = data.status !== undefined && data.status !== existing.status;

    const trip = await db.$transaction(
      async (tx) => {
        const res = await tx.trip.updateMany({
          where: { id: existing.id, companyId: session.user.companyId },
          data,
        });
        if (res.count === 0) {
          throw new Error("TRIP_UPDATE_FAILED");
        }
        if (statusChanged) {
          await tx.tripEvent.create({
            data: {
              tripId: existing.id,
              fromStatus: existing.status,
              toStatus: data.status as TripStatus,
              changedBy: session.user.id!,
              note: eventNote,
            },
          });
        }
        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            companyId: session.user.companyId,
            action: statusChanged ? "TRIP_STATUS_CHANGED" : "TRIP_UPDATED",
            entity: "Trip",
            entityId: existing.id,
            payload: { from: existing.status, to: data.status ?? existing.status, fields: Object.keys(data) },
          },
        });
        return tx.trip.findFirst({
          where: { id: existing.id },
          include: tripIncludes,
        });
      },
      { timeout: 30000 }
    );

    if (!trip) {
      return NextResponse.json({ error: "Viaggio non trovato." }, { status: 404 });
    }
    return NextResponse.json({ trip });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json(
      { error: msg === "TRIP_UPDATE_FAILED" ? "Viaggio non trovato." : msg },
      { status: msg === "TRIP_UPDATE_FAILED" ? 404 : 500 }
    );
  }
}
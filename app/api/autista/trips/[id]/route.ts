import { NextResponse } from "next/server";
import type { TripStatus } from "@prisma/client";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { db } from "@/lib/db";

const tripIncludes = {
  vehicle: { select: { id: true, targa: true, categoria: true, portataMaxKg: true, volumeMaxM3: true } },
  events: { orderBy: { createdAt: "desc" as const } },
} as const;

const requireDriverSession = async () => {
  const session = await auth();
  if (!session?.user?.companyId) {
    return { error: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }) };
  }
  if (session.user.role !== "AUTISTA") {
    return { error: NextResponse.json({ error: "Portale riservato agli autisti." }, { status: 403 }) };
  }
  return { session };
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDriverSession();
  if (guard.error) return guard.error;
  const session = guard.session!;

  const { id } = await params;
  const tenantDb = getTenantDb(session.user.companyId);
  const trip = await tenantDb.trips.findFirst({
    where: { id, driverId: session.user.id },
    include: tripIncludes,
  });

  if (!trip) {
    return NextResponse.json(
      { error: "Viaggio non trovato o non assegnato a te." },
      { status: 404 }
    );
  }

  return NextResponse.json({ trip });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDriverSession();
  if (guard.error) return guard.error;
  const session = guard.session!;

  const { id } = await params;
  const tenantDb = getTenantDb(session.user.companyId);

  const existing = await tenantDb.trips.findFirst({
    where: { id, driverId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Viaggio non trovato o non assegnato a te." },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const toStatus = String(body.status ?? "");

    if (toStatus !== "IN_CORSO" && toStatus !== "COMPLETATO") {
      return NextResponse.json(
        { error: "Transizione non consentita all'autista." },
        { status: 400 }
      );
    }

    const allowedNext =
      existing.status === "ASSEGNATO"
        ? "IN_CORSO"
        : existing.status === "IN_CORSO"
          ? "COMPLETATO"
          : null;

    if (!allowedNext || allowedNext !== toStatus) {
      return NextResponse.json(
        {
          error: `Transizione non valida dallo stato attuale (${existing.status}).`,
        },
        { status: 400 }
      );
    }

    const eventNote = body.eventNote ? String(body.eventNote).trim() : null;

    const trip = await db.$transaction(
      async (tx) => {
        const res = await tx.trip.updateMany({
          where: {
            id: existing.id,
            companyId: session.user.companyId,
            driverId: session.user.id,
          },
          data: { status: toStatus as TripStatus },
        });
        if (res.count === 0) {
          throw new Error("TRIP_UPDATE_FAILED");
        }

        await tx.tripEvent.create({
          data: {
            tripId: existing.id,
            fromStatus: existing.status,
            toStatus: toStatus as TripStatus,
            changedBy: session.user.id!,
            note: eventNote,
          },
        });

        if (existing.vehicleId) {
          await tx.vehicle.updateMany({
            where: { id: existing.vehicleId, companyId: session.user.companyId },
            data: { status: toStatus === "IN_CORSO" ? "IN_VIAGGIO" : "DISPONIBILE" },
          });
        }

        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            companyId: session.user.companyId,
            action: "TRIP_STATUS_CHANGED",
            entity: "Trip",
            entityId: existing.id,
            payload: { from: existing.status, to: toStatus, by: "AUTISTA" },
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
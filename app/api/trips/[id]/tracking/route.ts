import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { db } from "@/lib/db";
import { listTrackingEvents, createTrackingEvent } from "@/lib/raw-tables";

const TRACKING_TIPI = ["POSIZIONE", "CARICO", "SOSTA", "SCARICO", "STATO_CONSEGNA"] as const;

const requireSession = async () => {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return { error: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }) };
  }
  return { session };
};

const guardTrip = async (
  session: { user: { id?: string | null; companyId?: string | null; role?: string | null } },
  tripId: string
) => {
  const tenantDb = getTenantDb(session.user.companyId!);
  if (session.user.role === "AUTISTA") {
    return tenantDb.trips.findFirst({ where: { id: tripId, driverId: session.user.id! } });
  }
  return tenantDb.trips.findFirst({ where: { id: tripId } });
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const session = guard.session!;

  const { id } = await params;
  const trip = await guardTrip(session as never, id);
  if (!trip) {
    return NextResponse.json({ error: "Viaggio non trovato o non accessibile." }, { status: 404 });
  }

  const events = await listTrackingEvents(session.user.companyId, id);
  return NextResponse.json({ events });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const session = guard.session!;

  if (session.user.role !== "AUTISTA") {
    return NextResponse.json(
      { error: "Il tracking può essere aggiornato solo dall'autista del viaggio." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const trip = await guardTrip(session as never, id);
  if (!trip) {
    return NextResponse.json({ error: "Viaggio non trovato o non assegnato a te." }, { status: 404 });
  }

  if (trip.status !== "IN_CORSO") {
    return NextResponse.json(
      { error: "Il tracking è disponibile solo per viaggi in corso." },
      { status: 400 }
    );
  }

  let body: { eventType?: unknown; posizione?: unknown; note?: unknown; lat?: unknown; lng?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const eventType = String(body.eventType ?? "").toUpperCase();
  const posizione = body.posizione ? String(body.posizione).trim() : null;
  const note = body.note ? String(body.note).trim() : null;
  const lat = body.lat != null && body.lat !== "" ? Number(body.lat) : null;
  const lng = body.lng != null && body.lng !== "" ? Number(body.lng) : null;

  if (!TRACKING_TIPI.includes(eventType as (typeof TRACKING_TIPI)[number])) {
    return NextResponse.json(
      { error: `Tipo tracking non valido (attesi: ${TRACKING_TIPI.join(", ")})` },
      { status: 400 }
    );
  }
  if (lat != null && (isNaN(lat) || lat < -90 || lat > 90)) {
    return NextResponse.json({ error: "Latitudine non valida." }, { status: 400 });
  }
  if (lng != null && (isNaN(lng) || lng < -180 || lng > 180)) {
    return NextResponse.json({ error: "Longitudine non valida." }, { status: 400 });
  }

  try {
    const event = await createTrackingEvent({
      tripId: id,
      companyId: session.user.companyId,
      eventType: eventType as string,
      lat,
      lng,
      posizione,
      note,
      createdBy: session.user.id,
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: session.user.companyId,
        action: "TRACKING_EVENT_CREATED",
        entity: "TrackingEvent",
        entityId: event.id,
        payload: { tripId: id, eventType, posizione },
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
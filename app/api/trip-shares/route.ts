import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { listTripShares, createTripShare, setTripShareEnabled, deleteTripShare } from "@/lib/trip-share";

const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return { error: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Accesso riservato all'amministratore." }, { status: 403 }) };
  }
  return { session };
};

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const session = guard.session!;

  const url = new URL(req.url);
  const tripId = String(url.searchParams.get("tripId") ?? "").trim();

  const shares = await listTripShares(session.user.companyId, tripId || undefined);

  const rows = [];
  for (const s of shares) {
    const trips = (await db.$queryRawUnsafe(
      `SELECT id, "luogoRitiro", "luogoConsegna", status FROM "Trip" WHERE id = $1 AND "companyId" = $2`,
      s.tripId,
      session.user.companyId
    )) as Array<{ id: string; luogoRitiro: string; luogoConsegna: string; status: string }>;
    const trip = trips[0] ?? null;
    rows.push({
      id: s.id,
      tripId: s.tripId,
      token: s.token,
      enabled: s.enabled,
      note: s.note,
      createdAt: s.createdAt,
      url: trip
        ? `https://www.truck-radar.it/tracking/${s.token}`
        : `http://localhost:3000/tracking/${s.token}`,
      trip: trip
        ? `${trip.luogoRitiro} → ${trip.luogoConsegna} · ${trip.status.replace("_", " ")}`
        : "Viaggio non più accessibile",
    });
  }

  return NextResponse.json({ shares: rows });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const session = guard.session!;

  let body: { tripId?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo non valido." }, { status: 400 });
  }

  const tripId = String(body.tripId ?? "").trim();
  if (!tripId) {
    return NextResponse.json({ error: "tripId obbligatorio." }, { status: 400 });
  }

  const trip = await db.trip.findFirst({
    where: { id: tripId, companyId: session.user.companyId },
  });
  if (!trip) {
    return NextResponse.json({ error: "Viaggio non trovato." }, { status: 404 });
  }

  const note = body.note ? String(body.note).trim() : null;
  const share = await createTripShare({
    tripId,
    companyId: session.user.companyId,
    note,
    createdBy: session.user.id,
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: session.user.companyId,
      action: "TRIP_SHARE_CREATED",
      entity: "TripShare",
      entityId: share.id,
      payload: { tripId, token: share.token },
    },
  });

  return NextResponse.json(
    { share: { ...share, url: `https://www.truck-radar.it/tracking/${share.token}` } },
    { status: 201 }
  );
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const session = guard.session!;

  let body: { id?: unknown; enabled?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo non valido." }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  const enabled = body.enabled === true;
  if (!id) {
    return NextResponse.json({ error: "id obbligatorio." }, { status: 400 });
  }

  const ok = await setTripShareEnabled(session.user.companyId, id, enabled);
  if (!ok) {
    return NextResponse.json({ error: "Share non trovato." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, enabled });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const session = guard.session!;

  const url = new URL(req.url);
  const id = String(url.searchParams.get("id") ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id obbligatorio." }, { status: 400 });
  }

  const ok = await deleteTripShare(session.user.companyId, id);
  if (!ok) {
    return NextResponse.json({ error: "Share non trovato." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
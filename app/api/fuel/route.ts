import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createFuelLog, listFuelLogs, deleteFuelLog, getFuelStats } from "@/lib/fuel";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return { error: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }) };
  }
  return { session };
}

export async function GET(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const session = guard.session!;

  const url = new URL(req.url);
  const vehicleId = url.searchParams.get("vehicleId") ?? undefined;

  try {
    const items = await listFuelLogs(session.user.companyId, vehicleId);
    const stats = await getFuelStats(session.user.companyId, items);
    return NextResponse.json({ items, stats });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const session = guard.session!;

  if (session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "La registrazione rifornimenti è gestita dalla sede." }, { status: 403 });
  }

  let body: {
    vehicleId?: unknown;
    tripId?: unknown;
    litri?: unknown;
    costo?: unknown;
    odometerKm?: unknown;
    pieno?: unknown;
    luogo?: unknown;
    fornitore?: unknown;
    note?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const vehicleId = String(body.vehicleId ?? "");
  const litri = Number(body.litri);
  const costo = Number(body.costo);
  const odometerKm = Number(body.odometerKm);

  if (!vehicleId || !isFinite(litri) || litri <= 0 || !isFinite(costo) || costo <= 0 || !isFinite(odometerKm) || odometerKm < 0) {
    return NextResponse.json({ error: "Dati rifornimento non validi (litri e costo > 0, odometro ≥ 0)." }, { status: 400 });
  }

  try {
    const item = await createFuelLog(
      session.user.companyId,
      {
        vehicleId,
        tripId: body.tripId ? String(body.tripId) : null,
        litri,
        costo,
        odometerKm,
        pieno: body.pieno !== false,
        luogo: body.luogo ? String(body.luogo).trim() : null,
        fornitore: body.fornitore ? String(body.fornitore).trim() : null,
        note: body.note ? String(body.note).trim() : null,
      },
      session.user.id
    );
    return NextResponse.json({ item }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const session = guard.session!;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Rifornimento mancante." }, { status: 400 });
  }

  try {
    const deleted = await deleteFuelLog(session.user.companyId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Rifornimento non trovato." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
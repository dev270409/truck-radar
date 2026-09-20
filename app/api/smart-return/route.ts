import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { analyzeSmartReturn, saveSmartReturn, cityKm } from "@/lib/smart-return";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Area riservata a ufficio/admin." }, { status: 403 });
  }

  const url = new URL(req.url);
  const tripId = String(url.searchParams.get("tripId") ?? "").trim();

  const tripsList = await db.trip.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      luogoRitiro: true,
      luogoConsegna: true,
      dataRitiro: true,
      status: true,
    },
  });

  if (!tripId) {
    return NextResponse.json({ trips: tripsList });
  }

  try {
    const analysis = await analyzeSmartReturn({ tripId, companyId: session.user.companyId });
    return NextResponse.json({ analysis });
  } catch (error: unknown) {
    const msg = error instanceof Error && error.message === "TripNotFound"
      ? "Viaggio non trovato o non tuo."
      : "Errore dell'analisi.";
    return NextResponse.json({ error: msg }, { status: error instanceof Error && error.message === "TripNotFound" ? 404 : 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Area riservata a ufficio/admin." }, { status: 403 });
  }

  let body: { tripId?: unknown; matchLoadId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo non valido." }, { status: 400 });
  }

  const tripId = String(body.tripId ?? "").trim();
  const matchLoadId = body.matchLoadId ? String(body.matchLoadId) : null;
  if (!tripId) {
    return NextResponse.json({ error: "tripId obbligatorio." }, { status: 400 });
  }

  const trip = await db.trip.findFirst({
    where: { id: tripId, companyId: session.user.companyId },
  });
  if (!trip) {
    return NextResponse.json({ error: "Viaggio non trovato." }, { status: 404 });
  }

  const kmOneWay = cityKm(trip.luogoRitiro, trip.luogoConsegna);
  const ricavoAggiuntivo = matchLoadId ? await loadPrice(matchLoadId) : 0;
  const kmVuotiDopo = matchLoadId ? 0 : kmOneWay;

  const row = await saveSmartReturn({
    companyId: session.user.companyId,
    tripId,
    matchLoadId,
    kmOneWay,
    kmVuotiPrima: kmOneWay,
    kmVuotiDopo,
    ricavoAggiuntivo,
    candidato: !matchLoadId,
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: session.user.companyId,
      action: matchLoadId ? "SMART_RETURN_APPLICATO" : "SMART_RETURN_CANDIDATO",
      entity: "SmartReturn",
      entityId: row.id,
      payload: { tripId, matchLoadId, kmVuotiPrima: kmOneWay, kmVuotiDopo, ricavoAggiuntivo },
    },
  });

  return NextResponse.json({ smart: row }, { status: 201 });
}

async function loadPrice(loadId: string): Promise<number> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT "prezzo" FROM "MarketplaceLoad" WHERE "id" = $1`,
    loadId
  )) as Array<{ prezzo: number | null }>;
  return rows[0]?.prezzo ?? 0;
}
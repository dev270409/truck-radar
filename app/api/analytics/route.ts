import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tripKmMap } from "@/lib/km";
import { listSmartReturns } from "@/lib/smart-return";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Area riservata a ufficio/admin." }, { status: 403 });
  }

  const url = new URL(req.url);
  const scope = String(url.searchParams.get("scope") ?? "veicolo");
  const from = url.searchParams.get("from") ? new Date(String(url.searchParams.get("from"))) : null;
  const to = url.searchParams.get("to") ? new Date(String(url.searchParams.get("to"))) : null;

  if (scope !== "veicolo" && scope !== "autista") {
    return NextResponse.json({ error: "scope deve essere veicolo o autista." }, { status: 400 });
  }
  if ((from && isNaN(from.getTime())) || (to && isNaN(to.getTime()))) {
    return NextResponse.json({ error: "Date non valide." }, { status: 400 });
  }

  const kmMap = await tripKmMap(session.user.companyId);

  const trips = await db.trip.findMany({
    where: {
      companyId: session.user.companyId,
      ...(from && to ? { dataRitiro: { gte: from, lte: to } } : {}),
    },
    include: { vehicle: true, driver: true },
  });

  // km a vuoto evitati v1: smart return applicati sul totale azienda (per veicolo si aggrega via trip)
  const smartReturns = await listSmartReturns(session.user.companyId);
  const evitatiByTrip = new Map<string, number>();
  for (const sr of smartReturns) {
    if (!sr.candidato) {
      evitatiByTrip.set(sr.tripId, Math.max(0, sr.kmVuotiPrima - sr.kmVuotiDopo));
    }
  }

  const events = await db.tripEvent.findMany({
    where: { trip: { companyId: session.user.companyId } },
    select: { tripId: true, changedBy: true, toStatus: true },
  });
  const driverEvents = new Map<string, number>();
  for (const ev of events) {
    if (ev.toStatus === "IN_CORSO" || ev.toStatus === "COMPLETATO") {
      driverEvents.set(ev.changedBy, (driverEvents.get(ev.changedBy) ?? 0) + 1);
    }
  }

  if (scope === "veicolo") {
    const rows = new Map<string, {
      id: string;
      name: string;
      category: string;
      trips: number;
      km: number;
      ricavi: number;
      costi: number;
      margine: number;
      kmEvitati: number;
    }>();

    for (const t of trips) {
      const id = t.vehicleId ?? "NON_ASSOCIATO";
      const cur =
        rows.get(id) ??
        {
          id,
          name: t.vehicle ? `${t.vehicle.targa} (${t.vehicle.categoria})` : "Mezzo non assegnato",
          category: t.vehicle?.categoria ?? "—",
          trips: 0,
          km: 0,
          ricavi: 0,
          costi: 0,
          margine: 0,
          kmEvitati: 0,
        };
      cur.trips += 1;
      cur.km += kmMap.get(t.id) ?? 0;
      cur.ricavi += t.prezzo ?? 0;
      cur.costi += t.costo ?? 0;
      cur.margine += (t.prezzo ?? 0) - (t.costo ?? 0);
      cur.kmEvitati += evitatiByTrip.get(t.id) ?? 0;
      rows.set(id, cur);
    }

    const list = [...rows.values()]
      .map((r) => ({ ...r, marginePct: r.ricavi > 0 ? Math.round((r.margine / r.ricavi) * 100) : 0 }))
      .sort((a, b) => b.km - a.km);

    const tot = list.reduce(
      (acc, r) => ({
        km: acc.km + r.km,
        ricavi: acc.ricavi + r.ricavi,
        margine: acc.margine + r.margine,
        kmEvitati: acc.kmEvitati + r.kmEvitati,
      }),
      { km: 0, ricavi: 0, margine: 0, kmEvitati: 0 }
    );

    return NextResponse.json({ scope, rows: list, totali: tot });
  }

  // scope autista
  const rows = new Map<string, {
    id: string;
    name: string;
    trips: number;
    km: number;
    ricavi: number;
    costi: number;
    margine: number;
    completati: number;
    azioni: number;
  }>();

  for (const t of trips) {
    const driver = t.driver;
    const id = driver?.id ?? "NON_ASSOCIATO";
    const cur =
      rows.get(id) ??
      {
        id,
        name: driver ? `${driver.nome} ${driver.cognome}` : "Autista non assegnato",
        trips: 0,
        km: 0,
        ricavi: 0,
        costi: 0,
        margine: 0,
        completati: 0,
        azioni: 0,
      };
    cur.trips += 1;
    cur.km += kmMap.get(t.id) ?? 0;
    cur.ricavi += t.prezzo ?? 0;
    cur.costi += t.costo ?? 0;
    cur.margine += (t.prezzo ?? 0) - (t.costo ?? 0);
    if (t.status === "COMPLETATO") cur.completati += 1;
    if (driver) cur.azioni += driverEvents.get(driver.id) ?? 0;
    rows.set(id, cur);
  }

  const list = [...rows.values()]
    .map((r) => ({
      ...r,
      puntualitaPct: r.trips > 0 ? Math.round((r.completati / r.trips) * 100) : 0,
    }))
    .sort((a, b) => b.km - a.km);

  const tot = list.reduce(
    (acc, r) => ({ km: acc.km + r.km, ricavi: acc.ricavi + r.ricavi, margine: acc.margine + r.margine }),
    { km: 0, ricavi: 0, margine: 0 }
  );

  return NextResponse.json({ scope, rows: list, totali: tot });
}
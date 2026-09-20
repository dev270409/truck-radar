import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getVerifiedCompanyIds } from "@/lib/marketplace";
import { listSubcontracts, createSubcontract, subcontractReviewAverage } from "@/lib/subcontract";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Area riservata a ufficio/admin." }, { status: 403 });
  }

  const url = new URL(req.url);
  const tripId = String(url.searchParams.get("tripId") ?? "").trim() || null;

  const proposte = await listSubcontracts({ parentCompanyId: session.user.companyId, tripId: tripId ?? undefined });

  // Annota le proposte col nome vettore
  const carrierIds = [...new Set(proposte.map((p) => p.carrierCompanyId))];
  const carriers = await db.company.findMany({
    where: { id: { in: carrierIds } },
    select: { id: true, ragioneSociale: true, partitaIva: true },
  });
  const carrierMap = new Map(carriers.map((c) => [c.id, c]));

  // Suggerimenti vettori (network vincolato a trip) — solo fatti, decisione dell'Admin
  let suggerimenti: Array<Record<string, unknown>> = [];
  if (tripId) {
    const trip = await db.trip.findFirst({
      where: { id: tripId, companyId: session.user.companyId },
      include: { vehicle: true },
    });
    if (trip) {
      const verified = await getVerifiedCompanyIds();
      const candidates = [...verified].filter((id) => id !== session.user.companyId);

      const candCompanies = await db.company.findMany({
        where: { id: { in: candidates } },
        select: { id: true, ragioneSociale: true, partitaIva: true },
      });
      const candMap = new Map(candCompanies.map((c) => [c.id, c]));
      const theirVehicles = await db.vehicle.findMany({
        where: { companyId: { in: candidates }, status: "DISPONIBILE" },
        select: { id: true, companyId: true, categoria: true, portataMaxKg: true },
      });
      const ratings = await subcontractReviewAverage(candidates);
      const ratingMap = new Map(ratings.map((r) => [r.companyId, { avg: r.avg, count: Number(r.count) }]));

      const tripCategory = trip.vehicle?.categoria ?? null;
      const tripPortata = trip.pesoKg;

      suggerimenti = candidates.map((cid) => {
        const comp = candMap.get(cid);
        const veh = theirVehicles.filter((v) => v.companyId === cid);
        const compatibili = tripCategory
          ? veh.filter((v) => v.categoria === tripCategory)
          : veh;
        const capMax = Math.max(0, ...veh.map((v) => v.portataMaxKg));
        return {
          companyId: cid,
          name: comp?.ragioneSociale ?? "Azienda verificata",
          partitaIva: comp?.partitaIva ?? "—",
          vehicles: veh.length,
          compatibili: compatibili.length,
          capacityKg: capMax,
          capacitaOk: tripPortata ? capMax >= tripPortata : true,
          rating: ratingMap.get(cid)?.avg ?? null,
          reviewsCount: ratingMap.get(cid)?.count ?? 0,
        };
      });
      suggerimenti.sort((a, b) => {
        const compat = (b.compatibili as number) - (a.compatibili as number);
        if (compat !== 0) return compat;
        return (b.rating as number) - (a.rating as number);
      });
    }
  }

  return NextResponse.json({ suggerimenti, proposte: proposte.map((p) => ({ ...p, carrier: carrierMap.get(p.carrierCompanyId) ?? null })) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Area riservata a ufficio/admin." }, { status: 403 });
  }

  let body: { tripId?: unknown; carrierCompanyId?: unknown; price?: unknown; marketplaceLoadId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo non valido." }, { status: 400 });
  }

  const tripId = String(body.tripId ?? "");
  const carrierCompanyId = String(body.carrierCompanyId ?? "");
  const marketplaceLoadId = body.marketplaceLoadId ? String(body.marketplaceLoadId) : null;
  const price = body.price != null && body.price !== "" ? Number(body.price) : null;

  if (!tripId || !carrierCompanyId) {
    return NextResponse.json({ error: "tripId e carrierCompanyId obbligatori." }, { status: 400 });
  }
  if (price != null && price <= 0) {
    return NextResponse.json({ error: "Prezzo non valido." }, { status: 400 });
  }
  if (carrierCompanyId === session.user.companyId) {
    return NextResponse.json({ error: "Il subappalto richiede un vettore esterno." }, { status: 400 });
  }

  const trip = await db.trip.findFirst({
    where: { id: tripId, companyId: session.user.companyId },
  });
  if (!trip) {
    return NextResponse.json({ error: "Viaggio non trovato." }, { status: 404 });
  }
  if (!["DA_ASSEGNARE", "ASSEGNATO"].includes(trip.status)) {
    return NextResponse.json(
      { error: `Subappalto consentito solo per viaggi DA_ASSEGNARE o ASSEGNATO (attuale: ${trip.status}).` },
      { status: 400 }
    );
  }

  const verified = await getVerifiedCompanyIds();
  if (!verified.has(carrierCompanyId)) {
    return NextResponse.json({ error: "Il vettore selezionato non è un'azienda verificata del network." }, { status: 400 });
  }

  const prop = await createSubcontract({
    parentCompanyId: session.user.companyId,
    tripId,
    carrierCompanyId,
    price,
    marketplaceLoadId,
    createdBy: session.user.id,
  });

  if (!prop) {
    return NextResponse.json(
      { error: "Proposta già presente per questo vettore e viaggio." },
      { status: 409 }
    );
  }

  return NextResponse.json({ prop }, { status: 201 });
}
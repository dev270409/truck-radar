import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { setSubcontractStatus, listSubcontracts } from "@/lib/subcontract";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Area riservata a ufficio/admin." }, { status: 403 });
  }

  const { id } = await params;
  let body: { action?: unknown; price?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo non valido." }, { status: 400 });
  }

  const action = String(body.action ?? "").toUpperCase();

  if (action === "CONFERMA") {
    const existing = (await listSubcontracts({ parentCompanyId: session.user.companyId, tripId: undefined }))
      .find((p) => p.id === id);
    if (!existing) {
      return NextResponse.json({ error: "Proposta non trovata o non tua." }, { status: 404 });
    }
    if (existing.status !== "PROPOSTO") {
      return NextResponse.json({ error: "Solo le proposte in stato PROPOSTO sono confermabili." }, { status: 400 });
    }
    const prop = await setSubcontractStatus({
      parentCompanyId: session.user.companyId,
      id,
      status: "CONFERMATO",
    });
    if (!prop) {
      return NextResponse.json({ error: "Proposta non trovata o non tua." }, { status: 404 });
    }

    const trip = await db.trip.findFirst({
      where: { id: prop.tripId, companyId: session.user.companyId },
    });
    if (!trip) {
      return NextResponse.json({ error: "Viaggio collegato non trovato." }, { status: 404 });
    }
    if (["COMPLETATO", "ANNULLATO"].includes(trip.status)) {
      return NextResponse.json({ error: "Il viaggio è già chiuso." }, { status: 400 });
    }

    const updated = await db.$transaction(
      async (tx) => {
        const t = await tx.trip.update({
          where: { id: prop.tripId },
          data: { status: "SUBAPPALTATO" },
        });
        await tx.tripEvent.create({
          data: {
            tripId: prop.tripId,
            changedBy: session.user.id!,
            fromStatus: trip.status,
            toStatus: "SUBAPPALTATO",
            note: `Subappaltato a vettore esterno (${prop.carrierCompanyId})`,
          },
        });
        return t;
      },
      { timeout: 30000 }
    );

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: session.user.companyId,
        action: "SUBAPPALTO_CONFERMATO",
        entity: "Subcontract",
        entityId: id,
        payload: { tripId: prop.tripId, carrierCompanyId: prop.carrierCompanyId, price: prop.price },
      },
    });

    const rivals = await listSubcontracts({
      parentCompanyId: session.user.companyId,
      tripId: prop.tripId,
      status: "PROPOSTO",
    });
    for (const rival of rivals) {
      if (rival.id !== id) {
        await setSubcontractStatus({
          parentCompanyId: session.user.companyId,
          id: rival.id,
          status: "RIFIUTATO",
        });
      }
    }

    return NextResponse.json({ prop: { ...prop, status: "CONFERMATO" }, trip: updated });
  }

  if (action === "RIFIUTA") {
    const existing = (await listSubcontracts({ parentCompanyId: session.user.companyId, tripId: undefined }))
      .find((p) => p.id === id);
    if (!existing) {
      return NextResponse.json({ error: "Proposta non trovata o non tua." }, { status: 404 });
    }
    if (existing.status !== "PROPOSTO") {
      return NextResponse.json({ error: "Solo le proposte in stato PROPOSTO sono rifiutabili." }, { status: 400 });
    }
    const prop = await setSubcontractStatus({
      parentCompanyId: session.user.companyId,
      id,
      status: "RIFIUTATO",
    });
    return NextResponse.json({ prop });
  }

  return NextResponse.json({ error: "Azione non valida (CONFERMA o RIFIUTA)." }, { status: 400 });
}
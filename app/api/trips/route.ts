import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { db } from "@/lib/db";

const tripIncludes = {
  vehicle: { select: { id: true, targa: true, categoria: true } },
  driver: { select: { id: true, nome: true, cognome: true, email: true } },
} as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const tenantDb = getTenantDb(session.user.companyId);
  const trips = await tenantDb.trips.findMany({
    include: tripIncludes,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ trips });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const role = session.user.role as string;
  if (role !== "ADMIN" && role !== "UFFICIO") {
    return NextResponse.json(
      { error: "Solo l'Admin (o Ufficio) può creare viaggi." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      luogoRitiro,
      luogoConsegna,
      dataRitiro,
      dataConsegna,
      tipoMerce,
      pesoKg,
      volumeM3,
      cliente,
      prezzo,
      costo,
      note,
      vehicleId,
      driverId,
    } = body;

    if (
      !luogoRitiro ||
      !luogoConsegna ||
      !dataRitiro ||
      !dataConsegna ||
      !tipoMerce
    ) {
      return NextResponse.json(
        { error: "Campi obbligatori mancanti (origine, destinazione, date, merce)." },
        { status: 400 }
      );
    }

    const tenantDb = getTenantDb(session.user.companyId);

    if (new Date(dataConsegna) < new Date(dataRitiro)) {
      return NextResponse.json(
        { error: "La data di consegna non può precedere la data di ritiro." },
        { status: 400 }
      );
    }

    const trip = await tenantDb.trips.create({
      data: {
        luogoRitiro: String(luogoRitiro).trim(),
        luogoConsegna: String(luogoConsegna).trim(),
        dataRitiro: new Date(dataRitiro),
        dataConsegna: new Date(dataConsegna),
        tipoMerce: String(tipoMerce).trim(),
        pesoKg: pesoKg ? parseFloat(pesoKg) : 0,
        volumeM3: volumeM3 ? parseFloat(volumeM3) : 0,
        cliente: cliente ? String(cliente).trim() : null,
        prezzo: prezzo != null && prezzo !== "" ? parseFloat(prezzo) : null,
        costo: costo != null && costo !== "" ? parseFloat(costo) : null,
        note: note ? String(note).trim() : null,
        vehicleId: vehicleId || null,
        driverId: driverId || null,
        status: vehicleId && driverId ? "ASSEGNATO" : "DA_ASSEGNARE",
        createdBy: session.user.id!,
      },
      include: tripIncludes,
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: session.user.companyId,
        action: "TRIP_CREATED",
        entity: "Trip",
        entityId: trip.id,
        payload: { luogoRitiro, luogoConsegna, status: trip.status },
      },
    });

    return NextResponse.json({ trip }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { db } from "@/lib/db";
import { listTripDocuments, createTripDocument } from "@/lib/raw-tables";

const DDT_TIPI = ["FOTO", "FIRMA", "DOCUMENTO"] as const;

const requireSession = async () => {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return { error: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }) };
  }
  return { session };
};

type SessionUser = {
  user: { id?: string | null; companyId?: string | null; role?: string | null };
};

const guardTrip = async (session: SessionUser, tripId: string) => {
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

  const documents = await listTripDocuments(session.user.companyId, id);
  return NextResponse.json({ documents });
}

export async function POST(
  req: Request,
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

  if (session.user.role === "AUTISTA") {
    if (trip.status !== "IN_CORSO" && trip.status !== "COMPLETATO") {
      return NextResponse.json(
        { error: "Il DDT può essere inviato solo per viaggi in corso o completati." },
        { status: 400 }
      );
    }
  }

  let body: { tipo?: unknown; fileUrl?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const tipo = String(body.tipo ?? "").toUpperCase();
  const fileUrl = String(body.fileUrl ?? "").trim();
  const note = body.note ? String(body.note).trim() : null;

  if (!DDT_TIPI.includes(tipo as (typeof DDT_TIPI)[number])) {
    return NextResponse.json(
      { error: `Tipo documento non valido (attesi: ${DDT_TIPI.join(", ")})` },
      { status: 400 }
    );
  }
  if (!fileUrl || !/^https?:\/\//i.test(fileUrl)) {
    return NextResponse.json({ error: "File non valido: inserire un URL valido." }, { status: 400 });
  }

  try {
    const document = await createTripDocument({
      tripId: id,
      companyId: session.user.companyId,
      tipo: tipo as string,
      fileUrl,
      note,
      createdBy: session.user.id,
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: session.user.companyId,
        action: "DDT_UPLOADED",
        entity: "TripDocument",
        entityId: document.id,
        payload: { tripId: id, tipo, by: session.user.role },
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
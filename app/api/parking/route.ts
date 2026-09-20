import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createParkingArea, listParking } from "@/lib/parking";

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  const areas = await listParking(session.user.companyId);
  return NextResponse.json({ areas });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Solo l'ufficio può inserire aree." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo non valido." }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  const address = String(body.address ?? "").trim();
  if (!name || !address) {
    return NextResponse.json({ error: "Nome e indirizzo obbligatori." }, { status: 400 });
  }

  const area = await createParkingArea(session.user.companyId, {
    name,
    address,
    city: body.city ? String(body.city) : null,
    security: Boolean(body.security),
    illuminated: Boolean(body.illuminated),
    restaurant: Boolean(body.restaurant),
    showers: Boolean(body.showers),
    wifi: Boolean(body.wifi),
  });

  await dbAudit(session, area.id);
  return NextResponse.json({ area }, { status: 201 });
}

async function dbAudit(session: { user: { id?: string; companyId?: string | null } }, entityId: string) {
  const { db } = await import("@/lib/db");
  if (!session.user.id || !session.user.companyId) return;
  try {
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: session.user.companyId,
        action: "PARKING_AREA_CREATA",
        entity: "ParkingArea",
        entityId,
        payload: {},
      },
    });
  } catch {
    /* audit best effort */
  }
}
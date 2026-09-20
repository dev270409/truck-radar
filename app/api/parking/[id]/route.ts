import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteParkingArea, updateParkingArea } from "@/lib/parking";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Solo l'ufficio può modificare aree." }, { status: 403 });
  }

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo non valido." }, { status: 400 });
  }

  const area = await updateParkingArea(session.user.companyId, id, {
    name: body.name ? String(body.name) : undefined,
    address: body.address ? String(body.address) : undefined,
    city: body.city ? String(body.city) : undefined,
    security: typeof body.security === "boolean" ? body.security : undefined,
    illuminated: typeof body.illuminated === "boolean" ? body.illuminated : undefined,
    restaurant: typeof body.restaurant === "boolean" ? body.restaurant : undefined,
    showers: typeof body.showers === "boolean" ? body.showers : undefined,
    wifi: typeof body.wifi === "boolean" ? body.wifi : undefined,
  });

  if (!area) {
    return NextResponse.json({ error: "Area non trovata o non tua." }, { status: 404 });
  }
  return NextResponse.json({ area });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteParkingArea(session.user.companyId, id);
  if (!ok) {
    return NextResponse.json({ error: "Area non trovata o non tua." }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
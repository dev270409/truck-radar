import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createGeofence, listGeofences, updateGeofence, deleteGeofence } from "@/lib/geofence";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return { error: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }) };
  }
  return { session };
}

export async function GET() {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const session = guard.session!;

  try {
    const items = await listGeofences(session.user.companyId);
    return NextResponse.json({ items });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const session = guard.session!;

  if (session.user.role !== "ADMIN" && session.user.role !== "UFFICIO") {
    return NextResponse.json({ error: "Solo gli amministratori gestiscono le aree." }, { status: 403 });
  }

  let body: {
    name?: unknown;
    latCenter?: unknown;
    lngCenter?: unknown;
    raggioM?: unknown;
    color?: unknown;
    note?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const latCenter = body.latCenter != null && body.latCenter !== "" ? Number(body.latCenter) : null;
  const lngCenter = body.lngCenter != null && body.lngCenter !== "" ? Number(body.lngCenter) : null;
  const raggioM = body.raggioM != null ? Number(body.raggioM) : null;

  if (!name) {
    return NextResponse.json({ error: "Nome area obbligatorio." }, { status: 400 });
  }
  if (latCenter != null && (isNaN(latCenter) || latCenter < -90 || latCenter > 90)) {
    return NextResponse.json({ error: "Latitudine non valida." }, { status: 400 });
  }
  if (lngCenter != null && (isNaN(lngCenter) || lngCenter < -180 || lngCenter > 180)) {
    return NextResponse.json({ error: "Longitudine non valida." }, { status: 400 });
  }
  if (raggioM != null && (isNaN(raggioM) || raggioM <= 0 || raggioM > 50000)) {
    return NextResponse.json({ error: "Raggio non valido (1..50000 m)." }, { status: 400 });
  }

  try {
    const item = await createGeofence(session.user.companyId, {
      name,
      latCenter,
      lngCenter,
      raggioM: raggioM ?? 1000,
      color: body.color ? String(body.color) : "#3b82f6",
      note: body.note ? String(body.note).trim() : null,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const session = guard.session!;

  if (session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Solo gli amministratori gestiscono le aree." }, { status: 403 });
  }

  let body: { id?: unknown; name?: unknown; latCenter?: unknown; lngCenter?: unknown; raggioM?: unknown; color?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const id = String(body.id ?? "");
  if (!id) {
    return NextResponse.json({ error: "Area mancante." }, { status: 400 });
  }

  try {
    const item = await updateGeofence(session.user.companyId, id, {
      name: body.name ? String(body.name).trim() : undefined,
      latCenter: body.latCenter != null && body.latCenter !== "" ? Number(body.latCenter) : undefined,
      lngCenter: body.lngCenter != null && body.lngCenter !== "" ? Number(body.lngCenter) : undefined,
      raggioM: body.raggioM != null ? Number(body.raggioM) : undefined,
      color: body.color ? String(body.color) : undefined,
      note: body.note ? String(body.note).trim() : undefined,
    });
    if (!item) {
      return NextResponse.json({ error: "Area non trovata." }, { status: 404 });
    }
    return NextResponse.json({ item });
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
    return NextResponse.json({ error: "Area mancante." }, { status: 400 });
  }

  try {
    const deleted = await deleteGeofence(session.user.companyId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Area non trovata." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
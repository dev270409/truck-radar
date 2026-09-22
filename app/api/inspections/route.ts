import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getOrCreateInspectionTemplate,
  saveTemplateItems,
  createInspection,
  listInspectionsEnriched,
} from "@/lib/inspections";

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
  const action = url.searchParams.get("action");
  if (action === "template") {
    try {
      const template = await getOrCreateInspectionTemplate(session.user.companyId);
      return NextResponse.json({ template });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Errore del server";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  try {
    const items = await listInspectionsEnriched(session.user.companyId, 50);
    return NextResponse.json({ items });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const session = guard.session!;

  if (session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "La check-list è configurata dalla sede." }, { status: 403 });
  }

  let body: { id?: unknown; name?: unknown; items?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const id = String(body.id ?? "");
  const name = String(body.name ?? "Check-list pre-partenza").trim();
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Elenco voci mancante." }, { status: 400 });
  }
  const items = body.items.map((x: unknown) => String(x).trim()).filter(Boolean);
  if (items.length === 0) {
    return NextResponse.json({ error: "Elenco voci vuoto." }, { status: 400 });
  }

  try {
    const template = await saveTemplateItems(session.user.companyId, id, name, items);
    if (!template) {
      return NextResponse.json({ error: "Template non trovato." }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const session = guard.session!;

  let body: {
    vehicleId?: unknown;
    tripId?: unknown;
    templateId?: unknown;
    items?: unknown;
    note?: unknown;
    lat?: unknown;
    lng?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const vehicleId = String(body.vehicleId ?? "");
  if (!vehicleId) {
    return NextResponse.json({ error: "Veicolo obbligatorio." }, { status: 400 });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Elenco esiti mancante." }, { status: 400 });
  }
  const items = body.items.map((x: unknown) => {
    const o = typeof x === "object" && x !== null ? (x as Record<string, unknown>) : {};
    return {
      label: String(o.label ?? "").trim() || "Voce",
      ok: o.ok === true,
      note: o.note ? String(o.note).trim() : null,
    };
  });
  const lat = body.lat != null && body.lat !== "" ? Number(body.lat) : null;
  const lng = body.lng != null && body.lng !== "" ? Number(body.lng) : null;

  try {
    const inspection = await createInspection({
      vehicleId,
      companyId: session.user.companyId,
      tripId: body.tripId ? String(body.tripId) : null,
      templateId: body.templateId ? String(body.templateId) : null,
      templateName: "Check-list pre-partenza",
      items,
      note: body.note ? String(body.note).trim() : null,
      lat: lat != null && !isNaN(lat) ? lat : null,
      lng: lng != null && !isNaN(lng) ? lng : null,
      createdBy: session.user.id,
    });
    return NextResponse.json({ inspection }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
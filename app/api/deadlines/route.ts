import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import {
  createCompanyDeadline,
  createDriverDocument,
  deleteCompanyDeadline,
  deleteDriverDocument,
  listCompanyDeadlines,
  listDriverDocuments,
} from "@/lib/ops";
import {
  createVehicleDeadline,
  deleteVehicleDeadline,
  getDeadlineSettings,
  listUnifiedDeadlines,
} from "@/lib/deadline-settings";
import { DEADLINE_TYPES, deadlineType } from "@/lib/deadline-catalog";
import { userBelongsToCompany, vehicleBelongsToCompany } from "@/lib/tenant-refs";
import { optionalHttpUrl } from "@/lib/url-safety";

function parseScope(value: string | null): "driver" | "company" | "vehicle" | "all" {
  if (value === "company" || value === "vehicle" || value === "all") return value;
  return "driver";
}

export async function GET(req: Request) {
  const guard = await requireFeature("deadlines");
  if (guard.error) return guard.error;
  const url = new URL(req.url);
  const scope = parseScope(url.searchParams.get("scope"));
  if (scope === "all") {
    const items = await listUnifiedDeadlines(guard.session.user.companyId);
    return NextResponse.json({ scope, items });
  }
  if (scope === "vehicle") {
    const items = (await listUnifiedDeadlines(guard.session.user.companyId)).filter(
      (item) => item.scope === "VEICOLO"
    );
    return NextResponse.json({ scope, items });
  }
  if (scope === "company") {
    const items = await listCompanyDeadlines(guard.session.user.companyId);
    return NextResponse.json({ scope, items, catalog: DEADLINE_TYPES });
  }
  const items = await listDriverDocuments(guard.session.user.companyId);
  return NextResponse.json({ scope, items, catalog: DEADLINE_TYPES, settings: await getDeadlineSettings(guard.session.user.companyId) });
}

export async function POST(req: Request) {
  const guard = await requireFeature("deadlines");
  if (guard.error) return guard.error;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }
  const scope = parseScope(String(body.scope ?? "driver"));
  if (scope === "all") {
    return NextResponse.json({ error: "Scope non valido." }, { status: 400 });
  }
  const tipo = String(body.tipo ?? "").trim().toLowerCase();
  const dataScadenza = String(body.dataScadenza ?? "").trim();
  if (!tipo || !dataScadenza) {
    return NextResponse.json({ error: "Tipo e data di scadenza sono obbligatori." }, { status: 400 });
  }
  const type = deadlineType(tipo);
  if (!type) {
    return NextResponse.json({ error: "Tipo scadenza non riconosciuto." }, { status: 400 });
  }
  if (Number.isNaN(new Date(dataScadenza).getTime())) {
    return NextResponse.json({ error: "Data scadenza non valida." }, { status: 400 });
  }
  if (scope === "company") {
    if (type.subject !== "AZIENDA") {
      return NextResponse.json({ error: "Questo tipo non è una scadenza aziendale." }, { status: 400 });
    }
    const item = await createCompanyDeadline(guard.session.user.companyId, {
      tipo: type.id,
      dataScadenza,
      note: body.note ? String(body.note) : null,
    });
    return NextResponse.json({ item }, { status: 201 });
  }
  if (scope === "vehicle") {
    const vehicleId = String(body.vehicleId ?? "").trim();
    if (!vehicleId) return NextResponse.json({ error: "Selezionare un mezzo." }, { status: 400 });
    if (type.subject !== "VEICOLO") {
      return NextResponse.json({ error: "Questo tipo non è una scadenza mezzo." }, { status: 400 });
    }
    if (!(await vehicleBelongsToCompany(guard.session.user.companyId, vehicleId))) {
      return NextResponse.json({ error: "Mezzo non trovato." }, { status: 404 });
    }
    const item = await createVehicleDeadline(guard.session.user.companyId, {
      vehicleId,
      tipo: type.id,
      dataScadenza,
      note: body.note ? String(body.note) : null,
    });
    return NextResponse.json({ item }, { status: 201 });
  }
  if (type.subject !== "AUTISTA") {
    return NextResponse.json({ error: "Questo tipo non è una scadenza autista." }, { status: 400 });
  }
  const userId = String(body.userId ?? "").trim();
  if (!userId) return NextResponse.json({ error: "Selezionare un autista." }, { status: 400 });
  if (!(await userBelongsToCompany(guard.session.user.companyId, userId))) {
    return NextResponse.json({ error: "Autista non trovato." }, { status: 404 });
  }
  if (body.fileUrl && !optionalHttpUrl(body.fileUrl)) {
    return NextResponse.json({ error: "File documento non valido." }, { status: 400 });
  }
  const item = await createDriverDocument(guard.session.user.companyId, {
    userId,
    tipo: type.id,
    dataScadenza,
    fileUrl: optionalHttpUrl(body.fileUrl),
    note: body.note ? String(body.note) : null,
  });
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: Request) {
  const guard = await requireFeature("deadlines");
  if (guard.error) return guard.error;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const scope = parseScope(url.searchParams.get("scope"));
  if (!id) return NextResponse.json({ error: "Scadenza mancante." }, { status: 400 });
  const ok =
    scope === "company"
      ? await deleteCompanyDeadline(guard.session.user.companyId, id)
      : scope === "vehicle"
        ? await deleteVehicleDeadline(guard.session.user.companyId, id)
        : scope === "driver"
          ? await deleteDriverDocument(guard.session.user.companyId, id)
          : false;
  if (!ok) return NextResponse.json({ error: "Scadenza non trovata." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

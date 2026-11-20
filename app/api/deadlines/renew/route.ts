import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { createCompanyDeadline, createDriverDocument } from "@/lib/ops";
import { createVehicleDeadline } from "@/lib/deadline-settings";
import { deadlineType, nextDeadlineDate } from "@/lib/deadline-catalog";
import { userBelongsToCompany, vehicleBelongsToCompany } from "@/lib/tenant-refs";

export async function POST(req: Request) {
  const guard = await requireFeature("deadlines");
  if (guard.error) return guard.error;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }
  const scope = String(body.scope ?? "");
  const tipo = String(body.tipo ?? "").trim().toLowerCase();
  const dataScadenza = String(body.dataScadenza ?? "").trim();
  const type = deadlineType(tipo);
  if (!type || !dataScadenza) {
    return NextResponse.json({ error: "Tipo e data di partenza sono obbligatori." }, { status: 400 });
  }
  const base = type.base === "scadenza" ? dataScadenza : new Date().toISOString().slice(0, 10);
  const nextDate = nextDeadlineDate(type, base);
  const note = body.note ? String(body.note) : null;

  if (scope === "VEICOLO") {
    const vehicleId = String(body.vehicleId ?? "").trim();
    if (!vehicleId || !(await vehicleBelongsToCompany(guard.session.user.companyId, vehicleId))) {
      return NextResponse.json({ error: "Mezzo non trovato." }, { status: 404 });
    }
    const item = await createVehicleDeadline(guard.session.user.companyId, {
      vehicleId,
      tipo,
      dataScadenza: nextDate,
      note,
    });
    return NextResponse.json({ item, nextDate }, { status: 201 });
  }
  if (scope === "AUTISTA") {
    const userId = String(body.userId ?? "").trim();
    if (!userId || !(await userBelongsToCompany(guard.session.user.companyId, userId))) {
      return NextResponse.json({ error: "Autista non trovato." }, { status: 404 });
    }
    const item = await createDriverDocument(guard.session.user.companyId, {
      userId,
      tipo,
      dataScadenza: nextDate,
      note,
    });
    return NextResponse.json({ item, nextDate }, { status: 201 });
  }
  if (scope === "AZIENDA") {
    const item = await createCompanyDeadline(guard.session.user.companyId, {
      tipo,
      dataScadenza: nextDate,
      note,
    });
    return NextResponse.json({ item, nextDate }, { status: 201 });
  }
  return NextResponse.json({ error: "Scope non valido." }, { status: 400 });
}

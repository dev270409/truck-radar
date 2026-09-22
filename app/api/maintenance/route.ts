import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createMaintenance,
  listMaintenanceByVehicle,
  setMaintenanceStatus,
  deleteMaintenance,
} from "@/lib/maintenance";

const MANUTENZIONE_TIPI = ["TAGLIANDO", "FUNGHIOLO", "OLIO", "USURA_PNEUMATICI", "ALTRO"] as const;

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
  const vehicleId = url.searchParams.get("vehicleId") ?? undefined;

  try {
    const items = await listMaintenanceByVehicle(session.user.companyId, vehicleId);
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

  if (session.user.role === "AUTISTA") {
    return NextResponse.json(
      { error: "Solo la sede può pianificare interventi di manutenzione." },
      { status: 403 }
    );
  }

  let body: {
    vehicleId?: unknown;
    tipo?: unknown;
    descrizione?: unknown;
    kmProssimo?: unknown;
    dataProssima?: unknown;
    costo?: unknown;
    fornitore?: unknown;
    note?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const vehicleId = String(body.vehicleId ?? "");
  const tipo = String(body.tipo ?? "").toUpperCase();
  const kmProssimo = body.kmProssimo != null && body.kmProssimo !== "" ? Number(body.kmProssimo) : null;
  const costo = body.costo != null && body.costo !== "" ? Number(body.costo) : null;

  if (!vehicleId || !MANUTENZIONE_TIPI.includes(tipo as (typeof MANUTENZIONE_TIPI)[number])) {
    return NextResponse.json(
      { error: `Tipo manutenzione non valido (attesi: ${MANUTENZIONE_TIPI.join(", ")}).` },
      { status: 400 }
    );
  }
  if (kmProssimo != null && (isNaN(kmProssimo) || kmProssimo < 0)) {
    return NextResponse.json({ error: "KM prossimo intervento non valido." }, { status: 400 });
  }
  if (costo != null && (isNaN(costo) || costo < 0)) {
    return NextResponse.json({ error: "Costo non valido." }, { status: 400 });
  }

  try {
    const item = await createMaintenance(
      session.user.companyId,
      {
        vehicleId,
        tipo,
        descrizione: body.descrizione ? String(body.descrizione).trim() : null,
        kmProssimo,
        dataProssima: body.dataProssima ? String(body.dataProssima) : null,
        costo,
        fornitore: body.fornitore ? String(body.fornitore).trim() : null,
        note: body.note ? String(body.note).trim() : null,
      },
      session.user.id
    );
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
    return NextResponse.json({ error: "Solo la sede può aggiornare gli interventi." }, { status: 403 });
  }

  let body: { id?: unknown; status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const id = String(body.id ?? "");
  const status = String(body.status ?? "").toUpperCase();
  if (!id || !["PROGRAMMATO", "IN_CORSO", "ESEGUITO", "SALTATO"].includes(status)) {
    return NextResponse.json({ error: "Stato manutenzione non valido." }, { status: 400 });
  }

  try {
    const item = await setMaintenanceStatus(session.user.companyId, id, status);
    if (!item) {
      return NextResponse.json({ error: "Intervento non trovato." }, { status: 404 });
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
    return NextResponse.json({ error: "Intervento mancante." }, { status: 400 });
  }

  try {
    const deleted = await deleteMaintenance(session.user.companyId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Intervento non trovato." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
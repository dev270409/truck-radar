import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  listMarketplaceLoads,
  createMarketplaceLoad,
  getVerifiedCompanyIds,
  verifyCompany,
  type MarketplaceLoadRow,
} from "@/lib/marketplace";

const requireOfficeRole = async () => {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return { error: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }) };
  }
  if (session.user.role === "AUTISTA") {
    return { error: NextResponse.json({ error: "Area riservata a ufficio/admin." }, { status: 403 }) };
  }
  return { session };
};

const VALID_CATEGORIE = ["FRIGO", "TELONATO", "SPONDA_IDRAULICA", "CISTERNA", "ADR"];

export async function GET(req: Request) {
  const guard = await requireOfficeRole();
  if (guard.error) return guard.error;
  const session = guard.session!;

  const url = new URL(req.url);
  const kind = String(url.searchParams.get("kind") ?? "").toUpperCase() || null;
  const status = String(url.searchParams.get("status") ?? "").toUpperCase() || null;
  const q = String(url.searchParams.get("q") ?? "").trim().toLowerCase();

  const verifiedIds = await getVerifiedCompanyIds();
  const all = await listMarketplaceLoads({ status, kind });

  const names = await db.company.findMany({
    where: { id: { in: all.map((l) => l.companyId) } },
    select: { id: true, ragioneSociale: true },
  });
  const nameMap = new Map(names.map((n) => [n.id, n.ragioneSociale]));

  const annotated: Array<
    MarketplaceLoadRow & { companyName: string; isMine: boolean; companyVerified: boolean }
  > = [];

  for (const load of all) {
    const isMine = load.companyId === session.user.companyId;
    if (!isMine && !verifiedIds.has(load.companyId)) continue; // network: solo aziende verificate
    if (!isMine && load.status !== "ATTIVO") continue; // altri vedono solo ATTIVO

    const testo = `${load.luogoRitiro} ${load.luogoConsegna} ${load.tipoMerce ?? ""}`.toLowerCase();
    if (q && !testo.includes(q)) continue;

    annotated.push({
      ...load,
      companyName: nameMap.get(load.companyId) ?? "Azienda",
      isMine,
      companyVerified: verifiedIds.has(load.companyId),
    });
  }

  const mine = await verifyCompany(session.user.companyId);
  return NextResponse.json({ carichi: annotated, mioAccount: mine });
}

export async function POST(req: Request) {
  const guard = await requireOfficeRole();
  if (guard.error) return guard.error;
  const session = guard.session!;

  const verify = await verifyCompany(session.user.companyId);
  if (!verify.verified) {
    return NextResponse.json(
      {
        error: "Account non verificato: per pubblicare sulla borsa carichi servono abbonamento attivo, KYC e API collegate.",
        missing: verify.missing,
      },
      { status: 403 }
    );
  }

  let body: {
    kind?: unknown;
    luogoRitiro?: unknown;
    luogoConsegna?: unknown;
    dataRitiro?: unknown;
    dataConsegna?: unknown;
    tipoMerce?: unknown;
    pesoKg?: unknown;
    volumeM3?: unknown;
    vehicleCategory?: unknown;
    prezzo?: unknown;
    note?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const kind = String(body.kind ?? "").toUpperCase();
  const luogoRitiro = String(body.luogoRitiro ?? "").trim();
  const luogoConsegna = String(body.luogoConsegna ?? "").trim();
  const dataRitiro = new Date(String(body.dataRitiro ?? ""));
  const dataConsegna = new Date(String(body.dataConsegna ?? ""));
  const tipoMerce = body.tipoMerce ? String(body.tipoMerce).trim() : null;
  const pesoKg = body.pesoKg != null && body.pesoKg !== "" ? Number(body.pesoKg) : null;
  const volumeM3 = body.volumeM3 != null && body.volumeM3 !== "" ? Number(body.volumeM3) : null;
  const vehicleCategory = body.vehicleCategory ? String(body.vehicleCategory).toUpperCase() : null;
  const prezzo = body.prezzo != null && body.prezzo !== "" ? Number(body.prezzo) : null;
  const note = body.note ? String(body.note).trim() : null;

  if (kind !== "OFFRO" && kind !== "CERCO") {
    return NextResponse.json({ error: "Tipo carico non valido (OFFRO o CERCO)." }, { status: 400 });
  }
  if (!luogoRitiro || !luogoConsegna || isNaN(dataRitiro.getTime()) || isNaN(dataConsegna.getTime())) {
    return NextResponse.json(
      { error: "Origine, destinazione e date obbligatori." },
      { status: 400 }
    );
  }
  if (dataConsegna < dataRitiro) {
    return NextResponse.json({ error: "La data di consegna precede il ritiro." }, { status: 400 });
  }
  if (vehicleCategory && !VALID_CATEGORIE.includes(vehicleCategory)) {
    return NextResponse.json({ error: "Categoria mezzo non valida." }, { status: 400 });
  }
  if (pesoKg != null && pesoKg <= 0) {
    return NextResponse.json({ error: "Peso non valido." }, { status: 400 });
  }

  try {
    const load = await createMarketplaceLoad({
      companyId: session.user.companyId,
      kind,
      luogoRitiro,
      luogoConsegna,
      dataRitiro,
      dataConsegna,
      tipoMerce,
      pesoKg,
      volumeM3,
      vehicleCategory,
      prezzo,
      note,
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: session.user.companyId,
        action: "MARKETPLACE_LOAD_PUBLISHED",
        entity: "MarketplaceLoad",
        entityId: load.id,
        payload: { kind, luogoRitiro, luogoConsegna },
      },
    });

    return NextResponse.json({ carico: load }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
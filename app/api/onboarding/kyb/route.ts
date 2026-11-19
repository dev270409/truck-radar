import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { db } from "@/lib/db";
import { verifyPivaWithOpenapi } from "@/lib/kyb/openapi";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  if (guard.session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Operazione riservata all'amministratore." }, { status: 403 });
  }

  const rl = rateLimit(`onboarding-kyb:${guard.session.user.companyId}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Troppe verifiche. Riprova tra un minuto." }, { status: 429 });
  }

  const company = await db.company.findUnique({
    where: { id: guard.session.user.companyId },
    select: { id: true, ragioneSociale: true, partitaIva: true, indirizzo: true },
  });
  if (!company) return NextResponse.json({ error: "Azienda non trovata." }, { status: 404 });

  const verification = await verifyPivaWithOpenapi(company.partitaIva);
  const extraction = {
    ragione_sociale: company.ragioneSociale,
    partita_iva: company.partitaIva,
    codice_fiscale_azienda: company.partitaIva,
    indirizzo: company.indirizzo,
    legale_rappresentante: {
      nome: null,
      cognome: null,
      codice_fiscale_personale: null,
      numero_documento_identita: null,
      scadenza_documento_identita: null,
    },
    iscrizione_albo: { numero_iscrizione: null, provincia: null, stato: null },
    licenza_ren: { numero_ren: null, stato: null },
    documenti_rilevati: [],
  };

  await db.$executeRawUnsafe(
    `INSERT INTO "KybExtraction" ("companyId", provider, mode, extraction, verification, documenti)
     VALUES ($1, $2, 'onboarding', $3::jsonb, $4::jsonb, '[]'::jsonb)`,
    company.id,
    verification.provider,
    JSON.stringify(extraction),
    JSON.stringify(verification)
  );

  await db.auditLog.create({
    data: {
      userId: guard.session.user.id,
      companyId: company.id,
      action: "ONBOARDING_KYB_CHECKED",
      entity: "Company",
      entityId: company.id,
      payload: { status: verification.status, provider: verification.provider },
    },
  });

  return NextResponse.json({
    verification,
    verified: verification.status === "ATTIVA",
  });
}

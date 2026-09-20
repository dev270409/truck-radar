import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { listApiConnections } from "@/lib/raw-tables";

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const tenantDb = getTenantDb(session.user.companyId);
  const [company, kycAll, apiConnections, vehicles, drivers] = await Promise.all([
    tenantDb.getCompany(),
    tenantDb.kycDocuments.findMany({ select: { status: true } }),
    listApiConnections(session.user.companyId),
    tenantDb.vehicles.findMany({ select: { id: true } }),
    tenantDb.users.findMany({ where: { role: "AUTISTA", isActive: true }, select: { id: true } }),
  ]);

  const criteria: Array<{ key: string; label: string; ok: boolean; detail: string; beneficio?: boolean }> = [];

  const subOk = company?.subscriptionStatus === "ACTIVE";
  criteria.push({
    key: "abbonamento",
    label: "Abbonamento attivo",
    ok: subOk,
    detail: subOk ? "Piano ACTIVE in corso." : "Piano in TRIAL/SUSPENDED.",
  });

  const kycVerificati = kycAll.filter((k) => k.status === "VERIFICATO").length;
  const kycPending = kycAll.filter((k) => k.status === "IN_ATTESA" || k.status === "RIFIUTATO").length;
  const kycOk = kycVerificati > 0 && kycPending === 0;
  criteria.push({
    key: "verifica",
    label: "Verifica documentale (KYC)",
    ok: kycOk,
    detail: kycOk
      ? `${kycVerificati} documenti verificati.`
      : `${kycPending} documenti in attesa/rifiutati.`,
  });

  const apiSynced = apiConnections.filter((c) => c.status === "SYNCED").length;
  const apiOk = apiSynced >= 1;
  criteria.push({
    key: "api",
    label: "API collegate",
    ok: apiOk,
    detail: apiOk
      ? `${apiSynced} connessione/i sincronizzata/e.`
      : "Nessuna connessione API in sync (es. GPS/TMS).",
  });

  const flottaOk = vehicles.length >= 1 && drivers.length >= 1;
  criteria.push({
    key: "flotta",
    label: "Flotta attiva",
    ok: flottaOk,
    beneficio: true,
    detail: flottaOk
      ? `${vehicles.length} mezzi, ${drivers.length} autisti attivi.`
      : "Aggiungi almeno un mezzo e un autista.",
  });

  const verified = subOk && kycOk && apiOk;

  return NextResponse.json({ verified, criteria });
}
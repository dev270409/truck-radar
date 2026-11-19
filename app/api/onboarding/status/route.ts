import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { db } from "@/lib/db";
import { getOnboardingStatus } from "@/lib/onboarding";

export async function GET() {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  if (guard.session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Operazione riservata all'amministratore." }, { status: 403 });
  }

  const company = await db.company.findUnique({
    where: { id: guard.session.user.companyId },
    select: {
      id: true,
      ragioneSociale: true,
      partitaIva: true,
      indirizzo: true,
      subscriptionStatus: true,
      trialEndsAt: true,
    },
  });
  if (!company) return NextResponse.json({ error: "Azienda non trovata." }, { status: 404 });

  const status = await getOnboardingStatus(company.id, company.trialEndsAt);
  return NextResponse.json({ company, status });
}

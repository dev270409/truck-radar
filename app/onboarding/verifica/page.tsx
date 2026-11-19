import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOnboardingStatus } from "@/lib/onboarding";
import { isIdentityEnabled } from "@/lib/identity";
import LogoutButton from "@/components/LogoutButton";
import Logo from "@/components/Logo";
import VerificationClient from "./VerificationClient";

export default async function VerificationPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login?callbackUrl=/onboarding/verifica");

  if (session.user.role === "AUTISTA") {
    return (
      <main data-theme="dark" className="dashboard-dark flex min-h-screen items-center justify-center p-6">
        <div className="ops-card w-full max-w-md p-6 text-center">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h1 className="font-display mt-4 text-xl font-bold text-slate-100">Verifica aziendale in sospeso</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            La prova dell&apos;azienda è terminata. L&apos;amministratore deve completare la verifica per riattivare l&apos;accesso.
          </p>
          <div className="mt-5">
            <LogoutButton />
          </div>
        </div>
      </main>
    );
  }

  if (session.user.role !== "ADMIN") redirect("/login?error=role-disabled");

  const company = await db.company.findUnique({
    where: { id: session.user.companyId },
    select: {
      ragioneSociale: true,
      partitaIva: true,
      indirizzo: true,
      subscriptionStatus: true,
      trialEndsAt: true,
    },
  });
  if (!company) redirect("/login");
  if (company.subscriptionStatus === "ACTIVE") redirect("/dashboard");

  const status = await getOnboardingStatus(session.user.companyId, company.trialEndsAt);

  return (
    <VerificationClient
      company={{
        ragioneSociale: company.ragioneSociale,
        partitaIva: company.partitaIva,
        indirizzo: company.indirizzo,
        subscriptionStatus: company.subscriptionStatus,
        trialEndsAt: company.trialEndsAt?.toISOString() ?? null,
      }}
      initialStatus={{
        ...status,
        trialEndsAt: status.trialEndsAt?.toISOString() ?? null,
      }}
      identityEnabled={isIdentityEnabled()}
    />
  );
}

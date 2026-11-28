import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getPlanLimits, hasFullSectionAccess } from "@/lib/plans";
import { Lock } from "lucide-react";
import NotificationsBadge from "@/components/NotificationsBadge";
import DashboardShell from "@/components/DashboardShell";
import SidebarNav from "@/components/SidebarNav";
import { listApiConnections } from "@/lib/raw-tables";
import { getOnboardingStatus, isTrialActive, trialDaysLeft } from "@/lib/onboarding";
import { getPermissionsForUser } from "@/lib/permissions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.companyId) {
    redirect("/login");
  }
  if (!["ADMIN", "UFFICIO", "AUTISTA"].includes(session.user.role)) {
    redirect("/login?error=role-disabled");
  }

  const company = await db.company.findUnique({
    where: { id: session.user.companyId },
    select: {
      ragioneSociale: true,
      subscriptionStatus: true,
      partitaIva: true,
      subscriptionPlan: true,
      trialEndsAt: true,
    },
  });

  const trialActive = company?.subscriptionStatus === "TRIAL" && isTrialActive(company?.trialEndsAt);
  if (company?.subscriptionStatus === "TRIAL" && !trialActive) {
    const onboarding = await getOnboardingStatus(session.user.companyId, company?.trialEndsAt);
    if (!onboarding.complete) redirect("/onboarding/verifica");
  }

  const planLimits = getPlanLimits(company?.subscriptionPlan || session.user.subscriptionPlan);
  const fullSectionAccess = hasFullSectionAccess(company?.subscriptionStatus, company?.trialEndsAt);
  const autoRole = session.user.role === "AUTISTA";
  const access = await getPermissionsForUser(session.user.companyId, session.user.id);
  const permissions = access?.permissions ?? {};

  let accountVerificato = false;
  let vehicleCount = 0;
  let driverCount = 0;
  try {
    const [kycAll, apiConns, vCount, uCount] = await Promise.all([
      db.kycDocument.findMany({
        where: { companyId: session.user.companyId },
        select: { status: true },
      }),
      listApiConnections(session.user.companyId),
      db.vehicle.count({ where: { companyId: session.user.companyId } }),
      db.user.count({ where: { companyId: session.user.companyId, role: "AUTISTA" } }),
    ]);
    vehicleCount = vCount;
    driverCount = uCount;
    const kycPending = kycAll.filter(
      (k) => k.status === "IN_ATTESA" || k.status === "RIFIUTATO"
    ).length;
    const apiSynced = apiConns.filter((c) => c.status === "SYNCED").length;
    accountVerificato =
      company?.subscriptionStatus === "ACTIVE" && kycPending === 0 && apiSynced >= 1;
  } catch {
    accountVerificato = false;
  }

  const INK = "var(--text)";

  const sidebar = (
    <>
      <div className="border-b pb-4" style={{ borderColor: "var(--glass-border)" }}>
        <p className="ops-label">Azienda</p>
        <h2 className="font-display mt-1 truncate text-[14px] font-semibold" style={{ color: INK }}>
          {company?.ragioneSociale || "Truck Radar"}
        </h2>
        <p className="truncate font-mono text-[11px]" style={{ color: "var(--text-label-soft)" }}>
          P.IVA {company?.partitaIva || "N/A"}
        </p>
      </div>

      {!autoRole && (
        <div className="mt-4 rounded-[12px] p-3" style={{ background: "var(--surface-soft)", border: "1px solid var(--glass-border)" }}>
          <div className="flex items-center justify-between">
            <span className="ops-label">Piano</span>
            <span className="chip chip-brand">{company?.subscriptionPlan || session.user.subscriptionPlan}</span>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <div className="rounded-[8px] px-2 py-1.5" style={{ background: "var(--surface)" }}>
              <p className="text-[9px] font-semibold" style={{ color: "var(--text-label-soft)" }}>Mezzi</p>
              <p className="font-display text-[13px] font-semibold" style={{ color: INK }}>{vehicleCount}/{planLimits.vehicleLimit}</p>
            </div>
            <div className="rounded-[8px] px-2 py-1.5" style={{ background: "var(--surface)" }}>
              <p className="text-[9px] font-semibold" style={{ color: "var(--text-label-soft)" }}>Autisti</p>
              <p className="font-display text-[13px] font-semibold" style={{ color: INK }}>{driverCount}/{planLimits.driverLimit}</p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t pt-2.5" style={{ borderColor: "var(--glass-border)" }}>
            <span className="ops-label">Account</span>
            <span className={`chip ${accountVerificato ? "chip-success" : "chip-brand"}`}>
              {accountVerificato ? "Verificato" : "Basic"}
            </span>
          </div>
          {!fullSectionAccess && (
            <Link
              href="/dashboard/abbonamenti"
              className="mt-2.5 flex items-center justify-center gap-1.5 border-t pt-2.5 text-[11px] font-semibold"
              style={{ borderColor: "var(--glass-border)", color: "var(--brand)" }}
            >
              <Lock className="h-3 w-3" /> Attiva le sezioni premium
            </Link>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between px-1">
        <span className="ops-label">Navigazione</span>
        <NotificationsBadge />
      </div>

      <SidebarNav
        role={session.user.role}
        fullAccess={fullSectionAccess}
        permissions={permissions}
      />
    </>
  );

  return (
    <div data-theme="dark" className="dashboard-dark">
      <DashboardShell
        sidebar={sidebar}
        user={{
          nome: session.user.nome ?? "",
          cognome: session.user.cognome ?? "",
          email: session.user.email ?? "",
          role: session.user.role,
        }}
        trial={{
          active: trialActive,
          daysLeft: company?.subscriptionStatus === "TRIAL" ? trialDaysLeft(company?.trialEndsAt) : null,
        }}
        permissions={permissions}
      >
        {children}
      </DashboardShell>
    </div>
  );
}

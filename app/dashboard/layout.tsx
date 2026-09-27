import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getPlanLimits, hasFullSectionAccess } from "@/lib/plans";
import {
  LayoutDashboard,
  Users,
  Car,
  Route,
  Cloud,
  Boxes,
  Handshake,
  Globe,
  MapPin,
  Settings,
  Wrench,
  ClipboardCheck,
  Radar,
  Fuel,
  CreditCard,
  Lock,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import NotificationsBadge from "@/components/NotificationsBadge";
import DashboardShell from "@/components/DashboardShell";
import Logo from "@/components/Logo";
import { listApiConnections } from "@/lib/raw-tables";

function SidebarLink({
  href,
  label,
  icon,
  fullAccess,
  premium = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  fullAccess: boolean;
  premium?: boolean;
}) {
  const blocked = premium && !fullAccess;
  return (
    <Link
      href={blocked ? "/dashboard/abbonamenti" : href}
      className={`group flex items-center gap-3 rounded-[var(--radius-base)] px-3 py-2.5 text-[13px] font-medium transition ${
        blocked ? "cursor-pointer opacity-55" : ""
      }`}
      style={{ color: blocked ? "var(--text-label-soft)" : "var(--text-soft)" }}
    >
      <span className={blocked ? "opacity-50" : ""}>{icon}</span>
      <span>{label}</span>
      {premium && (
        <span className="chip chip-accent ml-auto" style={{ fontSize: 8 }}>
          PRO
        </span>
      )}
    </Link>
  );
}

/** Voce di navigazione senza blocco premium. */
function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[var(--radius-base)] px-3 py-2.5 text-[13px] font-medium transition hover:-translate-y-px"
      style={{ color: "var(--text-soft)" }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

/** Titolo di sezione (etichetta tecnica). */
function NavGroup({ children }: { children: React.ReactNode }) {
  return <p className="ops-label px-3 pb-1.5 pt-4">{children}</p>;
}

/** Icona nav in tinta col contesto. */
function NavIcon({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className="grid h-[26px] w-[26px] place-items-center rounded-[8px]" style={{ background: `color-mix(in oklch, ${tone} 13%, transparent)`, color: tone }}>
      {children}
    </span>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.companyId) {
    redirect("/login");
  }

  const company = await db.company.findUnique({
    where: { id: session.user.companyId },
    select: { ragioneSociale: true, subscriptionStatus: true, partitaIva: true, subscriptionPlan: true },
  });

  const planLimits = getPlanLimits(company?.subscriptionPlan || session.user.subscriptionPlan);
  const fullSectionAccess = hasFullSectionAccess(company?.subscriptionStatus);
  const autoRole = session.user.role === "AUTISTA";

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

  const BRAND = "var(--brand)";
  const GREEN = "var(--success)";
  const INK = "var(--text)";

  const sidebar = (
    <>
      {/* Brand & tenant */}
      <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: "var(--glass-border)" }}>
        <Logo size={40} withWordmark={false} />
        <div className="min-w-0">
          <h2 className="font-display truncate text-[13px] font-bold" style={{ color: INK }}>
            {company?.ragioneSociale || "Truck Radar"}
          </h2>
          <p className="truncate font-mono text-[10px]" style={{ color: "var(--text-label-soft)" }}>
            P.IVA {company?.partitaIva || "N/A"}
          </p>
        </div>
      </div>

      {/* Piano / contatori */}
      {!autoRole && (
        <div className="mt-4 rounded-[var(--radius-card)] p-3" style={{ background: "var(--surface-soft)", border: "1px solid var(--glass-border)" }}>
          <div className="flex items-center justify-between">
            <span className="ops-label">Piano</span>
            <span className="chip chip-brand">{company?.subscriptionPlan || session.user.subscriptionPlan}</span>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <div className="rounded-[var(--radius-base)] px-2 py-1.5" style={{ background: "var(--surface-soft)" }}>
              <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "var(--text-label-soft)" }}>Mezzi</p>
              <p className="font-display text-[13px] font-bold" style={{ color: INK }}>{vehicleCount}/{planLimits.vehicleLimit}</p>
            </div>
            <div className="rounded-[var(--radius-base)] px-2 py-1.5" style={{ background: "var(--surface-soft)" }}>
              <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "var(--text-label-soft)" }}>Autisti</p>
              <p className="font-display text-[13px] font-bold" style={{ color: INK }}>{driverCount}/{planLimits.driverLimit}</p>
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
              style={{ borderColor: "var(--glass-border)", color: "var(--accent)" }}
            >
              <Lock className="h-3 w-3" /> Attiva le sezioni premium
            </Link>
          )}
        </div>
      )}

      {/* Navigazione */}
      <nav className="mt-4 flex-1 text-[13px]">
        <div className="flex items-center justify-between px-3 pb-1">
          <span className="ops-label">Operatività</span>
          <NotificationsBadge />
        </div>

        {session.user.role === "AUTISTA" ? (
          <NavLink
            href="/dashboard/autista"
            label="I Miei Viaggi"
            icon={<NavIcon tone="var(--info)"><Route className="h-4 w-4" /></NavIcon>}
          />
        ) : (
          <>
            <NavLink href="/dashboard" label="Panoramica" icon={<NavIcon tone={BRAND}><LayoutDashboard className="h-4 w-4" /></NavIcon>} />
            <NavLink href="/dashboard/vehicles" label="Mezzi" icon={<NavIcon tone={GREEN}><Car className="h-4 w-4" /></NavIcon>} />
            <NavLink href="/dashboard/flotta" label="Flotta Live" icon={<NavIcon tone="var(--info)"><Radar className="h-4 w-4" /></NavIcon>} />
            <NavLink href="/dashboard/users" label="Autisti e team" icon={<NavIcon tone="var(--accent)"><Users className="h-4 w-4" /></NavIcon>} />
            <NavLink href="/dashboard/trips" label="Viaggi" icon={<NavIcon tone={BRAND}><Route className="h-4 w-4" /></NavIcon>} />

            <NavGroup>Network</NavGroup>
            <NavLink href="/dashboard/carburante" label="Carburante" icon={<NavIcon tone={GREEN}><Fuel className="h-4 w-4" /></NavIcon>} />
            <SidebarLink href="/dashboard/marketplace" label="Borsa Carichi" fullAccess={fullSectionAccess} premium icon={<NavIcon tone="var(--accent)"><Boxes className="h-4 w-4" /></NavIcon>} />
            <SidebarLink href="/dashboard/smart-return" label="Smart Return" fullAccess={fullSectionAccess} premium icon={<NavIcon tone={GREEN}><Handshake className="h-4 w-4" /></NavIcon>} />
            <SidebarLink href="/dashboard/network" label="Network" fullAccess={fullSectionAccess} premium icon={<NavIcon tone={BRAND}><Globe className="h-4 w-4" /></NavIcon>} />
            <SidebarLink href="/dashboard/parking" label="Aree di Sosta" fullAccess={fullSectionAccess} premium icon={<NavIcon tone={GREEN}><MapPin className="h-4 w-4" /></NavIcon>} />

            <NavGroup>Flotta e sicurezza</NavGroup>
            <NavLink href="/dashboard/manutenzione" label="Manutenzione" icon={<NavIcon tone="var(--warning)"><Wrench className="h-4 w-4" /></NavIcon>} />
            <SidebarLink href="/dashboard/ispezioni" label="Check-list Ispezioni" fullAccess={fullSectionAccess} premium icon={<NavIcon tone={GREEN}><ClipboardCheck className="h-4 w-4" /></NavIcon>} />
            <SidebarLink href="/dashboard/geofence" label="Aree e Geofence" fullAccess={fullSectionAccess} premium icon={<NavIcon tone="var(--info)"><Radar className="h-4 w-4" /></NavIcon>} />

            <NavGroup>Fatturazione</NavGroup>
            <NavLink href="/dashboard/abbonamenti" label="Abbonamento" icon={<NavIcon tone="var(--info)"><CreditCard className="h-4 w-4" /></NavIcon>} />

            <NavGroup>Configurazione</NavGroup>
            {session.user.role === "ADMIN" && (
              <NavLink href="/dashboard/integrazioni" label="Integrazioni" icon={<NavIcon tone={BRAND}><Cloud className="h-4 w-4" /></NavIcon>} />
            )}
            <SidebarLink href="/dashboard/reporti" label="Report e impostazioni" fullAccess={fullSectionAccess} premium icon={<NavIcon tone="var(--accent)"><Settings className="h-4 w-4" /></NavIcon>} />
          </>
        )}
      </nav>

      {/* Profilo utente */}
      <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--glass-border)" }}>
        <div className="mb-3 flex items-center gap-3 px-1">
          <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-pill)] font-display text-[12px] font-bold text-white" style={{ background: BRAND }}>
            {(session.user.nome?.[0] ?? "U").toUpperCase()}{(session.user.cognome?.[0] ?? "").toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold" style={{ color: INK }}>
              {session.user.nome} {session.user.cognome}
            </p>
            <span className="chip chip-brand mt-0.5">{session.user.role}</span>
          </div>
        </div>
        <LogoutButton />
      </div>
    </>
  );

  return <DashboardShell sidebar={sidebar}>{children}</DashboardShell>;
}

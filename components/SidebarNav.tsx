"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { readHiddenSidebarItems, SIDEBAR_PREFS_EVENT } from "@/lib/nav-prefs";
import type { PermissionKey, PermissionMap } from "@/lib/permissions-catalog";
import {
  LayoutDashboard,
  Users,
  Car,
  Route,
  Cloud,
  Boxes,
  Wrench,
  Radar,
  Fuel,
  CreditCard,
  KeyRound,
  FileText,
  PackageCheck,
  FileSpreadsheet,
  CalendarDays,
  BarChart3,
  ArrowLeftRight,
  Wallet,
  Droplets,
  BadgePercent,
  Building2,
  ReceiptText,
} from "lucide-react";

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="grid h-6 w-6 place-items-center rounded-[7px]"
      style={{
        background: "color-mix(in oklab, var(--text-label) 10%, transparent)",
        color: "var(--text-label)",
      }}
    >
      {children}
    </span>
  );
}

function Badge({ blocked }: { blocked: boolean }) {
  if (blocked) {
    return <span className="chip chip-accent ml-auto" style={{ fontSize: 8 }}>PRO</span>;
  }
  return null;
}

const HiddenSidebarContext = createContext<string[]>([]);

function Item({
  href,
  label,
  icon,
  premium = false,
  fullAccess,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  premium?: boolean;
  fullAccess: boolean;
}) {
  const hidden = useContext(HiddenSidebarContext);
  const pathname = usePathname();
  if (hidden.includes(href) && href !== "/dashboard") return null;
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  const blocked = premium && !fullAccess;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="group relative flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] font-medium transition"
      style={{
        background: active ? "var(--surface-soft)" : "transparent",
        color: active ? "var(--text)" : "var(--text-soft)",
        opacity: blocked ? 0.55 : 1,
      }}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full" style={{ background: "var(--brand)" }} />
      )}
      {icon}
      <span>{label}</span>
      <Badge blocked={blocked} />
    </Link>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <p className="ops-label px-2.5 pb-1 pt-4">{children}</p>;
}

export default function SidebarNav({
  role,
  fullAccess,
  permissions,
}: {
  role: string;
  fullAccess: boolean;
  permissions: Partial<PermissionMap>;
}) {
  const admin = role === "ADMIN";
  const can = (feature: PermissionKey) => permissions[feature] === true;
  const [hidden, setHidden] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setHidden(readHiddenSidebarItems());
    sync();
    window.addEventListener(SIDEBAR_PREFS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SIDEBAR_PREFS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <HiddenSidebarContext.Provider value={hidden}>
    <nav className="flex-1 text-[13px]">
      {role === "AUTISTA" ? (
        <Item href="/dashboard/autista" label="I miei viaggi" fullAccess={fullAccess} icon={<NavIcon><Route className="h-3.5 w-3.5" /></NavIcon>} />
      ) : (
        <>
          <Group>Operatività</Group>
          <Item href="/dashboard" label="Panoramica" fullAccess={fullAccess} icon={<NavIcon><LayoutDashboard className="h-3.5 w-3.5" /></NavIcon>} />
          {can("vehicles") && <Item href="/dashboard/vehicles" label="Mezzi" fullAccess={fullAccess} icon={<NavIcon><Car className="h-3.5 w-3.5" /></NavIcon>} />}
          {can("trips") && <Item href="/dashboard/flotta" label="Flotta live" fullAccess={fullAccess} icon={<NavIcon><Radar className="h-3.5 w-3.5" /></NavIcon>} />}
          {can("users") && <Item href="/dashboard/users" label="Autisti e team" fullAccess={fullAccess} icon={<NavIcon><Users className="h-3.5 w-3.5" /></NavIcon>} />}
          {can("trips") && <Item href="/dashboard/trips" label="Viaggi" fullAccess={fullAccess} icon={<NavIcon><Route className="h-3.5 w-3.5" /></NavIcon>} />}
          {can("load_plans") && <Item href="/dashboard/carico" label="Piano di carico" fullAccess={fullAccess} icon={<NavIcon><Boxes className="h-3.5 w-3.5" /></NavIcon>} />}

          <Group>Commerciale</Group>
          {can("quotes") && <Item href="/dashboard/preventivi" label="Preventivi" fullAccess={fullAccess} icon={<NavIcon><FileText className="h-3.5 w-3.5" /></NavIcon>} />}
          {can("orders") && <Item href="/dashboard/ordini" label="Ordini e portale" fullAccess={fullAccess} icon={<NavIcon><PackageCheck className="h-3.5 w-3.5" /></NavIcon>} />}
          {can("clients") && <Item href="/dashboard/anagrafica" label="Anagrafica" fullAccess={fullAccess} icon={<NavIcon><Building2 className="h-3.5 w-3.5" /></NavIcon>} />}
          {can("analytics") && <Item href="/dashboard/analisi-clienti" label="Analisi clienti" fullAccess={fullAccess} icon={<NavIcon><FileSpreadsheet className="h-3.5 w-3.5" /></NavIcon>} />}

          <Group>Flotta e sicurezza</Group>
          {can("fuel") && <Item href="/dashboard/carburante" label="Carburante" fullAccess={fullAccess} icon={<NavIcon><Fuel className="h-3.5 w-3.5" /></NavIcon>} />}
          {can("fuel") && <Item href="/dashboard/cisterne" label="Cisterne e accise" fullAccess={fullAccess} icon={<NavIcon><Droplets className="h-3.5 w-3.5" /></NavIcon>} />}
          {can("maintenance") && <Item href="/dashboard/manutenzione" label="Manutenzione" fullAccess={fullAccess} icon={<NavIcon><Wrench className="h-3.5 w-3.5" /></NavIcon>} />}
          {can("vehicle_costs") && <Item href="/dashboard/costi-mezzi" label="Costi mezzi e TCO" fullAccess={fullAccess} icon={<NavIcon><Wallet className="h-3.5 w-3.5" /></NavIcon>} />}
          {can("deadlines") && <Item href="/dashboard/scadenze" label="Scadenze e divieti" fullAccess={fullAccess} icon={<NavIcon><CalendarDays className="h-3.5 w-3.5" /></NavIcon>} />}
          {can("analytics") && <Item href="/dashboard/benchmark" label="Benchmark costi/km" fullAccess={fullAccess} icon={<NavIcon><BarChart3 className="h-3.5 w-3.5" /></NavIcon>} />}

          <Group>Fatturazione</Group>
          {can("billing") && <Item href="/dashboard/abbonamenti" label="Abbonamento" fullAccess={fullAccess} icon={<NavIcon><CreditCard className="h-3.5 w-3.5" /></NavIcon>} />}
          {can("expenses") && <Item href="/dashboard/spese" label="Spese aziendali" fullAccess={fullAccess} icon={<NavIcon><ReceiptText className="h-3.5 w-3.5" /></NavIcon>} />}
          {can("agevolazioni") && <Item href="/dashboard/agevolazioni" label="Agevolazioni" fullAccess={fullAccess} icon={<NavIcon><BadgePercent className="h-3.5 w-3.5" /></NavIcon>} />}

          <Group>Configurazione</Group>
          {admin && can("integrations") && <Item href="/dashboard/integrazioni" label="Integrazioni" fullAccess={fullAccess} icon={<NavIcon><Cloud className="h-3.5 w-3.5" /></NavIcon>} />}
          {can("import_export") && <Item href="/dashboard/import-export" label="Import / Export" fullAccess={fullAccess} icon={<NavIcon><ArrowLeftRight className="h-3.5 w-3.5" /></NavIcon>} />}
          {admin && can("licensing") && <Item href="/dashboard/licenza" label="Licenza" fullAccess={fullAccess} icon={<NavIcon><KeyRound className="h-3.5 w-3.5" /></NavIcon>} />}
        </>
      )}
    </nav>
    </HiddenSidebarContext.Provider>
  );
}


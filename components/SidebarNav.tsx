"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Inbox,
  PackageCheck,
  FileSpreadsheet,
  CalendarDays,
  BarChart3,
  ArrowLeftRight,
  Wallet,
  Droplets,
  BadgePercent,
} from "lucide-react";

function NavIcon({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span
      className="grid h-6 w-6 place-items-center rounded-[7px]"
      style={{ background: `color-mix(in oklab, ${tone} 14%, transparent)`, color: tone }}
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
  const pathname = usePathname();
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

export default function SidebarNav({ role, fullAccess }: { role: string; fullAccess: boolean }) {
  const admin = role === "ADMIN";
  return (
    <nav className="flex-1 text-[13px]">
      {role === "AUTISTA" ? (
        <Item href="/dashboard/autista" label="I miei viaggi" fullAccess icon={<NavIcon tone="var(--info)"><Route className="h-3.5 w-3.5" /></NavIcon>} />
      ) : (
        <>
          <Group>OperativitÃ </Group>
          <Item href="/dashboard" label="Panoramica" fullAccess icon={<NavIcon tone="var(--brand)"><LayoutDashboard className="h-3.5 w-3.5" /></NavIcon>} />
          <Item href="/dashboard/vehicles" label="Mezzi" fullAccess icon={<NavIcon tone="var(--success)"><Car className="h-3.5 w-3.5" /></NavIcon>} />
          <Item href="/dashboard/flotta" label="Flotta live" fullAccess icon={<NavIcon tone="var(--info)"><Radar className="h-3.5 w-3.5" /></NavIcon>} />
          <Item href="/dashboard/users" label="Autisti e team" fullAccess icon={<NavIcon tone="var(--accent)"><Users className="h-3.5 w-3.5" /></NavIcon>} />
          <Item href="/dashboard/trips" label="Viaggi" fullAccess icon={<NavIcon tone="var(--brand)"><Route className="h-3.5 w-3.5" /></NavIcon>} />
          <Item href="/dashboard/documenti" label="Documenti" fullAccess icon={<NavIcon tone="var(--info)"><Inbox className="h-3.5 w-3.5" /></NavIcon>} />
          <Item href="/dashboard/carico" label="Piano di carico" fullAccess icon={<NavIcon tone="var(--warning)"><Boxes className="h-3.5 w-3.5" /></NavIcon>} />
          <Item href="/dashboard/giri" label="Giri e costi" fullAccess icon={<NavIcon tone="var(--info)"><Route className="h-3.5 w-3.5" /></NavIcon>} />

          <Group>Commerciale</Group>
          <Item href="/dashboard/preventivi" label="Preventivi" fullAccess icon={<NavIcon tone="var(--success)"><FileText className="h-3.5 w-3.5" /></NavIcon>} />
          <Item href="/dashboard/ordini" label="Ordini e portale" fullAccess icon={<NavIcon tone="var(--warning)"><PackageCheck className="h-3.5 w-3.5" /></NavIcon>} />
          <Item href="/dashboard/analisi-clienti" label="Analisi clienti" fullAccess icon={<NavIcon tone="var(--accent)"><FileSpreadsheet className="h-3.5 w-3.5" /></NavIcon>} />

          <Group>Flotta e sicurezza</Group>
          <Item href="/dashboard/carburante" label="Carburante" fullAccess icon={<NavIcon tone="var(--success)"><Fuel className="h-3.5 w-3.5" /></NavIcon>} />
          <Item href="/dashboard/cisterne" label="Cisterne e accise" fullAccess icon={<NavIcon tone="var(--info)"><Droplets className="h-3.5 w-3.5" /></NavIcon>} />
          <Item href="/dashboard/manutenzione" label="Manutenzione" fullAccess icon={<NavIcon tone="var(--warning)"><Wrench className="h-3.5 w-3.5" /></NavIcon>} />
          <Item href="/dashboard/costi-mezzi" label="Costi mezzi e TCO" fullAccess icon={<NavIcon tone="var(--success)"><Wallet className="h-3.5 w-3.5" /></NavIcon>} />
          <Item href="/dashboard/scadenze" label="Scadenze e divieti" fullAccess icon={<NavIcon tone="var(--warning)"><CalendarDays className="h-3.5 w-3.5" /></NavIcon>} />
          <Item href="/dashboard/benchmark" label="Benchmark costi/km" fullAccess icon={<NavIcon tone="var(--accent)"><BarChart3 className="h-3.5 w-3.5" /></NavIcon>} />

          <Group>Fatturazione</Group>
          <Item href="/dashboard/abbonamenti" label="Abbonamento" fullAccess icon={<NavIcon tone="var(--info)"><CreditCard className="h-3.5 w-3.5" /></NavIcon>} />
          <Item href="/dashboard/agevolazioni" label="Agevolazioni" fullAccess icon={<NavIcon tone="var(--warning)"><BadgePercent className="h-3.5 w-3.5" /></NavIcon>} />

          <Group>Configurazione</Group>
          {admin && <Item href="/dashboard/integrazioni" label="Integrazioni" fullAccess icon={<NavIcon tone="var(--brand)"><Cloud className="h-3.5 w-3.5" /></NavIcon>} />}
          <Item href="/dashboard/import-export" label="Import / Export" fullAccess icon={<NavIcon tone="var(--info)"><ArrowLeftRight className="h-3.5 w-3.5" /></NavIcon>} />
          {admin && <Item href="/dashboard/licenza" label="Licenza" fullAccess icon={<NavIcon tone="var(--warning)"><KeyRound className="h-3.5 w-3.5" /></NavIcon>} />}
        </>
      )}
    </nav>
  );
}


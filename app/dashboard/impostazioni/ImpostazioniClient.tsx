"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, LayoutPanelLeft, RotateCcw, Settings2, ShieldCheck } from "lucide-react";
import {
  readHiddenSidebarItems,
  SIDEBAR_PREFS_EVENT,
  writeHiddenSidebarItems,
} from "@/lib/nav-prefs";

interface NavItem {
  href: string;
  label: string;
  fixed?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: "Operatività",
    items: [
      { href: "/dashboard", label: "Panoramica", fixed: true },
      { href: "/dashboard/vehicles", label: "Mezzi" },
      { href: "/dashboard/flotta", label: "Flotta live" },
      { href: "/dashboard/users", label: "Autisti e team" },
      { href: "/dashboard/trips", label: "Viaggi" },
      { href: "/dashboard/carico", label: "Piano di carico" },
    ],
  },
  {
    label: "Commerciale",
    items: [
      { href: "/dashboard/preventivi", label: "Preventivi" },
      { href: "/dashboard/ordini", label: "Ordini e portale" },
      { href: "/dashboard/analisi-clienti", label: "Analisi clienti" },
    ],
  },
  {
    label: "Flotta e sicurezza",
    items: [
      { href: "/dashboard/carburante", label: "Carburante" },
      { href: "/dashboard/cisterne", label: "Cisterne e accise" },
      { href: "/dashboard/manutenzione", label: "Manutenzione" },
      { href: "/dashboard/costi-mezzi", label: "Costi mezzi e TCO" },
      { href: "/dashboard/scadenze", label: "Scadenze e divieti" },
      { href: "/dashboard/benchmark", label: "Benchmark costi/km" },
    ],
  },
  {
    label: "Fatturazione",
    items: [
      { href: "/dashboard/abbonamenti", label: "Abbonamento" },
      { href: "/dashboard/agevolazioni", label: "Agevolazioni" },
    ],
  },
  {
    label: "Configurazione",
    items: [
      { href: "/dashboard/integrazioni", label: "Integrazioni" },
      { href: "/dashboard/import-export", label: "Import / Export" },
      { href: "/dashboard/licenza", label: "Licenza" },
    ],
  },
];

export default function ImpostazioniClient({
  user,
}: {
  user: { nome: string; cognome: string; email: string; role: string };
}) {
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

  const toggle = (href: string) => {
    const next = hidden.includes(href) ? hidden.filter((item) => item !== href) : [...hidden, href];
    setHidden(next);
    writeHiddenSidebarItems(next);
  };

  const reset = () => {
    setHidden([]);
    writeHiddenSidebarItems([]);
  };

  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => user.role === "ADMIN" || (item.href !== "/dashboard/integrazioni" && item.href !== "/dashboard/licenza")),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="ops-label">Account</p>
        <h1 className="font-display mt-1 text-2xl font-bold" style={{ color: "var(--text)" }}>
          Impostazioni
        </h1>
        <p className="mt-2 text-[13px]" style={{ color: "var(--text-soft)" }}>
          Profilo, sicurezza e voci visibili nella sidebar. Le preferenze del menu valgono per questo browser.
        </p>
      </div>

      <section className="ops-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full font-display text-[13px] font-bold text-white" style={{ background: "var(--brand)" }}>
              {(user.nome[0] ?? user.email[0] ?? "U").toUpperCase()}{(user.cognome[0] ?? "").toUpperCase()}
            </span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{user.nome} {user.cognome}</p>
              <p className="text-[11px]" style={{ color: "var(--text-label)" }}>{user.email} · {user.role}</p>
            </div>
          </div>
          <Link href="/dashboard/account" className="ops-btn ops-btn--secondary ops-btn--sm">
            <KeyRound className="h-4 w-4" /> Profilo e password
          </Link>
        </div>
      </section>

      <section className="ops-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950/70 text-sky-300">
              <LayoutPanelLeft className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>Menu laterale</h2>
              <p className="mt-1 text-[11px] leading-5" style={{ color: "var(--text-label)" }}>
                Disattiva le voci che non usi. Le pagine restano raggiungibili da link diretti o dalla ricerca.
              </p>
            </div>
          </div>
          <button type="button" onClick={reset} className="ops-btn ops-btn--ghost ops-btn--sm">
            <RotateCcw className="h-3.5 w-3.5" /> Mostra tutte
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="ops-label">{group.label}</p>
              <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                {group.items.map((item) => {
                  const visible = !hidden.includes(item.href) || item.fixed;
                  return (
                    <label
                      key={item.href}
                      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-[12px] ${
                        item.fixed ? "opacity-60" : "cursor-pointer"
                      }`}
                      style={{ borderColor: "var(--surface-border)", color: "var(--text)" }}
                    >
                      <span>{item.label}{item.fixed ? " (fisso)" : ""}</span>
                      <input
                        type="checkbox"
                        checked={visible}
                        disabled={item.fixed}
                        onChange={() => toggle(item.href)}
                        className="h-4 w-4"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-start gap-3 rounded-2xl border p-4 text-[11px] leading-5" style={{ borderColor: "var(--surface-border)", background: "var(--surface-soft)", color: "var(--text-label)" }}>
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--success)" }} />
        <p>
          La personalizzazione del menu è locale al browser. Se cambi dispositivo o browser, le voci tornano tutte visibili.
        </p>
      </section>

      <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-label)" }}>
        <Settings2 className="h-3.5 w-3.5" />
        Altre impostazioni aziendali e ruoli restano nella sezione Admin.
      </div>
    </div>
  );
}

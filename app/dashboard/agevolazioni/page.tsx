"use client";

import Link from "next/link";
import {
  BadgePercent,
  ExternalLink,
  FileCheck2,
  Fuel,
  Landmark,
  Mail,
  ReceiptText,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

const opportunities = [
  {
    title: "Accise gasolio autotrasporto",
    category: "Carburante",
    icon: Fuel,
    tone: "text-amber-300",
    summary: "Aliquota ridotta/credito d'imposta sul gasolio per imprese di autotrasporto con i requisiti di legge.",
    action: "Verifica trimestre, EDI e domanda di compensazione.",
    href: "https://www.adm.gov.it/portale/agevolazione-autotrasporto",
  },
  {
    title: "Credito d'imposta carburanti",
    category: "Carburante",
    icon: ReceiptText,
    tone: "text-sky-300",
    summary: "Misure nazionali per la maggiore spesa gasolio; sportelli e FAQ cambiano con i decreti.",
    action: "Controlla decreto, FAQ e piattaforma MIT prima di preparare le fatture.",
    href: "https://www.mit.gov.it/documentazione/piattaforma-credito-dimposta-favore-imprese-di-autotrasporto-ristoro-maggiore-spesa",
  },
  {
    title: "Rimborso pedaggi Albo",
    category: "Pedaggi",
    icon: Route,
    tone: "text-violet-300",
    summary: "Riduzioni/rimborsi autostradali per imprese iscritte all'Albo, con percentuali annuali.",
    action: "Verifica percentuali, fatturato pedaggio e classe del veicolo.",
    href: "https://www.mit.gov.it/",
  },
  {
    title: "IVA estera e accise",
    category: "Internazionale",
    icon: Landmark,
    tone: "text-emerald-300",
    summary: "Recupero IVA estera e accise gasolio tramite Consorzio Italia o provider specializzati.",
    action: "Raccogli fatture/ricevute estere e verifica il paese.",
    href: "https://consorzioitalia.eu/",
  },
  {
    title: "Iperammortamento / Transizione 5.0",
    category: "Investimenti",
    icon: Truck,
    tone: "text-orange-300",
    summary: "Maggiorazione fiscale per beni strumentali nuovi e interconnessi; il SaaS in abbonamento è escluso.",
    action: "Valuta licenza capitale/on-prem e perizia asseverata.",
    href: "https://www.mimit.gov.it/it/incentivi",
  },
  {
    title: "Nuova Sabatini e Fondo Garanzia PMI",
    category: "Finanza",
    icon: ShieldCheck,
    tone: "text-teal-300",
    summary: "Contributi su beni strumentali e garanzie pubbliche per investimenti e liquidità.",
    action: "Parla con banca/Confidi e verifica i massimali.",
    href: "https://www.mimit.gov.it/it/incentivi",
  },
];

export default function AgevolazioniPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center text-2xl font-semibold text-[var(--text)]">
          <BadgePercent className="mr-2.5 h-6 w-6 text-amber-400" /> Agevolazioni e incentivi
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--text-label)]">
          Catalogo di lavoro per accise, bonus carburante, pedaggi, investimenti e bandi. Le scadenze cambiano: la fonte ufficiale resta il bando.
        </p>
      </div>

      <section className="rounded-xl border border-sky-800/60 bg-sky-950/30 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-950/70 text-sky-300">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-sky-100">Consorzio Italia e mail periodiche</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-sky-100/80">
                In arrivo: inoltro delle email del Consorzio a <span className="font-mono">agevolazioni@in.truck-radar.it</span>.
                La prossima fase le classificherà e creerà scadenze e checklist automatiche. Oggi il catalogo è manuale.
              </p>
            </div>
          </div>
          <Link href="/dashboard/documenti" className="text-xs font-semibold text-sky-300 hover:text-sky-200">
            Documenti in arrivo
          </Link>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {opportunities.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="ops-card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-soft)] ${item.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-soft)] px-2 py-0.5 text-[11px] font-semibold  text-[var(--text-label)]">
                  {item.category}
                </span>
              </div>
              <h2 className="mt-3 text-sm font-semibold text-[var(--text)]">{item.title}</h2>
              <p className="mt-2 flex-1 text-xs leading-5 text-[var(--text-label)]">{item.summary}</p>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-4 text-amber-200">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {item.action}
              </p>
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300 hover:text-sky-200"
              >
                Fonte ufficiale <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </article>
          );
        })}
      </div>

      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          <FileCheck2 className="h-4 w-4 text-emerald-400" /> Prossimi automatismi
        </h2>
        <ul className="mt-3 grid gap-2 text-xs leading-5 text-[var(--text-label)] md:grid-cols-2">
          <li>Import email Consorzio Italia e classificazione AI.</li>
          <li>Scadenze e promemoria per ogni opportunità.</li>
          <li>Checklist documenti e stato pratica.</li>
          <li>Stima del beneficio e collegamento a costi/mezzi.</li>
        </ul>
      </section>
    </div>
  );
}

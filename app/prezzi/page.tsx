import Link from "next/link";
import { ArrowRight, CalendarClock, Check, Building2, Truck, BarChart3 } from "lucide-react";
import PublicFooter from "@/components/PublicFooter";

const plans = [
  {
    key: "BASE",
    price: "99",
    label: "per mese",
    tagline: "Per piccole flotte e avvio del network.",
    limits: ["Fino a 15 mezzi", "Fino a 15 autisti", "Gestione flotta, viaggi, DDT digitale", "Documenti e scadenze con alert", "Analytics di base"],
    cta: "Prova gratis 30 giorni",
    highlight: false,
  },
  {
    key: "PRO",
    price: "199",
    label: "per mese",
    tagline: "Borsa carichi, subappalto e Smart Return completi.",
    limits: ["Fino a 50 mezzi", "Fino a 50 autisti", "Borsa Carichi e Network verificato", "Subappalto e Smart Return", "Analytics avanzate ed ESG", "Integrazioni API (GPS/TMS/ERP)"],
    cta: "Prova gratis 30 giorni",
    highlight: true,
  },
];

const faqs = [
  {
    q: "Serve comprare hardware o installare dispositivi?",
    a: "No. Truck Radar è hardware-agnostic: si collega via API ai sistemi GPS/telematica, TMS ed ERP che usi già. Non devi installare nulla di proprietario.",
  },
  {
    q: "Come funziona il periodo di prova?",
    a: "30 giorni gratuiti, senza carta di credito. Usi tutte le funzioni del piano scelto; alla scadenza decidi se attivare l'abbonamento.",
  },
  {
    q: "Cosa serve per accedere al Network?",
    a: "Il gestionale è utilizzabile subito. Per pubblicare carichi e subappaltare, l'azienda completa una verifica con documenti societari e identità del rappresentante.",
  },
  {
    q: "Dove sono conservati i dati?",
    a: "In Unione Europea, cifrati in transito e a riposo. Il tracciamento dei conducenti è gestito nel rispetto dell'art. 4 dello Statuto dei Lavoratori (L. 300/70).",
  },
  {
    q: "E se la flotta supera i limiti del piano?",
    a: "Per flotte più grandi di 50 mezzi prepariamo un piano su misura. Scrivici e definiamo insieme le condizioni.",
  },
];

export default function PrezziPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <img src="/logo.jpg" alt="Truck Radar" className="h-9 w-9 rounded-xl object-cover" />
          Truck Radar
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-slate-300 hover:text-white">Accedi</Link>
          <Link href="/register" className="rounded-xl bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500">
            Registra la tua azienda
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-10 pt-12 text-center">
        <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-blue-800/60 bg-blue-950/50 px-3 py-1 text-xs font-semibold text-blue-200">
          Prezzi trasparenti
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Un prezzo chiaro per ogni dimensione di flotta
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          30 giorni gratis, nessuna carta di credito, nessun hardware da installare. Disdici quando vuoi.
        </p>
      </section>

      <section className="mx-auto grid max-w-4xl gap-6 px-6 pb-16 md:grid-cols-2">
        {plans.map((p) => (
          <article
            key={p.key}
            className={`relative flex flex-col rounded-3xl border p-8 ${
              p.highlight
                ? "border-blue-700/70 bg-gradient-to-b from-blue-950/50 to-slate-950 shadow-2xl shadow-blue-900/20"
                : "border-slate-800 bg-slate-900/50"
            }`}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-8 rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                Più scelto
              </span>
            )}
            <h2 className="text-lg font-bold text-slate-100">{p.key}</h2>
            <p className="mt-1 text-sm text-slate-300">{p.tagline}</p>
            <div className="mt-6 flex items-end gap-1">
              <span className="text-4xl font-bold tracking-tight">€ {p.price}</span>
              <span className="mb-1 text-sm text-slate-400">/ {p.label}</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              {p.limits.map((l) => (
                <li key={l} className="flex items-start gap-2.5 text-slate-200">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                  {l}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className={`mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold ${
                p.highlight
                  ? "bg-blue-600 text-white hover:bg-blue-500"
                  : "border border-slate-700 text-slate-200 hover:border-slate-500"
              }`}
            >
              {p.cta} <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </section>

      <section className="border-y border-slate-800 bg-slate-900/50">
        <div className="mx-auto grid max-w-6xl gap-5 px-6 py-14 md:grid-cols-3">
          {[
            { icon: Building2, t: "Micro-flotte (2–5)", d: "Parti dal gestionale: mezzi, viaggi e DDT digitale." },
            { icon: Truck, t: "PMI (6–20)", d: "Margine per viaggio, scadenze e subappalto con verifica." },
            { icon: BarChart3, t: "Flotte (20–50+)", d: "Analytics, API e piani su misura oltre i 50 mezzi." },
          ].map(({ icon: Icon, t, d }) => (
            <article key={t} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <Icon className="h-6 w-6 text-blue-400" />
              <h3 className="mt-4 text-base font-bold">{t}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight">Domande frequenti</h2>
        <div className="mt-10 space-y-4">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-100 marker:hidden">
                <span className="flex items-center justify-between">
                  {f.q}
                  <span className="text-slate-500 transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-7 text-slate-300">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-800 bg-gradient-to-br from-blue-950/40 to-slate-950">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Non sei sicuro del piano giusto?</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
            Prenota una demo: analizziamo insieme la tua flotta e ti indichiamo la configurazione più adatta.
          </p>
          <Link
            href="/contatti"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-500"
          >
            <CalendarClock className="h-4 w-4" /> Prenota una demo
          </Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
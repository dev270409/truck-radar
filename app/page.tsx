import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarClock,
  FileCheck2,
  Fuel,
  Leaf,
  Lock,
  MapPin,
  Route,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
} from "lucide-react";
import PublicFooter from "@/components/PublicFooter";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const pillars = [
    {
      icon: Truck,
      title: "Flotta sotto controllo",
      text: "Mezzi, tachigrafo, revisioni, bollo, assicurazioni e scadenze in un unico ambiente, con alert automatici.",
    },
    {
      icon: Route,
      title: "Viaggi senza frammenti",
      text: "Assegna mezzo e autista, monitora lo stato e raccogli DDT e aggiornamenti direttamente dall'app dell'autista.",
    },
    {
      icon: BarChart3,
      title: "Margini reali, non solo grafici",
      text: "Costi €/km, ricavi, km a vuoto e margine per mezzo, autista e viaggio. Export CSV per il tuo commercialista.",
    },
  ];

  const aiBenefits = [
    {
      icon: Route,
      title: "Smart Return",
      metric: "-12 km a vuoto",
      text: "Il sistema propone carichi di ritorno compatibili con percorso, data e capacità del mezzo, prima nella rete interna e poi sulle borse carichi collegate.",
    },
    {
      icon: Wrench,
      title: "Manutenzione predittiva",
      metric: "Km/ore, non calendario",
      text: "Tagliandi e revisioni pianificati su chilometraggio e ore di utilizzo del mezzo: meno fermi macchina imprevisti, costo del fermo sotto controllo.",
    },
    {
      icon: Fuel,
      title: "Consumi & carburante",
      metric: "€/km e km/l",
      text: "Registro rifornimenti e consumi per mezzo, così individui derive, anomalie e mezzi che ti costano più di quanto rendono.",
    },
    {
      icon: Sparkles,
      title: "Efficienza autista",
      metric: "Puntualità e stile di guida",
      text: "Indicatori per autista su puntualità, viaggi completati ed eventi rilevanti, con suggerimenti di miglioramento misurabili.",
    },
  ];

  const segments = [
    {
      icon: Building2,
      title: "Micro-flotte (2–5 mezzi)",
      text: "Parti dal gestionale e dal DDT digitale senza stravolgere i tuoi processi. Trial 30 giorni, nessuna carta.",
    },
    {
      icon: Truck,
      title: "PMI del trasporto (6–20 mezzi)",
      text: "Controllo di margine per viaggio, scadenze e subappalto: le sezioni del Network si attivano dopo la verifica.",
    },
    {
      icon: BarChart3,
      title: "Flotte strutturate (20–50+)",
      text: "Analytics per mezzo e autista, API verso GPS/TMS/ERP esistenti e piani su misura per flotte più grandi.",
    },
  ];

  const integrations = [
    "GPS e telematica già installati (API, hardware-agnostic)",
    "TMS, ERP e sistemi di fatturazione",
    "Tachigrafo e carte carburante",
    "Borse carichi esterne collegate dal cliente",
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <img src="/logo.jpg" alt="Truck Radar" className="h-9 w-9 rounded-xl object-cover" />
          Truck Radar
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/prezzi" className="hidden text-slate-300 hover:text-white sm:block">
            Prezzi
          </Link>
          <Link href="/login" className="text-slate-300 hover:text-white">
            Accedi
          </Link>
          <Link href="/register" className="rounded-xl bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500">
            Registra la tua azienda
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-14 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-800/60 bg-blue-950/50 px-3 py-1 text-xs font-semibold text-blue-200">
            <Truck className="h-3.5 w-3.5" /> Per aziende di trasporto e logistica
          </p>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Il sistema operativo della tua flotta: mezzi, autisti, viaggi e margini in un unico posto
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Truck Radar riunisce gestione flotta, DDT digitale, tracking, analytics e Smart Return.
            Collegati ai tuoi sistemi esistenti e trasforma i dati in decisioni: meno km a vuoto, meno
            scadenze dimenticate, margini sotto controllo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-500"
            >
              Prova gratis 30 giorni <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/cerca-un-vettore"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-700/70 bg-amber-950/40 px-5 py-3 font-semibold text-amber-100 hover:bg-amber-900/40"
            >
              <Search className="h-4 w-4" /> Cerca un vettore
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            Nessuna carta di credito · Dati in UE · Il Network è riservato alle aziende verificate.
          </p>
        </div>

        {/* Mockup reale di dashboard (live map + KPI) */}
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4 shadow-2xl">
          <div className="flex items-center gap-1.5 px-2 pb-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
            <span className="ml-3 text-[11px] font-medium text-slate-400">Flotta live · Truck Radar</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
            <img
              src="/dashboard-preview.svg"
              alt="Dashboard Truck Radar con flotta live, mappa dei mezzi e indicatori di margine"
              className="h-auto w-full"
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="flex items-center text-[11px] uppercase tracking-wide text-slate-400">
                <MapPin className="mr-1 h-3.5 w-3.5 text-blue-400" /> Mezzi in viaggio
              </p>
              <p className="mt-1 text-lg font-bold text-slate-100">18 / 24</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="flex items-center text-[11px] uppercase tracking-wide text-slate-400">
                <Route className="mr-1 h-3.5 w-3.5 text-emerald-400" /> Km a vuoto
              </p>
              <p className="mt-1 text-lg font-bold text-emerald-300">-12%</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="flex items-center text-[11px] uppercase tracking-wide text-slate-400">
                <CalendarClock className="mr-1 h-3.5 w-3.5 text-amber-400" /> Scadenze 30gg
              </p>
              <p className="mt-1 text-lg font-bold text-amber-300">3</p>
            </div>
          </div>
        </div>
      </section>

      {/* PILASTRI */}
      <section className="border-y border-slate-800 bg-slate-900/50">
        <div className="mx-auto grid max-w-6xl gap-5 px-6 py-16 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <Icon className="h-6 w-6 text-blue-400" />
              <h2 className="mt-4 text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* BENEFICI AI */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-indigo-800/60 bg-indigo-950/40 px-3 py-1 text-xs font-semibold text-indigo-200">
            <Sparkles className="h-3.5 w-3.5" /> Intelligenza operativa
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Meno km a vuoto, meno fermi, più margine
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Truck Radar non è una raccolta di grafici: incrocia mezzi, autisti, viaggi, km, consumi e
            costi per darti indicazioni operative concrete, basate sui tuoi dati.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {aiBenefits.map(({ icon: Icon, title, metric, text }) => (
            <article key={title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <Icon className="h-6 w-6 text-indigo-400" />
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-indigo-300">{metric}</p>
              <h3 className="mt-1 text-base font-bold text-slate-100">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* PER CHI È */}
      <section className="border-y border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Pensato per ogni dimensione di flotta</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Dai primi 2 camion alle flotte strutturate: le funzioni crescono con te, i limiti sono chiari
            fin dall'inizio.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {segments.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <Icon className="h-6 w-6 text-blue-400" />
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
              </article>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/prezzi"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-500"
            >
              Vedi prezzi e limiti dei piani <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* INTEGRAZIONI / HARDWARE-AGNOSTIC */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-10 rounded-3xl border border-slate-800 bg-slate-900/50 p-8 md:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">
              <Server className="h-3.5 w-3.5" /> Hardware-agnostic · API-first
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">
              Collegati a ciò che la tua azienda ha già
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Non devi comprare nuovo hardware. Truck Radar si collega tramite API ai sistemi che usi
              già, così riduci costi, installazioni e complessità. Le credenziali delle integrazioni sono
              cifrate (AES-256-GCM) e mai esposte.
            </p>
          </div>
          <ul className="space-y-3">
            {integrations.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200"
              >
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* TRUST & COMPLIANCE */}
      <section className="border-y border-slate-800 bg-emerald-950/10">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-800/60 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-200">
              <Lock className="h-3.5 w-3.5" /> Sicurezza e conformità
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              Fiducia verificabile, non promesse
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Gestiamo dati aziendali, documenti e tracciamento dei mezzi: per questo sicurezza e privacy
              sono progettate dall'inizio.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <Server className="h-6 w-6 text-emerald-400" />
              <h3 className="mt-4 text-base font-bold">Dati in UE</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Dati ospitati in Unione Europea, cifrati in transito (TLS) e a riposo.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
              <h3 className="mt-4 text-base font-bold">Conforme al GDPR</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Basi giuridiche, conservazione e diritti degli interessati documentati nella privacy policy.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <FileCheck2 className="h-6 w-6 text-emerald-400" />
              <h3 className="mt-4 text-base font-bold">Tracking conducenti conforme</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Tracciamento mezzi e conducenti gestito nel rispetto dell'art. 4 dello Statuto dei
                Lavoratori (L. 300/70).
              </p>
            </article>
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <Leaf className="h-6 w-6 text-emerald-400" />
              <h3 className="mt-4 text-base font-bold">Report ESG</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Km, km a vuoto evitati e stima CO₂ per i tuoi report di sostenibilità.
              </p>
            </article>
          </div>
          <p className="mt-6 text-xs text-slate-400">
            Dettagli in <Link href="/privacy" className="text-emerald-300 hover:underline">Privacy</Link> e{" "}
            <Link href="/informativa-autisti" className="text-emerald-300 hover:underline">
              informativa conducenti
            </Link>
            .
          </p>
        </div>
      </section>

      {/* COME FUNZIONA / NETWORK VERIFICATO */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 rounded-3xl border border-slate-800 bg-slate-900/50 p-8 md:grid-cols-2">
          <div>
            <FileCheck2 className="h-7 w-7 text-blue-400" />
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Gestionale subito, Network dopo la verifica</h2>
          </div>
          <div className="text-sm leading-7 text-slate-300">
            Puoi usare il gestionale immediatamente, senza attestazioni. Per pubblicare carichi,
            subappaltare e accedere alle opportunità del Network, l'azienda completa una verifica con
            documenti societari e identità del rappresentante. I dati sensibili sono gestiti tramite
            fornitori specializzati e non vengono ceduti a terzi.
          </div>
        </div>
      </section>

      {/* CTA FINALE */}
      <section className="border-t border-slate-800 bg-gradient-to-br from-blue-950/40 to-slate-950">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Inizia a guidare i dati della tua flotta
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            Prova Truck Radar gratis per 30 giorni. Nessuna carta di credito, nessun hardware da
            installare. Preferisci parlare con noi? Prenota una demo.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-500"
            >
              Registra la tua azienda <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contatti"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-6 py-3.5 font-semibold text-slate-200 hover:border-slate-500"
            >
              <CalendarClock className="h-4 w-4" /> Prenota una demo
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
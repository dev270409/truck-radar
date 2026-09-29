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
import Logo from "@/components/Logo";

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
      text: "Il sistema propone carichi di ritorno compatibili con percorso, data e capacitè  del mezzo, prima nella rete interna e poi sulle borse carichi collegate.",
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
      metric: "Puntualitè  e stile di guida",
      text: "Indicatori per autista su puntualitè , viaggi completati ed eventi rilevanti, con suggerimenti di miglioramento misurabili.",
    },
  ];

  const segments = [
    {
      icon: Building2,
      title: "Micro-flotte (2–5 mezzi)",
      text: "Parti dal gestionale e dal DDT digitale senza stravolgere i tuoi processi. Trial 21 giorni, nessuna carta.",
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
    "GPS e telematica giè  installati (API, hardware-agnostic)",
    "TMS, ERP e sistemi di fatturazione",
    "Tachigrafo e carte carburante",
    "Borse carichi esterne collegate dal cliente",
  ];

  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 font-bold" style={{ color: "var(--text)" }}>
          <Logo />
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/prezzi" className="hidden sm:block" style={{ color: "var(--text-soft)" }}>
            Prezzi
          </Link>
          <Link href="/login" style={{ color: "var(--text-soft)" }}>
            Accedi
          </Link>
          <Link
            href="/register"
            className="rounded-xl px-4 py-2 font-semibold text-white"
            style={{ background: "var(--brand)" }}
          >
            Registra la tua azienda
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-14 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <div>
          <p
            className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: "color-mix(in oklch, var(--brand) 10%, transparent)",
              color: "var(--brand)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Truck className="h-3.5 w-3.5" /> Per aziende di trasporto e logistica
          </p>
          <h1
            className="font-display max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl"
            style={{ color: "var(--text)" }}
          >
            Il sistema operativo della tua flotta: mezzi, autisti, viaggi e margini in un unico posto
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8" style={{ color: "var(--text-soft)" }}>
            Truck Radar riunisce gestione flotta, DDT digitale, tracking, analytics e Smart Return.
            Collegati ai tuoi sistemi esistenti e trasforma i dati in decisioni: meno km a vuoto, meno
            scadenze dimenticate, margini sotto controllo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white shadow-lg"
              style={{ background: "var(--brand)", boxShadow: "0 14px 40px color-mix(in oklch, var(--brand) 22%, transparent)" }}
            >
              Prova gratis 21 giorni <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/cerca-un-vettore"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold"
              style={{
                border: "1px solid color-mix(in oklch, var(--accent) 45%, transparent)",
                background: "color-mix(in oklch, var(--accent) 10%, transparent)",
                color: "var(--accent)",
              }}
            >
              <Search className="h-4 w-4" /> Cerca un vettore
            </Link>
          </div>
          <p className="mt-4 text-sm" style={{ color: "var(--text-label)" }}>
            Nessuna carta di credito · Dati in UE · Il Network è riservato alle aziende verificate.
          </p>
        </div>

        {/* Mockup dashboard (anteprima con dati di esempio) */}
        <div className="glass-strong p-4">
          <div className="flex items-center gap-1.5 px-2 pb-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--danger)" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--warning)" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--success)" }} />
            <span className="ml-3 text-[11px] font-medium" style={{ color: "var(--text-label)" }}>
              Anteprima dashboard
            </span>
            <span
              className="ml-auto rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider"
              style={{ background: "color-mix(in oklch, var(--warning) 16%, transparent)", color: "var(--accent)" }}
            >
              Dati di esempio
            </span>
          </div>
          <div className="glass-panel overflow-hidden">
            <img
              src="/dashboard-preview.svg"
              alt="Anteprima della dashboard Truck Radar con mappa dei mezzi e indicatori (dati di esempio)"
              className="h-auto w-full"
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="glass p-3">
              <p className="ops-label flex items-center">
                <MapPin className="mr-1 h-3.5 w-3.5" style={{ color: "var(--info)" }} /> Mezzi in viaggio
              </p>
              <p className="font-display mt-1 text-lg font-bold" style={{ color: "var(--text)" }}>18 / 24</p>
            </div>
            <div className="glass p-3">
              <p className="ops-label flex items-center">
                <Route className="mr-1 h-3.5 w-3.5" style={{ color: "var(--success)" }} /> Km a vuoto
              </p>
              <p className="font-display mt-1 text-lg font-bold" style={{ color: "var(--success)" }}>-12%</p>
            </div>
            <div className="glass p-3">
              <p className="ops-label flex items-center">
                <CalendarClock className="mr-1 h-3.5 w-3.5" style={{ color: "var(--warning)" }} /> Scadenze 30gg
              </p>
              <p className="font-display mt-1 text-lg font-bold" style={{ color: "var(--warning)" }}>3</p>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px]" style={{ color: "var(--text-label-soft)" }}>
            Valori dimostrativi per mostrare la dashboard. I tuoi dati reali appariranno dopo la registrazione.
          </p>
        </div>
      </section>

      {/* PILASTRI */}
      <section className="border-y" style={{ borderColor: "var(--glass-border)", background: "var(--surface-soft)" }}>
        <div className="mx-auto grid max-w-6xl gap-5 px-6 py-16 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, text }) => (
            <article key={title} className="glass p-6">
              <Icon className="h-6 w-6" style={{ color: "var(--brand)" }} />
              <h2 className="font-display mt-4 text-lg font-bold" style={{ color: "var(--text)" }}>{title}</h2>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-soft)" }}>{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* BENEFICI AI */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <p
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: "color-mix(in oklch, var(--brand) 10%, transparent)",
              color: "var(--brand)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Intelligenza operativa
          </p>
          <h2 className="font-display mt-4 text-3xl font-bold tracking-tight md:text-4xl" style={{ color: "var(--text)" }}>
            Meno km a vuoto, meno fermi, più margine
          </h2>
          <p className="mt-3 text-sm leading-7" style={{ color: "var(--text-soft)" }}>
            Truck Radar non è una raccolta di grafici: incrocia mezzi, autisti, viaggi, km, consumi e
            costi per darti indicazioni operative concrete, basate sui tuoi dati.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {aiBenefits.map(({ icon: Icon, title, metric, text }) => (
            <article key={title} className="glass p-6">
              <Icon className="h-6 w-6" style={{ color: "var(--brand)" }} />
              <p className="mt-4 text-xs font-bold uppercase tracking-wide" style={{ color: "var(--brand)" }}>{metric}</p>
              <h3 className="font-display mt-1 text-base font-bold" style={{ color: "var(--text)" }}>{title}</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-soft)" }}>{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* PER CHI èˆ */}
      <section className="border-y" style={{ borderColor: "var(--glass-border)", background: "var(--surface-soft)" }}>
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl" style={{ color: "var(--text)" }}>
            Pensato per ogni dimensione di flotta
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7" style={{ color: "var(--text-soft)" }}>
            Dai primi 2 camion alle flotte strutturate: le funzioni crescono con te, i limiti sono chiari
            fin dall'inizio.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {segments.map(({ icon: Icon, title, text }) => (
              <article key={title} className="glass p-6">
                <Icon className="h-6 w-6" style={{ color: "var(--brand)" }} />
                <h3 className="font-display mt-4 text-lg font-bold" style={{ color: "var(--text)" }}>{title}</h3>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-soft)" }}>{text}</p>
              </article>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/prezzi"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
              style={{ border: "1px solid var(--glass-border)", color: "var(--text)" }}
            >
              Vedi prezzi e limiti dei piani <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* INTEGRAZIONI / HARDWARE-AGNOSTIC */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="glass grid items-center gap-10 p-8 md:grid-cols-2">
          <div>
            <p
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "var(--surface-soft)", color: "var(--text-soft)", border: "1px solid var(--glass-border)" }}
            >
              <Server className="h-3.5 w-3.5" /> Hardware-agnostic · API-first
            </p>
            <h2 className="font-display mt-4 text-3xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              Collegati a ciò che la tua azienda ha giè 
            </h2>
            <p className="mt-3 text-sm leading-7" style={{ color: "var(--text-soft)" }}>
              Non devi comprare nuovo hardware. Truck Radar si collega tramite API ai sistemi che usi
              giè , così riduci costi, installazioni e complessitè . Le credenziali delle integrazioni sono
              cifrate (AES-256-GCM) e mai esposte.
            </p>
          </div>
          <ul className="space-y-3">
            {integrations.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl p-4 text-sm"
                style={{ background: "var(--surface-soft)", border: "1px solid var(--glass-border)", color: "var(--text)" }}
              >
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: "var(--success)" }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* TRUST & COMPLIANCE */}
      <section className="border-y" style={{ borderColor: "var(--glass-border)", background: "color-mix(in oklch, var(--success) 6%, transparent)" }}>
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "color-mix(in oklch, var(--success) 10%, transparent)", color: "var(--success)", border: "1px solid var(--glass-border)" }}
            >
              <Lock className="h-3.5 w-3.5" /> Sicurezza e conformitè 
            </p>
            <h2 className="font-display mt-4 text-3xl font-bold tracking-tight md:text-4xl" style={{ color: "var(--text)" }}>
              Fiducia verificabile, non promesse
            </h2>
            <p className="mt-3 text-sm leading-7" style={{ color: "var(--text-soft)" }}>
              Gestiamo dati aziendali, documenti e tracciamento dei mezzi: per questo sicurezza e privacy
              sono progettate dall'inizio.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <article className="glass p-6">
              <Server className="h-6 w-6" style={{ color: "var(--success)" }} />
              <h3 className="font-display mt-4 text-base font-bold" style={{ color: "var(--text)" }}>Dati in UE</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-soft)" }}>
                Dati ospitati in Unione Europea, cifrati in transito (TLS) e a riposo.
              </p>
            </article>
            <article className="glass p-6">
              <ShieldCheck className="h-6 w-6" style={{ color: "var(--success)" }} />
              <h3 className="font-display mt-4 text-base font-bold" style={{ color: "var(--text)" }}>Conforme al GDPR</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-soft)" }}>
                Basi giuridiche, conservazione e diritti degli interessati documentati nella privacy policy.
              </p>
            </article>
            <article className="glass p-6">
              <FileCheck2 className="h-6 w-6" style={{ color: "var(--success)" }} />
              <h3 className="font-display mt-4 text-base font-bold" style={{ color: "var(--text)" }}>Tracking conducenti conforme</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-soft)" }}>
                Tracciamento mezzi e conducenti gestito nel rispetto dell'art. 4 dello Statuto dei
                Lavoratori (L. 300/70).
              </p>
            </article>
            <article className="glass p-6">
              <Leaf className="h-6 w-6" style={{ color: "var(--success)" }} />
              <h3 className="font-display mt-4 text-base font-bold" style={{ color: "var(--text)" }}>Report ESG</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-soft)" }}>
                Km, km a vuoto evitati e stima COâ‚‚ per i tuoi report di sostenibilitè .
              </p>
            </article>
          </div>
          <p className="mt-6 text-xs" style={{ color: "var(--text-label)" }}>
            Dettagli in <Link href="/privacy" className="hover:underline" style={{ color: "var(--brand)" }}>Privacy</Link> e{" "}
            <Link href="/informativa-autisti" className="hover:underline" style={{ color: "var(--brand)" }}>
              informativa conducenti
            </Link>
            .
          </p>
        </div>
      </section>

      {/* COME FUNZIONA / NETWORK VERIFICATO */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="glass grid gap-10 p-8 md:grid-cols-2">
          <div>
            <FileCheck2 className="h-7 w-7" style={{ color: "var(--brand)" }} />
            <h2 className="font-display mt-4 text-3xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              Gestionale subito, Network dopo la verifica
            </h2>
          </div>
          <div className="text-sm leading-7" style={{ color: "var(--text-soft)" }}>
            Puoi usare il gestionale immediatamente, senza attestazioni. Per pubblicare carichi,
            subappaltare e accedere alle opportunitè  del Network, l'azienda completa una verifica con
            documenti societari e identitè  del rappresentante. I dati sensibili sono gestiti tramite
            fornitori specializzati e non vengono ceduti a terzi.
          </div>
        </div>
      </section>

      {/* CTA FINALE */}
      <section
        className="border-t"
        style={{ borderColor: "var(--glass-border)", background: "color-mix(in oklch, var(--brand) 8%, transparent)" }}
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl" style={{ color: "var(--text)" }}>
            Inizia a guidare i dati della tua flotta
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7" style={{ color: "var(--text-soft)" }}>
            Prova Truck Radar gratis per 21 giorni. Nessuna carta di credito, nessun hardware da
            installare. Preferisci parlare con noi? Prenota una demo.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-white shadow-lg"
              style={{ background: "var(--brand)", boxShadow: "0 14px 40px color-mix(in oklch, var(--brand) 22%, transparent)" }}
            >
              Registra la tua azienda <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contatti"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-semibold"
              style={{ border: "1px solid var(--glass-border)", color: "var(--text)" }}
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
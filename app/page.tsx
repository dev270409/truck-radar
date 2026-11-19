import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  Check,
  FileText,
  Fuel,
  Handshake,
  MapPin,
  Radar,
  Route,
  ShieldCheck,
  Truck,
} from "lucide-react";
import PublicFooter from "@/components/PublicFooter";
import Logo from "@/components/Logo";

function AppFrame() {
  const rows = [
    ["Arredi Carpigiani", "Carpi → Verona", "Da confermare"],
    ["Edil Tricolore", "Reggio Emilia → Brescia", "Preventivo"],
    ["Cantina Neri", "Modena → Bologna", "In viaggio"],
  ];
  return (
    <div className="app-frame w-full min-w-0 max-w-full overflow-hidden" data-theme="dark">
      <div className="app-frame__bar">
        <span className="app-frame__dot app-frame__dot--accent" />
        <span className="app-frame__dot" />
        <span className="app-frame__dot" />
        <span className="ml-3 text-[11px]" style={{ color: "var(--text-label)" }}>Truck Radar · Oggi</span>
        <span className="ml-auto chip chip-success">Live</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[88px_1fr]">
        <div className="app-frame__side hidden p-3 sm:block">
          {["Oggi", "Viaggi", "Carico", "Preventivi", "Ordini", "Scadenze"].map((label, i) => (
            <div
              key={label}
              className="mb-1 rounded-[6px] px-2 py-1.5 text-[10px]"
              style={{
                background: i === 0 ? "color-mix(in oklab, var(--brand) 16%, transparent)" : "transparent",
                color: i === 0 ? "var(--brand)" : "var(--text-label)",
              }}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="min-w-0 overflow-hidden p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold" style={{ color: "var(--text-label)" }}>Piano di carico</p>
              <p className="font-display text-[18px] font-bold" style={{ color: "var(--text)" }}>Motrice · 7,50 m</p>
            </div>
            <span className="chip chip-brand">Ci sta</span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["Metri lineari", "4,8 m"],
              ["Peso", "5.880 kg"],
              ["Costo/km", "0,71 €"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[8px] p-2" style={{ background: "var(--surface-soft)" }}>
                <p className="text-[9px]" style={{ color: "var(--text-label)" }}>{label}</p>
                <p className="font-display text-[15px] font-bold" style={{ color: "var(--text)" }}>{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-[10px] p-2" style={{ background: "var(--surface-soft)" }}>
            <svg viewBox="0 0 360 150" className="w-full max-w-full" style={{ minWidth: 0 }} role="img" aria-label="Anteprima piano di carico con bancali sistemati sul camion">
              <rect x="12" y="30" width="300" height="92" rx="6" fill="none" stroke="var(--text-label-soft)" strokeDasharray="5 4" />
              {[
                [20, 38, 44, 76, "#e8541f"],
                [70, 38, 44, 76, "#6bb6ff"],
                [120, 38, 62, 36, "#35c2a0"],
                [120, 80, 62, 34, "#f0b429"],
                [188, 38, 52, 76, "#e8541f"],
                [246, 38, 46, 76, "#6bb6ff"],
              ].map(([x, y, w, h, c], i) => (
                <rect key={i} x={x} y={y} width={w} height={h} rx="4" fill={String(c)} opacity="0.85" stroke="#121417" />
              ))}
              <circle cx="322" cy="52" r="12" fill="none" stroke="var(--text-label-soft)" />
              <circle cx="322" cy="100" r="12" fill="none" stroke="var(--text-label-soft)" />
            </svg>
          </div>

          <div className="mt-3 space-y-1.5">
            {rows.map(([name, route, status], i) => (
              <div key={name} className="flex items-center justify-between gap-2 rounded-[8px] px-2 py-1.5" style={{ background: i === 2 ? "color-mix(in oklab, var(--success) 10%, transparent)" : "var(--surface)" }}>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold" style={{ color: "var(--text)" }}>{name}</p>
                  <p className="truncate text-[9px]" style={{ color: "var(--text-label)" }}>{route}</p>
                </div>
                <span className={`chip ${i === 2 ? "chip-success" : i === 1 ? "chip-info" : "chip-warning"}`}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const features = [
    { icon: Truck, title: "Flotta e scadenze", text: "Revisioni, bollo, assicurazione, tachigrafo e patenti. Un avviso prima che scada." },
    { icon: Route, title: "Viaggi e DDT", text: "Assegna mezzo e autista, traccia la consegna, raccogli DDT e firme dall'app." },
    { icon: Boxes, title: "Piano di carico", text: "Colli, metri lineari, peso sugli assi e vista 3D. Sai prima di partire se ci sta." },
    { icon: FileText, title: "Preventivi e ordini", text: "Prezzo, costo e margine. Il cliente ordina dalla sua pagina, tu confermi con un clic." },
    { icon: BarChart3, title: "Giri e costi", text: "Meno chilometri, pedaggi e gasolio calcolati. Prezzo consigliato per ogni viaggio." },
    { icon: Fuel, title: "Carburante e accise", text: "Cisterne, consumi reali e prospetto accise trimestrale, senza fogli Excel." },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b" style={{ background: "var(--bg-grad-a)", borderColor: "var(--surface-border)" }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Link href="/" aria-label="Truck Radar — home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] font-medium md:flex" style={{ color: "var(--text-soft)" }}>
            <a href="#funzioni" className="hover:opacity-70">Funzioni</a>
            <a href="#network" className="hover:opacity-70">Network</a>
            <a href="#prezzi" className="hover:opacity-70">Prezzi</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden px-2 py-2 text-[13px] font-medium sm:block" style={{ color: "var(--text-soft)" }}>
              Accedi
            </Link>
            <Link href="/register" className="ops-btn ops-btn--primary ops-btn--sm">
              Prova gratis
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl gap-12 px-5 pb-24 pt-16 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:pt-24">
        <div className="min-w-0">
          <p className="ops-eyebrow">
            <Radar className="h-4 w-4" /> Gestionale per autotrasporto
          </p>
          <h1 className="ops-title mt-4 text-[42px] leading-[1.02] sm:text-5xl md:text-[68px]">
            Il gestionale per chi muove merci.
          </h1>
          <p className="ops-subtitle mt-6 max-w-xl text-[17px] leading-8">
            Flotta, viaggi, DDT, piano di carico, preventivi e margini.
            In un unico posto, senza cambiare il modo in cui lavori.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="ops-btn ops-btn--primary">
              Prova gratis 21 giorni <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#funzioni" className="ops-btn ops-btn--secondary">
              Guarda le funzioni
            </a>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[12px]" style={{ color: "var(--text-label)" }}>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5" style={{ color: "var(--success)" }} /> Nessuna carta di credito</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--success)" }} /> Dati in UE</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" style={{ color: "var(--success)" }} /> Supporto in italiano</span>
          </div>
        </div>
        <AppFrame />
      </section>

      <section id="funzioni" className="border-t px-5 py-24" style={{ borderColor: "var(--surface-border)" }}>
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="ops-eyebrow">Ogni giorno, in un posto</p>
            <h2 className="ops-title mt-3 text-4xl md:text-5xl">Meno telefono. Meno Excel. Più controllo.</h2>
            <p className="ops-subtitle mt-4">
              Le cose che fai ogni giorno con la flotta, finalmente collegate tra loro.
            </p>
          </div>
          <div className="mt-10 grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="ops-card ops-card--soft p-5">
                <p className="ops-label">Nato in un&apos;azienda di trasporti</p>
                <p className="mt-3 font-display text-[20px] font-bold leading-tight" style={{ color: "var(--text)" }}>
                  Non in un ufficio marketing.
                </p>
                <p className="mt-2 text-[13px] leading-6" style={{ color: "var(--text-soft)" }}>
                  Le funzioni nascono dai problemi di ogni giorno: il camion che si carica male, il preventivo fatto a occhio, la revisione scoperta tardi.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4" style={{ borderColor: "var(--surface-border)" }}>
                  <div>
                    <p className="font-display text-[24px] font-bold" style={{ color: "var(--text)" }}>2–50+</p>
                    <p className="text-[11px]" style={{ color: "var(--text-label)" }}>mezzi gestiti</p>
                  </div>
                  <div>
                    <p className="font-display text-[24px] font-bold" style={{ color: "var(--text)" }}>UE</p>
                    <p className="text-[11px]" style={{ color: "var(--text-label)" }}>dati e infrastruttura</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--surface-border)" }}>
              {features.map(({ icon: Icon, title, text }, index) => (
                <article key={title} className="group grid grid-cols-[32px_1fr_auto] items-start gap-4 py-6 transition hover:pl-1">
                  <span className="font-mono text-[11px]" style={{ color: "var(--text-label-soft)" }}>0{index + 1}</span>
                  <div>
                    <h3 className="font-display text-[18px] font-bold" style={{ color: "var(--text)" }}>{title}</h3>
                    <p className="mt-1 max-w-xl text-[14px] leading-6" style={{ color: "var(--text-soft)" }}>{text}</p>
                  </div>
                  <Icon className="mt-1 h-5 w-5 opacity-40 transition group-hover:opacity-100" style={{ color: "var(--brand)" }} />
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t px-5 py-24" style={{ borderColor: "var(--surface-border)" }}>
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <p className="ops-eyebrow">Per chi è</p>
            <h2 className="ops-title mt-3 text-4xl md:text-5xl">Non per tutte le flotte. Per quelle che vogliono vedere i numeri.</h2>
            <p className="ops-subtitle mt-4">
              Dal titolare che guida ancora al commerciale che gestisce cinquanta mezzi: ogni ruolo ha la sua vista, senza fogli paralleli.
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--surface-border)" }}>
            {[
              ["2–5 mezzi", "Il titolare usa il gestionale e l'app autista. DDT, scadenze e costi in un posto solo."],
              ["6–20 mezzi", "Ufficio e autisti lavorano sugli stessi viaggi. Preventivi, carico e margini per viaggio."],
              ["20–50+ mezzi", "Analytics, API, ruoli e integrazioni. La flotta entra nel network e nei subappalti verificati."],
            ].map(([title, text]) => (
              <div key={title} className="grid gap-2 py-6 md:grid-cols-[160px_1fr]">
                <p className="font-display text-[17px] font-bold" style={{ color: "var(--text)" }}>{title}</p>
                <p className="text-[14px] leading-6" style={{ color: "var(--text-soft)" }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-24" data-theme="dark" style={{ background: "var(--bg-grad-a)" }}>
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <p className="ops-eyebrow">Dal carico al margine</p>
            <h2 className="ops-title mt-3 text-4xl text-[var(--text)] md:text-5xl">Un viaggio, un prezzo, un margine. Senza rifare i conti.</h2>
            <p className="ops-subtitle mt-4 text-[var(--text-soft)]">
              Dal packing list al preventivo, dal giro al DDT: i dati restano collegati.
            </p>
            <div className="mt-8 space-y-4">
              {[
                ["01", "Carica", "Fotografa il packing list, scegli il mezzo, controlla peso e ingombro."],
                ["02", "Preventiva", "Calcola peso tassato, costo viaggio e prezzo con margine."],
                ["03", "Controlla", "DDT, POD, incassi e costo/km restano sullo stesso viaggio."],
              ].map(([n, title, text]) => (
                <div key={n} className="flex gap-4">
                  <span className="font-mono text-[12px]" style={{ color: "var(--brand)" }}>{n}</span>
                  <div>
                    <p className="font-display text-[16px] font-bold" style={{ color: "var(--text)" }}>{title}</p>
                    <p className="mt-1 text-[14px] leading-6" style={{ color: "var(--text-soft)" }}>{text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 border-t pt-5" style={{ borderColor: "var(--surface-border)" }}>
              <div>
                <p className="font-display text-[30px] font-bold leading-none" style={{ color: "var(--text)" }}>4,8 m</p>
                <p className="mt-1 text-[11px]" style={{ color: "var(--text-label)" }}>metri lineari</p>
              </div>
              <div>
                <p className="font-display text-[30px] font-bold leading-none" style={{ color: "var(--text)" }}>5.880 kg</p>
                <p className="mt-1 text-[11px]" style={{ color: "var(--text-label)" }}>peso caricato</p>
              </div>
              <div>
                <p className="font-display text-[30px] font-bold leading-none" style={{ color: "var(--text)" }}>0,71 €</p>
                <p className="mt-1 text-[11px]" style={{ color: "var(--text-label)" }}>costo al km</p>
              </div>
            </div>
          </div>
          <div className="ops-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-display text-[18px] font-bold" style={{ color: "var(--text)" }}>Preventivo · Carpi → Verona</p>
              <span className="chip chip-success">Margine 22%</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ["Prezzo", "540 €"],
                ["Costo", "421 €"],
                ["Margine", "119 €"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[8px] p-3" style={{ background: "var(--surface-soft)" }}>
                  <p className="text-[10px]" style={{ color: "var(--text-label)" }}>{label}</p>
                  <p className="font-display text-[18px] font-bold" style={{ color: "var(--text)" }}>{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {[
                ["6 bancali · 2.800 kg tassati", "Peso"],
                ["4,8 m lineari · motrice 7,50 m", "Carico"],
                ["Pedaggi A22 · 38 €", "Costo"],
                ["Consegna entro 14:30", "Tempo"],
              ].map(([text, tag]) => (
                <div key={text} className="flex items-center justify-between gap-3 rounded-[8px] px-3 py-2" style={{ background: "var(--surface-soft)" }}>
                  <span className="text-[13px]" style={{ color: "var(--text-soft)" }}>{text}</span>
                  <span className="text-[10px] font-semibold" style={{ color: "var(--text-label)" }}>{tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="network" className="border-t px-5 py-24" style={{ borderColor: "var(--surface-border)" }}>
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="ops-eyebrow">Network</p>
            <h2 className="ops-title mt-3 text-4xl md:text-5xl">Non sei solo. Sei in rete.</h2>
            <p className="ops-subtitle mt-4">
              Le aziende verificate possono pubblicare carichi, subappaltare e trovare ritorni compatibili.
              La reputazione resta pubblica, i dati restano tuoi.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Borsa carichi", "Subappalto", "Smart Return", "Recensioni verificate"].map((tag) => (
                <span key={tag} className="chip chip-brand">{tag}</span>
              ))}
            </div>
          </div>
          <div className="ops-card p-6">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="space-y-3">
                {["Azienda A", "Azienda B", "Azienda C"].map((name) => (
                  <div key={name} className="flex items-center gap-2 rounded-[8px] border px-3 py-2" style={{ borderColor: "var(--surface-border)" }}>
                    <Building2 className="h-4 w-4" style={{ color: "var(--brand)" }} />
                    <span className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>{name}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="h-10 w-px" style={{ background: "var(--surface-border)" }} />
                <span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: "var(--brand)", color: "#fff" }}>
                  <Handshake className="h-5 w-5" />
                </span>
                <span className="h-10 w-px" style={{ background: "var(--surface-border)" }} />
              </div>
              <div className="space-y-3">
                {["Ritorno Milano → Roma", "Carico Verona → Bari", "Subappalto 12 t"].map((name) => (
                  <div key={name} className="flex items-center gap-2 rounded-[8px] border px-3 py-2" style={{ borderColor: "var(--surface-border)" }}>
                    <Route className="h-4 w-4" style={{ color: "var(--success)" }} />
                    <span className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>{name}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-6 text-center text-[12px]" style={{ color: "var(--text-label)" }}>
              Match interno prima, borse esterne collegate dopo.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t px-5 py-24" style={{ borderColor: "var(--surface-border)" }}>
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="ops-eyebrow">Integrazioni</p>
            <h2 className="ops-title mt-3 text-4xl md:text-5xl">Si collega a quello che hai già.</h2>
            <p className="ops-subtitle mt-4">
              Non devi cambiare GPS, TMS o carte carburante. Truck Radar orchestra i dati e li rende utili.
            </p>
          </div>
          <div className="mt-8 divide-y border-y" style={{ borderColor: "var(--surface-border)" }}>
            {[
              ["Geotab e GPS", "Posizioni, viaggi e km reali dalla telematica già installata.", "Read-only"],
              ["TMS, ERP e fatturazione", "API e import CSV per far dialogare i sistemi esistenti.", "API + CSV"],
              ["Carte carburante", "Rifornimenti, consumi e costo/km senza doppio inserimento.", "Import"],
            ].map(([title, text, tag]) => (
              <div key={title} className="grid gap-2 py-5 md:grid-cols-[220px_1fr_auto] md:items-center">
                <h3 className="font-display text-[16px] font-bold" style={{ color: "var(--text)" }}>{title}</h3>
                <p className="text-[14px] leading-6" style={{ color: "var(--text-soft)" }}>{text}</p>
                <span className="chip chip-brand">{tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="prezzi" className="border-t px-5 py-24" style={{ borderColor: "var(--surface-border)" }}>
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="ops-eyebrow">Prezzi</p>
            <h2 className="ops-title mt-3 text-4xl md:text-5xl">Un prezzo chiaro, per ogni fase.</h2>
            <p className="ops-subtitle mt-4">Prova 21 giorni senza carta. Poi scegli il piano che serve alla tua flotta.</p>
          </div>
          <div className="mt-10 divide-y border-y" style={{ borderColor: "var(--surface-border)" }}>
            {[
              {
                name: "BASE",
                price: "59 €",
                desc: "Per iniziare: flotta, viaggi, DDT, scadenze e analytics di base.",
                features: ["Fino a 15 mezzi e 15 autisti", "DDT digitale e scadenze", "Piano di carico e preventivi", "Supporto in italiano"],
                cta: "Inizia con BASE",
                primary: false,
              },
              {
                name: "PRO",
                price: "199 €",
                desc: "Per flotte strutturate: network, analytics avanzate e integrazioni.",
                features: ["Fino a 50 mezzi e 50 autisti", "Network, marketplace e subappalto", "Analytics, API e integrazioni", "Supporto prioritario"],
                cta: "Prova PRO gratis",
                primary: true,
              },
            ].map((plan) => (
              <div key={plan.name} className="grid gap-5 py-8 md:grid-cols-[220px_1fr_1.2fr_auto] md:items-start">
                <div>
                  <p className="ops-label" style={{ color: plan.primary ? "var(--brand)" : undefined }}>{plan.name}</p>
                  <p className="mt-1 font-display text-4xl font-bold" style={{ color: "var(--text)" }}>
                    {plan.price}<span className="text-[13px] font-medium" style={{ color: "var(--text-label)" }}> / mese</span>
                  </p>
                </div>
                <p className="text-[14px] leading-6" style={{ color: "var(--text-soft)" }}>{plan.desc}</p>
                <ul className="grid gap-2 text-[13px] sm:grid-cols-2" style={{ color: "var(--text-soft)" }}>
                  {plan.features.map((x) => (
                    <li key={x} className="flex items-center gap-2"><Check className="h-4 w-4 flex-none" style={{ color: "var(--success)" }} /> {x}</li>
                  ))}
                </ul>
                <Link href="/register" className={`ops-btn ${plan.primary ? "ops-btn--primary" : "ops-btn--secondary"} md:self-center`}>{plan.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t px-5 py-24" style={{ borderColor: "var(--surface-border)" }}>
        <div className="mx-auto max-w-3xl">
          <p className="ops-eyebrow">Domande</p>
          <h2 className="ops-title mt-3 text-4xl">Le cose che chiedono tutti.</h2>
          <div className="mt-8 divide-y" style={{ borderColor: "var(--surface-border)" }}>
            {[
              ["Devo cambiare il gestionale che uso già?", "No. Puoi importare mezzi, clienti e viaggi da CSV e continuare a usare i tuoi sistemi."],
              ["I miei dati sono al sicuro?", "Dati in UE, accessi separati per azienda, cifratura in transito e a riposo, export quando vuoi."],
              ["Quanto dura la prova?", "21 giorni, senza carta di credito. Alla fine decidi tu se attivare un piano."],
              ["Funziona da telefono?", "Sì. La dashboard e l'app autista funzionano da browser e come PWA."],
            ].map(([q, a]) => (
              <details key={q} className="py-5">
                <summary className="cursor-pointer font-display text-[16px] font-bold" style={{ color: "var(--text)" }}>{q}</summary>
                <p className="mt-2 text-[14px] leading-6" style={{ color: "var(--text-soft)" }}>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5" data-theme="dark" style={{ background: "var(--bg-grad-a)" }}>
        <div className="mx-auto max-w-6xl py-20">
          <div className="flex flex-wrap items-end justify-between gap-8 border-t pt-10" style={{ borderColor: "var(--surface-border)" }}>
            <div className="max-w-xl">
              <p className="ops-eyebrow">Inizia oggi</p>
              <h2 className="ops-title mt-3 text-4xl text-[var(--text)] md:text-5xl">Porta la tua flotta sotto controllo.</h2>
              <p className="ops-subtitle mt-4 text-[var(--text-soft)]">Prova con i tuoi mezzi, i tuoi clienti e i tuoi viaggi. 21 giorni, senza carta.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="ops-btn ops-btn--primary">Prova gratis <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/login" className="ops-btn ops-btn--secondary">Accedi</Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}

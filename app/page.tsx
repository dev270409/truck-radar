import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, Check, FileText, Fuel, Route, Truck } from "lucide-react";
import PublicFooter from "@/components/PublicFooter";
import Logo from "@/components/Logo";
import { HeroMotionTitle, HeroMotionLead, HeroMotionActions, HeroPrimaryCTA, HeroPreviewWrapper } from "@/components/landing/HeroMotion";
import { RouteFlowLine } from "@/components/landing/RouteFlowLine";

const capabilities = [
  {
    icon: Truck,
    title: "Registra i mezzi",
    text: "Tieni visibili documenti e scadenze della flotta.",
  },
  {
    icon: Route,
    title: "Assegna i viaggi",
    text: "Crea le tratte e assegna mezzo e autista dalla stessa lista.",
  },
  {
    icon: FileText,
    title: "Importa i rendiconti",
    text: "Controlla le righe riconosciute prima di confermare i viaggi.",
  },
  {
    icon: BarChart3,
    title: "Confronta costi e ricavi",
    text: "Leggi i chilometri e i ricavi importati. Le stime carburante sono indicate.",
  },
];

const flowSteps = [
  {
    title: "Importa il rendiconto",
    text: "Il PDF viene letto e le righe estratte restano disponibili per il controllo.",
  },
  {
    title: "Verifica gli abbinamenti",
    text: "I suggerimenti Geotab non sostituiscono la conferma quando un match è incerto.",
  },
  {
    title: "Conferma il viaggio",
    text: "I viaggi confermati entrano nella lista, pronti per l’assegnazione.",
  },
];

const plans = [
  {
    key: "BASE",
    price: "59",
    vehicles: "Fino a 15 mezzi",
    drivers: "Fino a 15 autisti",
  },
  {
    key: "PRO",
    price: "199",
    vehicles: "Fino a 50 mezzi",
    drivers: "Fino a 50 autisti",
  },
];

const faqs = [
  {
    question: "Serve una carta per iniziare?",
    answer: "No. La registrazione avvia la prova senza chiedere una carta di pagamento.",
  },
  {
    question: "Quanto dura la prova?",
    answer: "La prova dura 21 giorni sul piano scelto. Alla scadenza puoi decidere se attivare un abbonamento.",
  },
  {
    question: "È necessario collegare Geotab?",
    answer: "No. Puoi gestire mezzi e viaggi senza collegarlo. Se è collegato, i dati disponibili possono essere usati per gli abbinamenti e il benchmark.",
  },
  {
    question: "Il benchmark mostra anche stime?",
    answer: "Sì. Quando mancano i rifornimenti registrati, il costo del carburante è stimato e indicato come tale. Copertura e fonti restano visibili.",
  },
  {
    question: "Che cosa succede dopo la prova?",
    answer: "Per continuare, completa la verifica aziendale richiesta nell’account e attiva il piano dalla sezione Abbonamento.",
  },
];

function ProductPreview() {
  const steps = [
    {
      number: "01",
      title: "Rendiconto importato",
      detail: "Righe estratte da controllare",
      status: "Pronto",
      tone: "chip-success",
    },
    {
      number: "02",
      title: "Abbinamento flotta",
      detail: "Suggerimento da verificare",
      status: "Controllo",
      tone: "chip-warning",
    },
    {
      number: "03",
      title: "Viaggio",
      detail: "Mezzo e autista da assegnare",
      status: "In attesa",
      tone: "chip-info",
    },
  ];

  return (
    <div
      role="img"
      aria-label="Anteprima illustrativa del flusso Truck Radar: importazione di un rendiconto, verifica di un abbinamento e assegnazione di un viaggio"
      className="app-frame w-full min-w-0 max-w-full"
      data-theme="dark"
    >
      <div className="app-frame__bar">
        <span className="app-frame__dot app-frame__dot--accent" />
        <span className="app-frame__dot" />
        <span className="app-frame__dot" />
        <span className="ml-2 text-xs" style={{ color: "var(--text-label)" }}>Truck Radar · Viaggi</span>
        <span className="ml-auto chip chip-brand">Anteprima</span>
      </div>

      <div aria-hidden="true" className="grid grid-cols-1 sm:grid-cols-[132px_1fr]">
        <aside className="app-frame__side hidden p-3 sm:block">
          <p className="mb-3 px-2 text-[11px] font-medium" style={{ color: "var(--text-label)" }}>Operatività</p>
          <div className="space-y-1 text-xs">
            {["Panoramica", "Viaggi", "Rendiconti", "Flotta"].map((item, index) => (
              <div
                key={item}
                className="rounded-md px-2.5 py-2"
                style={{
                  background: index === 2 ? "color-mix(in oklab, var(--brand) 16%, transparent)" : "transparent",
                  color: index === 2 ? "var(--brand)" : "var(--text-label)",
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--surface-border)" }}>
            <div>
              <p className="ops-label">Rendiconti e viaggi</p>
              <p className="font-display mt-1 text-xl font-semibold" style={{ color: "var(--text)" }}>
                Dal documento alla flotta
              </p>
            </div>
          </div>

          <ol className="mt-4 space-y-2.5">
            {steps.map((step) => (
              <li
                key={step.number}
                className="flex min-w-0 items-center gap-3 rounded-lg border px-3 py-3"
                style={{ borderColor: "var(--surface-border)", background: "var(--surface-soft)" }}
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md font-mono text-xs"
                  style={{ background: "var(--surface-strong)", color: step.number === "02" ? "var(--accent)" : "var(--brand)" }}
                >
                  {step.number}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: "var(--text)" }}>{step.title}</p>
                  <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text-label)" }}>{step.detail}</p>
                </div>
                <span className={`chip hidden shrink-0 sm:inline-flex ${step.tone}`}>{step.status}</span>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-3 text-xs" style={{ borderColor: "var(--surface-border)", color: "var(--text-label)" }}>
            <span>Fonte km: Geotab o viaggi registrati</span>
            <span>Stime: indicate separatamente</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <>
      <header className="sticky top-0 z-30 border-b" style={{ background: "var(--bg-grad-a)", borderColor: "var(--surface-border)" }}>
        <div className="wrap flex h-16 items-center justify-between gap-3">
          <a
            href="#contenuto"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--surface)] focus:px-4 focus:py-3 focus:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
          >
            Vai al contenuto
          </a>
          <Link href="/" aria-label="Truck Radar — home" className="shrink-0">
            <span className="sm:hidden"><Logo size={34} withWordmark={false} /></span>
            <span className="hidden sm:block"><Logo size={38} /></span>
          </Link>

          <nav aria-label="Navigazione principale" className="hidden items-center gap-7 text-sm md:flex" style={{ color: "var(--text-soft)" }}>
            <a href="#funzioni" className="hover:text-[var(--text)]">Funzioni</a>
            <a href="#flusso" className="hover:text-[var(--text)]">Flusso</a>
            <a href="#prezzi" className="hover:text-[var(--text)]">Prezzi</a>
          </nav>

          <div className="flex items-center gap-2">
            <details className="relative md:hidden">
              <summary className="ops-btn ops-btn--secondary min-h-11 cursor-pointer list-none px-3">
                Menu
              </summary>
              <nav
                aria-label="Navigazione mobile"
                className="absolute right-0 top-full mt-2 grid min-w-44 gap-1 rounded-xl border p-2 shadow-lg"
                style={{ background: "var(--surface)", borderColor: "var(--surface-border)" }}
              >
                <a href="#funzioni" className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-[var(--surface-soft)]">Funzioni</a>
                <a href="#flusso" className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-[var(--surface-soft)]">Flusso</a>
                <a href="#prezzi" className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-[var(--surface-soft)]">Prezzi</a>
              </nav>
            </details>
            <Link href="/login" className="hidden px-2 py-2 text-sm font-medium sm:block" style={{ color: "var(--text-soft)" }}>
              Accedi
            </Link>
            <Link href="/register?plan=BASE" className="ops-btn ops-btn--primary min-h-11 px-3">
              Prova Truck Radar
            </Link>
          </div>
        </div>
      </header>

      <main id="contenuto">
        <section data-enter aria-labelledby="hero-title" className="py-8 lg:py-16">
          <div className="wrap grid min-h-[calc(100svh-128px)] items-center gap-6 lg:min-h-[calc(100svh-192px)] lg:grid-cols-2 lg:gap-6">
          <div className="landing-hero-copy min-w-0">
            <p className="ops-eyebrow">Flotta · Viaggi · Rendiconti</p>
            <HeroMotionTitle>
              Gestionale per aziende di autotrasporto
            </HeroMotionTitle>
            <HeroMotionLead>
              Organizza i mezzi, assegna i viaggi e importa i rendiconti. Se colleghi Geotab, puoi verificare gli abbinamenti con i dati disponibili.
            </HeroMotionLead>
            <HeroMotionActions>
              <HeroPrimaryCTA href="/register?plan=BASE">
                Prova Truck Radar
              </HeroPrimaryCTA>
            </HeroMotionActions>
            <p className="mt-5 text-sm" style={{ color: "var(--text-label)" }}>
              21 giorni di prova · Nessuna carta richiesta
            </p>
          </div>

          <HeroPreviewWrapper>
            <ProductPreview />
          </HeroPreviewWrapper>
          </div>
        </section>

        <section id="funzioni" className="scroll-mt-20 py-20 lg:py-24">
          <div className="wrap grid gap-10 lg:grid-cols-2 lg:gap-6">
            <div className="max-w-xl">
              <p className="ops-eyebrow">Operatività</p>
              <h2 className="ops-title mt-3 text-balance text-3xl md:text-5xl">
                Le attività della flotta, collegate ai viaggi
              </h2>
              <p className="ops-subtitle mt-4">
                Parti dai dati che hai. Le funzioni mostrano lo stato dei mezzi, dei viaggi e dei rendiconti senza trasformare le stime in valori registrati.
              </p>
            </div>

            <div className="divide-y" style={{ borderColor: "var(--surface-border)" }}>
              {capabilities.map(({ icon: Icon, title, text }) => (
                <article key={title} className="grid grid-cols-[28px_1fr] gap-4 py-5 sm:grid-cols-[32px_150px_1fr] sm:items-start">
                  <Icon data-icon={title.toLowerCase().replaceAll(" ", "-")} className="mt-0.5 h-5 w-5" style={{ color: "var(--brand)" }} aria-hidden="true" />
                  <h3 className="font-display text-base font-semibold" style={{ color: "var(--text)" }}>{title}</h3>
                  <p className="col-start-2 text-sm leading-6 sm:col-start-3" style={{ color: "var(--text-soft)" }}>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="flusso" data-theme="dark" className="scroll-mt-20 py-20 lg:py-24" style={{ background: "var(--bg-grad-a)" }}>
          <div className="wrap">
            <div className="max-w-2xl">
              <p className="ops-eyebrow">Dal documento al viaggio</p>
              <h2 className="ops-title mt-3 text-balance text-3xl text-[var(--text)] md:text-5xl">
                Verifica gli abbinamenti
              </h2>
              <p className="ops-subtitle mt-4 text-[var(--text-soft)]">
                Importazione, confronto con la flotta e conferma avvengono in passaggi distinti. I casi incerti non vengono assegnati in automatico.
              </p>
            </div>

            <div className="relative mt-12" data-visual="route-flow">
              <RouteFlowLine />
              <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
                {flowSteps.map((step, index) => (
                  <li key={step.title} className="relative z-10 flex gap-4 md:flex-col md:items-center md:text-center">
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border font-mono text-xs"
                      style={{
                        background: "var(--bg-grad-a)",
                        borderColor: index === 1 ? "var(--accent)" : "var(--surface-border)",
                        color: index === 1 ? "var(--accent)" : "var(--brand)",
                      }}
                    >
                      0{index + 1}
                    </span>
                    <div className="max-w-sm">
                      <h3 className="font-display text-base font-semibold text-[var(--text)]">{step.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="py-20 lg:py-24">
          <div className="wrap grid gap-10 lg:grid-cols-2 lg:gap-6">
            <div className="max-w-xl">
              <p className="ops-eyebrow">Fonti dei dati</p>
              <h2 className="ops-title mt-3 text-balance text-3xl md:text-5xl">
                Copertura del benchmark
              </h2>
              <p className="ops-subtitle mt-4">
                Ricavi, chilometri e costi possono arrivare da fonti diverse. Truck Radar li distingue e segnala quando un dato è una stima o copre solo una parte dei viaggi.
              </p>
            </div>

            <dl className="divide-y border-y" style={{ borderColor: "var(--surface-border)" }}>
              {[
                { icon: Route, title: "Chilometri", source: "Geotab collegato o km registrati nei viaggi" },
                { icon: FileText, title: "Ricavi", source: "Rendiconti importati e collegati ai viaggi" },
                { icon: Fuel, title: "Carburante", source: "Rifornimenti registrati o stima indicata" },
              ].map(({ icon: Icon, title, source }) => (
                <div key={title} className="grid gap-2 py-5 sm:grid-cols-[150px_1fr] sm:gap-5">
                  <dt className="flex items-center gap-2 font-display text-base font-semibold" style={{ color: "var(--text)" }}>
                    <Icon data-icon={title.toLowerCase()} className="h-4 w-4 shrink-0" style={{ color: "var(--brand)" }} aria-hidden="true" />
                    {title}
                  </dt>
                  <dd className="text-sm leading-6" style={{ color: "var(--text-soft)" }}>{source}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="prezzi" className="scroll-mt-20 py-20 lg:py-24" style={{ background: "var(--surface-soft)" }}>
          <div className="wrap">
            <div className="max-w-2xl">
              <p className="ops-eyebrow">Prezzi</p>
              <h2 className="ops-title mt-3 text-balance text-3xl md:text-5xl">
                Piani e prezzi per la flotta
              </h2>
              <p className="ops-subtitle mt-4">
                La prova dura 21 giorni e non richiede una carta. Il piano scelto viene applicato anche alla registrazione.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {plans.map((plan) => (
                <article key={plan.key} className="ops-card flex flex-col p-6 md:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-xl font-semibold" style={{ color: "var(--text)" }}>{plan.key}</h3>
                      <p className="mt-1 text-sm" style={{ color: "var(--text-soft)" }}>
                        {plan.key === "BASE" ? "Per flotte fino a 15 mezzi" : "Per flotte fino a 50 mezzi"}
                      </p>
                    </div>
                    <span className="rounded-md border px-2.5 py-1 text-xs font-medium" style={{ borderColor: "var(--surface-border)", color: "var(--text-label)" }}>
                      {plan.key === "BASE" ? "15 mezzi" : "50 mezzi"}
                    </span>
                  </div>

                  <p className="mt-7 font-display text-4xl font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                    €{plan.price}<span className="ml-2 text-sm font-normal" style={{ color: "var(--text-label)" }}>/ mese</span>
                  </p>

                  <ul className="mt-6 space-y-3 border-t pt-5 text-sm" style={{ borderColor: "var(--surface-border)", color: "var(--text-soft)" }}>
                    {[plan.vehicles, plan.drivers, "Prova di 21 giorni"].map((item) => (
                      <li key={item} className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 shrink-0" style={{ color: "var(--brand)" }} aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/register?plan=${plan.key}`}
                    className={`ops-btn mt-7 w-full ${plan.key === "PRO" ? "ops-btn--primary" : "ops-btn--secondary"}`}
                  >
                    Prova {plan.key} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 lg:py-24">
          <div className="wrap">
            <p className="ops-eyebrow">Domande frequenti</p>
            <h2 className="ops-title mt-3 text-balance text-3xl md:text-5xl">Domande sulla prova</h2>
            <div className="mt-7 divide-y" style={{ borderColor: "var(--surface-border)" }}>
              {faqs.map((faq) => (
                <article key={faq.question} className="py-5">
                  <h3 className="font-display text-base font-semibold" style={{ color: "var(--text)" }}>{faq.question}</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: "var(--text-soft)" }}>{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

      </main>

      <PublicFooter showTrialCta />
    </>
  );
}

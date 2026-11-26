import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Boxes, FileText, Fuel, Route } from "lucide-react";
import PublicFooter from "@/components/PublicFooter";
import Logo from "@/components/Logo";
import { HeroMotionTitle, HeroMotionLead, HeroMotionActions, HeroPrimaryCTA } from "@/components/landing/HeroMotion";
import { RouteFlowLine } from "@/components/landing/RouteFlowLine";
import { TruckCargoVisual } from "@/components/landing/TruckCargoVisual";

export const revalidate = 0;

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b"
        style={{ background: "var(--bg-grad-a)", borderColor: "var(--surface-border)" }}
      >
        <div className="wrap flex h-16 items-center justify-between gap-3">
          <Link href="/" aria-label="Truck Radar — home" className="shrink-0">
            <span className="sm:hidden"><Logo size={34} withWordmark={false} /></span>
            <span className="hidden sm:block"><Logo size={38} /></span>
          </Link>

          <nav
            aria-label="Navigazione principale"
            className="hidden items-center gap-7 text-sm md:flex"
            style={{ color: "var(--text-soft)" }}
          >
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
            <Link
              href="/login"
              className="hidden px-2 py-2 text-sm font-medium sm:block"
              style={{ color: "var(--text-soft)" }}
            >
              Accedi
            </Link>
            <Link href="/register?plan=BASE" className="ops-btn ops-btn--primary min-h-11 px-4">
              Prova Truck Radar
            </Link>
          </div>
        </div>
      </header>

      <main id="contenuto">
        {/* ======== HERO: camion che si carica ======== */}
        <section aria-labelledby="hero-title" className="py-8 lg:py-16">
          <div className="wrap grid min-h-[calc(100svh-128px)] items-center gap-8 lg:min-h-[calc(100svh-192px)] lg:grid-cols-[0.92fr_1.08fr] lg:gap-10">
            <div className="min-w-0">
              <p className="ops-eyebrow">Flotta · Viaggi · Rendiconti</p>
              <HeroMotionTitle>
                Gestionale per aziende di autotrasporto
              </HeroMotionTitle>
              <HeroMotionLead>
                Organizza i mezzi, assegna i viaggi e importa i rendiconti.
                Se colleghi Geotab, puoi verificare gli abbinamenti con i dati disponibili.
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

            {/* Camion che si carica — il momento visivo */}
            <div
              className="ops-card relative overflow-hidden p-4 md:p-6"
              style={{ background: "var(--surface)" }}
            >
              <p className="ops-label mb-4">Piano di carico · esempio interattivo</p>
              <TruckCargoVisual />
              <div
                className="mt-4 flex items-center justify-between border-t pt-3 text-[11px]"
                style={{ borderColor: "var(--surface-border)", color: "var(--text-label)" }}
              >
                <span>Ogni collo è verificato prima della partenza</span>
                <span style={{ color: "var(--brand)" }} className="font-semibold">
                  Apri il piano di carico →
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ======== FUNZIONI: lista operativa, non card ======== */}
        <section id="funzioni" className="scroll-mt-20 py-16 lg:py-20">
          <div className="wrap">
            <div className="max-w-xl">
              <p className="ops-eyebrow">Operatività</p>
              <h2 className="ops-title mt-3 text-balance text-3xl md:text-4xl">
                Le attività della flotta, collegate ai viaggi
              </h2>
              <p className="ops-subtitle mt-4">
                Parti dai dati che hai. Le funzioni mostrano lo stato di mezzi,
                viaggi e rendiconti senza trasformare le stime in valori registrati.
              </p>
            </div>

            <dl
              className="mt-10 divide-y border-t"
              style={{ borderColor: "var(--surface-border)" }}
            >
              {[
                {
                  icon: Route,
                  term: "Mezzi e scadenze",
                  desc: "Registra i veicoli, tieni sotto controllo revisioni, bollo, assicurazione e patenti. Un avviso prima che scada.",
                },
                {
                  icon: FileText,
                  term: "Rendiconti e Geotab",
                  desc: "Importa i PDF dei rendiconti. Se hai Geotab collegato, i viaggi riconosciuti vengono abbinati automaticamente. I casi incerti li verifichi tu.",
                },
                {
                  icon: Fuel,
                  term: "Costi e carburante",
                  desc: "Registra i rifornimenti o lascia che il sistema stimi il consumo di categoria. Vedi sempre quale numero è reale e quale è stimato.",
                },
                {
                  icon: Boxes,
                  term: "Assegnazione",
                  desc: "Dalla lista dei viaggi scegli mezzo e autista. Un'assegnazione richiede una conferma deliberata: niente clic accidentali.",
                },
              ].map(({ icon: Icon, term, desc }) => (
                <div
                  key={term}
                  className="grid gap-3 py-6 sm:grid-cols-[200px_1fr] sm:gap-8"
                  style={{ borderColor: "var(--surface-border)" }}
                >
                  <dt className="flex items-start gap-2.5">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--brand)" }} aria-hidden="true" />
                    <span className="font-display text-base font-semibold" style={{ color: "var(--text)" }}>
                      {term}
                    </span>
                  </dt>
                  <dd className="text-sm leading-6" style={{ color: "var(--text-soft)" }}>
                    {desc}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ======== FLUSSO: rendiconto → match → viaggio ======== */}
        <section
          id="flusso"
          data-theme="dark"
          className="scroll-mt-20 py-16 lg:py-20"
          style={{ background: "var(--bg-grad-a)" }}
        >
          <div className="wrap">
            <div className="max-w-2xl">
              <p className="ops-eyebrow">Dal documento al viaggio</p>
              <h2 className="ops-title mt-3 text-balance text-3xl text-[var(--text)] md:text-4xl">
                Verifica gli abbinamenti
              </h2>
              <p className="ops-subtitle mt-4 text-[var(--text-soft)]">
                Importazione, confronto con la flotta e conferma avvengono in passaggi
                distinti. I casi incerti non vengono assegnati in automatico.
              </p>
            </div>

            <div className="relative mt-10" data-visual="route-flow">
              <RouteFlowLine />
              <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
                {[
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
                    text: "I viaggi confermati entrano nella lista, pronti per l'assegnazione.",
                  },
                ].map((step, index) => (
                  <li
                    key={step.title}
                    className="relative z-10 flex gap-4 md:flex-col md:items-center md:text-center"
                  >
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

        {/* ======== DATI: fonte per fonte ======== */}
        <section className="py-16 lg:py-20">
          <div className="wrap grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
            <div className="max-w-md">
              <p className="ops-eyebrow">Fonti dei dati</p>
              <h2 className="ops-title mt-3 text-balance text-3xl md:text-4xl">
                Copertura del benchmark
              </h2>
              <p className="ops-subtitle mt-4">
                Ricavi, chilometri e costi possono arrivare da fonti diverse.
                Truck Radar li distingue e segnala quando un dato è una stima
                o copre solo una parte dei viaggi.
              </p>
            </div>

            <dl className="divide-y border-y" style={{ borderColor: "var(--surface-border)" }}>
              {[
                {
                  icon: Route,
                  title: "Chilometri",
                  source: "Geotab collegato o km registrati nei viaggi",
                  detail: "Ogni mezzo ha la sua fonte. Se manca Geotab, i km vengono dai viaggi registrati.",
                },
                {
                  icon: FileText,
                  title: "Ricavi",
                  source: "Rendiconti importati e collegati ai viaggi",
                  detail: "Solo importi confermati. I tracciati senza rendiconto non generano ricavi fantasma.",
                },
                {
                  icon: Fuel,
                  title: "Carburante",
                  source: "Rifornimenti registrati o stima indicata",
                  detail: "Quando mancano i rifornimenti, il consumo è stimato per categoria. È scritto chiaramente.",
                },
              ].map(({ icon: Icon, title, source, detail }) => (
                <div
                  key={title}
                  className="grid gap-2 py-5 sm:grid-cols-[140px_1fr] sm:gap-6"
                >
                  <dt className="flex items-center gap-2 font-display text-base font-semibold" style={{ color: "var(--text)" }}>
                    <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--brand)" }} aria-hidden="true" />
                    {title}
                  </dt>
                  <dd>
                    <p className="text-sm leading-6" style={{ color: "var(--text-soft)" }}>{source}</p>
                    <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-label)" }}>{detail}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ======== PREZZI: tabella, non card ======== */}
        <section
          id="prezzi"
          className="scroll-mt-20 py-16 lg:py-20"
          style={{ background: "var(--surface-soft)" }}
        >
          <div className="wrap">
            <div className="max-w-2xl">
              <p className="ops-eyebrow">Prezzi</p>
              <h2 className="ops-title mt-3 text-balance text-3xl md:text-4xl">
                Piani e prezzi per la flotta
              </h2>
              <p className="ops-subtitle mt-4">
                La prova dura 21 giorni e non richiede una carta. Il piano scelto
                viene applicato anche alla registrazione.
              </p>
            </div>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b text-left text-xs"
                    style={{ borderColor: "var(--surface-border)", color: "var(--text-label)" }}
                  >
                    <th className="pb-3 pr-6 font-medium">Piano</th>
                    <th className="pb-3 pr-6 font-medium">Mezzi</th>
                    <th className="pb-3 pr-6 font-medium">Autisti</th>
                    <th className="pb-3 pr-6 font-medium">Prezzo</th>
                    <th className="pb-3 font-medium">Prova</th>
                  </tr>
                </thead>
                <tbody style={{ color: "var(--text-soft)" }}>
                  {[
                    { key: "BASE", vehicles: "Fino a 15", drivers: "Fino a 15", price: "59", primary: false },
                    { key: "PRO", vehicles: "Fino a 50", drivers: "Fino a 50", price: "199", primary: true },
                  ].map((plan) => (
                    <tr
                      key={plan.key}
                      className="border-b transition-colors"
                      style={{ borderColor: "var(--surface-border)" }}
                    >
                      <td className="py-5 pr-6">
                        <span
                          className="font-display text-base font-semibold"
                          style={{ color: plan.primary ? "var(--brand)" : "var(--text)" }}
                        >
                          {plan.key}
                        </span>
                      </td>
                      <td className="py-5 pr-6">{plan.vehicles}</td>
                      <td className="py-5 pr-6">{plan.drivers}</td>
                      <td className="py-5 pr-6">
                        <span
                          className="font-display text-xl font-semibold tabular-nums"
                          style={{ color: "var(--text)" }}
                        >
                          €{plan.price}
                        </span>
                        <span className="ml-1 text-xs" style={{ color: "var(--text-label)" }}>/mese</span>
                      </td>
                      <td className="py-5">
                        <Link
                          href={`/register?plan=${plan.key}`}
                          className={`ops-btn ${plan.primary ? "ops-btn--primary" : "ops-btn--secondary"} ops-btn--sm`}
                        >
                          Prova {plan.key}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-xs" style={{ color: "var(--text-label)" }}>
              Oltre 50 mezzi: contattaci per un piano su misura.
            </p>
          </div>
        </section>

        {/* ======== FAQ: risposte aperte, non accordion ======== */}
        <section className="py-16 lg:py-20">
          <div className="wrap">
            <p className="ops-eyebrow">Domande frequenti</p>
            <h2 className="ops-title mt-3 text-balance text-3xl md:text-4xl">Domande sulla prova</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  q: "Serve una carta per iniziare?",
                  a: "No. La registrazione avvia la prova senza chiedere una carta di pagamento.",
                },
                {
                  q: "Quanto dura la prova?",
                  a: "21 giorni sul piano scelto. Alla scadenza decidi se attivare un abbonamento.",
                },
                {
                  q: "È necessario collegare Geotab?",
                  a: "No. Puoi gestire mezzi e viaggi senza. Se è collegato, i dati disponibili servono per abbinamenti e benchmark.",
                },
                {
                  q: "Il benchmark mostra anche stime?",
                  a: "Sì. Quando mancano i rifornimenti, il carburante è stimato e indicato. Copertura e fonti restano visibili.",
                },
                {
                  q: "Che cosa succede dopo la prova?",
                  a: "Completa la verifica aziendale richiesta nell'account e attiva il piano dalla sezione Abbonamento.",
                },
                {
                  q: "Funziona da telefono?",
                  a: "Sì. La dashboard funziona da browser, come PWA. L'area autista è progettata per il telefono.",
                },
              ].map((faq) => (
                <article key={faq.q}>
                  <h3 className="font-display text-base font-semibold" style={{ color: "var(--text)" }}>
                    {faq.q}
                  </h3>
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-soft)" }}>
                    {faq.a}
                  </p>
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

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
        {/* ======== HERO ======== */}
        <section aria-labelledby="hero-title" className="py-8 lg:py-16">
          <div className="wrap grid min-h-[calc(100svh-128px)] items-center gap-8 lg:min-h-[calc(100svh-192px)] lg:grid-cols-[0.88fr_1.12fr] lg:gap-10">
            <div className="min-w-0">
              <HeroMotionTitle>
                Flotta, rendiconti e costi. Senza fogli Excel.
              </HeroMotionTitle>
              <HeroMotionLead>
                Importi il rendiconto del mese, il sistema riconosce i viaggi e li
                abbinia alla flotta. Se un match è incerto, lo vedi e decidi tu.
                Tutto il resto — scadenze, assegnazioni, carburante — sta nello stesso posto.
              </HeroMotionLead>
              <HeroMotionActions>
                <HeroPrimaryCTA href="/register?plan=BASE">
                  Prova Truck Radar
                </HeroPrimaryCTA>
              </HeroMotionActions>
              <p className="mt-5 text-sm" style={{ color: "var(--text-label)" }}>
                21 giorni · Nessuna carta · Nessuna configurazione obbligatoria
              </p>
            </div>

            {/* Camion che si carica */}
            <div
              className="ops-card relative min-w-0 overflow-hidden p-5 md:p-7"
              style={{ background: "var(--surface)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="ops-label">Piano di carico</p>
                <span className="font-mono text-[11px]" style={{ color: "var(--text-label-soft)" }}>
                  esempio · nessun dato reale
                </span>
              </div>
              <div className="mt-4">
                <TruckCargoVisual />
              </div>
              <p
                className="mt-5 border-t pt-4 text-xs"
                style={{ borderColor: "var(--surface-border)", color: "var(--text-label)" }}
              >
                Misura i colli prima di partire, non dopo.
              </p>
            </div>
          </div>
        </section>

        {/* ======== COSA FA ======== */}
        <section id="funzioni" className="scroll-mt-20 py-16 lg:py-20">
          <div className="wrap">
            <h2 className="ops-title text-balance text-3xl md:text-4xl">
              Quattro cose, fatte bene
            </h2>

            <dl
              className="mt-10 divide-y border-t"
              style={{ borderColor: "var(--surface-border)" }}
            >
              {[
                {
                  icon: Route,
                  term: "Scadenze dei mezzi",
                  desc: "Revisioni, bollo, assicurazione, tachigrafo, patenti. Quando un documento sta per scadere, lo sai con anticipo — non quando ti fermano.",
                },
                {
                  icon: FileText,
                  term: "Rendiconti importati",
                  desc: "Carichi il PDF del rendiconto. Il sistema legge le righe, riconosce le tratte e — se hai Geotab — abbina i viaggi. Quelli ambigui li controlli tu, uno per uno.",
                },
                {
                  icon: Fuel,
                  term: "Costo per chilometro",
                  desc: "Registri i rifornimenti oppure lasci che il consumo venga stimato per categoria. In entrambi i casi, sai quale numero è reale e quale è un'approssimazione.",
                },
                {
                  icon: Boxes,
                  term: "Assegnazione",
                  desc: "Dalla lista scegli mezzo e autista. La conferma richiede un'azione deliberata — tieni premuto il bottone. Niente assegnazioni sbagliate per un clic distratto.",
                },
              ].map(({ icon: Icon, term, desc }) => (
                <div
                  key={term}
                  className="grid gap-3 py-7 sm:grid-cols-[220px_1fr] sm:gap-10"
                >
                  <dt className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--brand)" }} aria-hidden="true" />
                    <span className="font-display text-base font-semibold" style={{ color: "var(--text)" }}>
                      {term}
                    </span>
                  </dt>
                  <dd className="max-w-xl text-sm leading-7" style={{ color: "var(--text-soft)" }}>
                    {desc}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ======== FLUSSO ======== */}
        <section
          id="flusso"
          data-theme="dark"
          className="scroll-mt-20 py-16 lg:py-20"
          style={{ background: "var(--bg-grad-a)" }}
        >
          <div className="wrap">
            <div className="max-w-2xl">
              <h2 className="ops-title text-balance text-3xl text-[var(--text)] md:text-4xl">
                Dal rendiconto al viaggio, in tre passaggi
              </h2>
              <p className="ops-subtitle mt-4 text-[var(--text-soft)]">
                Nessun passo è automatico al cento per cento. Il sistema propone,
                tu confermi. I casi dubbii restano dubbi fino a quando non li risolvi.
              </p>
            </div>

            <div className="relative mt-10" data-visual="route-flow">
              <RouteFlowLine />
              <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
                {[
                  {
                    title: "Carica il PDF",
                    text: "Il rendiconto viene letto e le righe estratte restano visibili per il controllo.",
                  },
                  {
                    title: "Controlla i match",
                    text: "Geotab suggerisce l'abbinamento. Se è incerto, il sistema non decide per te.",
                  },
                  {
                    title: "Assegna e parti",
                    text: "Il viaggio confermato entra nella lista. Mezzo e autista si scelgono da lì.",
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

        {/* ======== PREZZI ======== */}
        <section
          id="prezzi"
          className="scroll-mt-20 py-16 lg:py-20"
          style={{ background: "var(--surface-soft)" }}
        >
          <div className="wrap">
            <h2 className="ops-title text-balance text-3xl md:text-4xl">
              Due piani, nessuna sorpresa
            </h2>

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
              Oltre 50 mezzi: scrivici, troviamo il piano giusto.
            </p>
          </div>
        </section>

        {/* ======== FAQ ======== */}
        <section className="py-16 lg:py-20">
          <div className="wrap">
            <h2 className="ops-title text-balance text-3xl md:text-4xl">
              Le cose che ci chiedono al telefono
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  q: "Serve una carta?",
                  a: "No. La registrazione avvia la prova e non chiede alcun pagamento.",
                },
                {
                  q: "Devo collegare Geotab?",
                  a: "No, funziona anche senza. Se lo colleghi, hai abbinamenti automatici e benchmark più precisi.",
                },
                {
                  q: "Quanto dura la prova?",
                  a: "21 giorni sul piano che scegli. Poi decidi se attivare l'abbonamento o no.",
                },
                {
                  q: "E se ho già un gestionale?",
                  a: "Puoi importare mezzi, clienti e viaggi da CSV. Nessuno ti obbliga a migrare tutto il primo giorno.",
                },
                {
                  q: "I miei dati dove finiscono?",
                  a: "Ogni azienda ha il suo spazio separato. Le credenziali delle integrazioni sono cifrate. Puoi esportare quando vuoi.",
                },
                {
                  q: "Funziona dal telefono?",
                  a: "Sì, dal browser. L'area autista è pensata per l'uso in movimento.",
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

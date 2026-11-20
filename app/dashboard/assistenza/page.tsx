import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { isTrialActive, trialDaysLeft } from "@/lib/onboarding";
import { FAQ_GROUPS, TUTORIALS } from "@/lib/tutorials";
import TutorialLibrary from "@/components/TutorialLibrary";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  CircleHelp,
  LifeBuoy,
  PlayCircle,
  Sparkles,
} from "lucide-react";

export default async function AssistenzaPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const company = await db.company.findUnique({
    where: { id: session.user.companyId },
    select: { subscriptionStatus: true, trialEndsAt: true },
  });

  const trialActive =
    company?.subscriptionStatus === "TRIAL" && isTrialActive(company.trialEndsAt);
  const daysLeft = trialActive ? trialDaysLeft(company.trialEndsAt) : null;

  return (
    <div className="space-y-8">
      <section className="ops-card overflow-hidden p-0">
        <div
          className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-7"
          style={{
            background:
              "radial-gradient(700px 260px at 92% 8%, color-mix(in oklab, var(--brand) 18%, transparent), transparent 70%)",
          }}
        >
          <div>
            <p className="ops-label">Assistenza</p>
            <h1 className="ops-title mt-1 text-2xl md:text-3xl">Guide e risposte rapide</h1>
            <p className="ops-subtitle mt-2 max-w-2xl text-[14px]">
              Video brevi per ogni area, FAQ operative e un canale diretto per parlarci.
              Le guide restano disponibili anche dopo la prova gratuita.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <a href="#guide" className="ops-btn ops-btn--primary ops-btn--sm">
                <PlayCircle className="h-4 w-4" />
                Guarda i video
              </a>
              <a href="#faq" className="ops-btn ops-btn--secondary ops-btn--sm">
                <BookOpen className="h-4 w-4" />
                Vai alle FAQ
              </a>
              <Link href="/contatti" className="ops-btn ops-btn--ghost ops-btn--sm">
                <LifeBuoy className="h-4 w-4" />
                Parla con il team
              </Link>
            </div>
          </div>
          <div className="hidden h-24 w-24 place-items-center rounded-[24px] md:grid" style={{ background: "var(--surface-soft)", border: "1px solid var(--surface-border)" }}>
            <CircleHelp className="h-10 w-10" style={{ color: "var(--brand)" }} />
          </div>
        </div>
      </section>

      {trialActive && (
        <section
          className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{
            borderColor: "color-mix(in oklab, var(--brand) 30%, var(--surface-border))",
            background: "color-mix(in oklab, var(--brand) 7%, var(--surface))",
          }}
        >
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 flex-none" style={{ color: "var(--brand)" }} />
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                Prova gratuita{daysLeft !== null ? ` · ${daysLeft} giorni rimasti` : ""}
              </p>
              <p className="mt-0.5 text-[12px]" style={{ color: "var(--text-soft)" }}>
                Hai accesso a tutte le funzioni. Guarda i video mentre provi il gestionale:
                li ritroverai qui anche dopo la prova.
              </p>
            </div>
          </div>
          <Link href="/dashboard/abbonamenti" className="ops-btn ops-btn--secondary ops-btn--sm flex-none">
            Vedi il piano
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      )}

      <section id="guide" className="scroll-mt-24 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="ops-label">Video</p>
            <h2 className="font-display mt-1 text-xl font-bold" style={{ color: "var(--text)" }}>
              Guide per pagina
            </h2>
          </div>
          <p className="text-[12px]" style={{ color: "var(--text-label)" }}>
            {TUTORIALS.length} video · con sottotitoli
          </p>
        </div>
        <TutorialLibrary tutorials={TUTORIALS} />
      </section>

      <section id="faq" className="scroll-mt-24 space-y-3">
        <div>
          <p className="ops-label">FAQ</p>
          <h2 className="font-display mt-1 text-xl font-bold" style={{ color: "var(--text)" }}>
            Domande frequenti
          </h2>
          <p className="mt-1 max-w-2xl text-[13px]" style={{ color: "var(--text-soft)" }}>
            Le risposte ai passaggi che servono più spesso. Se non trovi la tua, scrivici.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {FAQ_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2.5">
              <h3 className="ops-label">{group.title}</h3>
              {group.items.map((item) => (
                <details key={item.question} className="ops-card group p-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                    <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                      {item.question}
                    </span>
                    <ChevronDown
                      className="faq-chevron h-4 w-4 flex-none transition"
                      style={{ color: "var(--text-label-soft)" }}
                    />
                  </summary>
                  <div className="border-t px-4 py-3.5" style={{ borderColor: "var(--surface-border)" }}>
                    <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-soft)" }}>
                      {item.answer}
                    </p>
                    {item.cta && (
                      <Link
                        href={item.cta.href}
                        className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold"
                        style={{ color: "var(--brand)" }}
                      >
                        {item.cta.label}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </details>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="ops-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-[14px] font-bold" style={{ color: "var(--text)" }}>
            Non hai trovato la risposta?
          </p>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-soft)" }}>
            Scrivici cosa stavi facendo e su quale pagina. Ti rispondiamo con i passaggi o con una verifica.
          </p>
        </div>
        <Link href="/contatti" className="ops-btn ops-btn--primary ops-btn--sm flex-none">
          Contatta il team
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </div>
  );
}

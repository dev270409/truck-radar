import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Logo from "./Logo";

/**
 * Footer pubblico riutilizzabile (landing, prezzi, pagine legali, funnel).
 * Usa i token semantici così funziona in light e dark mode.
 */
export default function PublicFooter({ showTrialCta = false }: { showTrialCta?: boolean }) {
  const link = { color: "var(--text-soft)" } as const;
  return (
    <footer
      className="border-t py-10"
      style={{ borderColor: "var(--glass-border)" }}
    >
      {showTrialCta && (
        <div className="wrap grid items-center gap-6 border-b py-12 md:grid-cols-[1fr_auto]" style={{ borderColor: "var(--glass-border)" }}>
          <div className="max-w-2xl">
            <p className="ops-label">Truck Radar</p>
            <h2 className="ops-title mt-3 text-balance text-3xl md:text-5xl">
              Prova Truck Radar con i dati della tua flotta
            </h2>
            <p className="ops-subtitle mt-3">
              Crea l’account e scegli BASE o PRO. La prova dura 21 giorni, senza carta.
            </p>
          </div>
          <Link href="/register?plan=BASE" className="ops-btn ops-btn--primary shrink-0">
            Prova Truck Radar <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
      <div className={`wrap flex flex-col gap-6 md:flex-row md:items-start md:justify-between ${showTrialCta ? "py-10" : ""}`}>
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-xs leading-6" style={{ color: "var(--text-soft)" }}>
            Flotta, viaggi e rendiconti per le aziende di autotrasporto.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-xs sm:grid-cols-3">
          <div className="space-y-2">
            <p className="ops-label">Prodotto</p>
            <Link href="/prezzi" className="block" style={link}>
              Prezzi
            </Link>
            <Link href="/cerca-un-vettore" className="block" style={link}>
              Cerca un vettore
            </Link>
            <Link href="/login" className="block" style={link}>
              Accedi
            </Link>
          </div>
          <div className="space-y-2">
            <p className="ops-label">Legale</p>
            <Link href="/privacy" className="block" style={link}>
              Privacy
            </Link>
            <Link href="/termini" className="block" style={link}>
              Termini
            </Link>
            <Link href="/cookie" className="block" style={link}>
              Cookie
            </Link>
          </div>
          <div className="space-y-2">
            <p className="ops-label">Autisti</p>
            <Link href="/informativa-autisti" className="block" style={link}>
              Informativa conducenti
            </Link>
          </div>
        </div>
      </div>
      <div className={`wrap border-t pt-6 text-xs ${showTrialCta ? "pb-6" : "mt-8"}`} style={{ borderColor: "var(--glass-border)", color: "var(--text-soft)" }}>
        © {new Date().getFullYear()} Truck Radar · Transport Operating System · Tutti i diritti riservati.
      </div>
    </footer>
  );
}

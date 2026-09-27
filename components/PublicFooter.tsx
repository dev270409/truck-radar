import Link from "next/link";
import Logo from "./Logo";

/**
 * Footer pubblico riutilizzabile (landing, prezzi, pagine legali, funnel).
 * Usa i token semantici così funziona in light e dark mode.
 */
export default function PublicFooter() {
  const link = { color: "var(--text-soft)" } as const;
  return (
    <footer className="border-t px-6 py-10" style={{ borderColor: "var(--glass-border)" }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-xs leading-6" style={{ color: "var(--text-soft)" }}>
            Transport Operating System per aziende di trasporto. Dati ospitati in UE,
            cifrati in transito e a riposo.
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
      <div className="mx-auto mt-8 max-w-6xl border-t pt-6 text-xs" style={{ borderColor: "var(--glass-border)", color: "var(--text-soft)" }}>
        © {new Date().getFullYear()} Truck Radar · Transport Operating System · Tutti i diritti riservati.
      </div>
    </footer>
  );
}
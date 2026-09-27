import Link from "next/link";

/**
 * Footer pubblico riutilizzabile (landing, prezzi, pagine legali, funnel).
 * Include i link legali, l'informativa autisti e la nota sulla localizzazione dei dati.
 */
export default function PublicFooter() {
  return (
    <footer className="border-t border-slate-800 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2 font-bold text-slate-100">
            <img src="/logo.jpg" alt="" className="h-8 w-8 rounded-lg object-cover" />
            Truck Radar
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-400">
            Transport Operating System per aziende di trasporto. Dati ospitati in UE,
            cifrati in transito e a riposo.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-xs sm:grid-cols-3">
          <div className="space-y-2">
            <p className="font-semibold uppercase tracking-wider text-slate-400">Prodotto</p>
            <Link href="/prezzi" className="block text-slate-400 hover:text-slate-200">
              Prezzi
            </Link>
            <Link href="/cerca-un-vettore" className="block text-slate-400 hover:text-slate-200">
              Cerca un vettore
            </Link>
            <Link href="/login" className="block text-slate-400 hover:text-slate-200">
              Accedi
            </Link>
          </div>
          <div className="space-y-2">
            <p className="font-semibold uppercase tracking-wider text-slate-400">Legale</p>
            <Link href="/privacy" className="block text-slate-400 hover:text-slate-200">
              Privacy
            </Link>
            <Link href="/termini" className="block text-slate-400 hover:text-slate-200">
              Termini
            </Link>
            <Link href="/cookie" className="block text-slate-400 hover:text-slate-200">
              Cookie
            </Link>
          </div>
          <div className="space-y-2">
            <p className="font-semibold uppercase tracking-wider text-slate-400">Autisti</p>
            <Link href="/informativa-autisti" className="block text-slate-400 hover:text-slate-200">
              Informativa conducenti
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-6xl border-t border-slate-800 pt-6 text-xs text-slate-400">
        © {new Date().getFullYear()} Truck Radar · Transport Operating System · Tutti i diritti riservati.
      </div>
    </footer>
  );
}
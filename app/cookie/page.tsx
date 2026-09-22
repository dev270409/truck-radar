import Link from "next/link";

export default function CookiePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">&larr; Torna alla home</Link>
        <h1 className="mt-6 text-3xl font-bold">Informativa Cookie</h1>
        <p className="mt-2 text-sm text-slate-500">Ultimo aggiornamento: bozza in preparazione.</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-300">
          <p>
            Questa pagina è un <b>placeholder</b>. Prima del lancio pubblico va inserito un banner di
            consenso (CMP) conforme, con il registro del consenso e l&apos;elenco dei cookie tecnici e
            di misurazione effettivamente utilizzati.
          </p>
          <p>
            Saranno indicati cookie di sessione/autenticazione (necessari), eventuali cookie di analisi
            privacy-aware e le modalità di gestione delle preferenze.
          </p>
        </div>
      </div>
    </main>
  );
}
import Link from "next/link";

export default function TerminiPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">&larr; Torna alla home</Link>
        <h1 className="mt-6 text-3xl font-bold">Termini di Servizio</h1>
        <p className="mt-2 text-sm text-slate-500">Ultimo aggiornamento: bozza in preparazione.</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-300">
          <p>
            Questa pagina è un <b>placeholder</b>. Il testo definitivo deve coprire, su validazione
            legale: uso del gestione, regole di marketplace e subappalto, commissioni, limitazioni di
            responsabilità in relazione ai vettori del Network, risoluzione delle controversie e legge applicabile.
          </p>
          <p>
            Truck Radar orchestra i servizi tramite fornitori specializzati; i termini devono riflettere
            il ruolo di piattaforma di collegamento tra aziende committenti e vettori verificati.
          </p>
        </div>
      </div>
    </main>
  );
}
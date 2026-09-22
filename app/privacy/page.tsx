import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">&larr; Torna alla home</Link>
        <h1 className="mt-6 text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Ultimo aggiornamento: bozza in preparazione.</p>
        <div className="prose-invert mt-8 space-y-6 text-sm leading-7 text-slate-300">
          <p>
            Questa pagina è un <b>placeholder</b>. Il testo definitivo deve essere redatto e validato
            da consulenti legali prima del lancio pubblico, in conformità al GDPR (Reg. UE 2016/679) e
            alla normativa applicabile per il trasporto e i marketplace.
          </p>
          <p>
            Saranno qui descritti: titolare del trattamento, finalità (erogazione del gestionale,
            verifica account e Network), base giuridica, categorie di dati (anagrafica aziendale,
            dati di viaggio, KYC) e misure di protezione.
          </p>
        </div>
      </div>
    </main>
  );
}
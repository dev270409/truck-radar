import Link from "next/link";

const sections = [
  {
    title: "1. Cosa sono i cookie",
    body: "I cookie sono piccoli file di testo che il sito salva sul dispositivo dell'utente durante la navigazione. Servono a far funzionare correttamente il servizio, a ricordare le preferenze e, solo se previsto, a misurare l'uso del servizio in forma aggregata.",
  },
  {
    title: "2. Cookie tecnici necessari (sempre attivi)",
    body: "Truck Radar utilizza esclusivamente cookie tecnici strettamente necessari al funzionamento della piattaforma, che non richiedono consenso: il cookie di sessione/autenticazione (NextAuth) per mantenere l'accesso durante la navigazione e proteggere l'account dell'utente.",
  },
  {
    title: "3. Preferenze salvate localmente",
    body: "La preferenza di tema (chiaro/scuro) è salvata nel dispositivo dell'utente tramite memoria locale (localStorage) del browser, non come cookie. Può essere modificata o azzerata in qualsiasi momento dalle impostazioni del browser.",
  },
  {
    title: "4. Cookie di analisi e di terze parti",
    body: "Al momento non sono attivati cookie di profilazione né servizi di analisi di terze parti che utilizzano cookie. Qualora venissero introdotti strumenti di misurazione, saranno adottati esclusivamente in forma anonima/aggregata e previa informativa e, ove richiesto, acquisizione del consenso.",
  },
  {
    title: "5. Come gestire le preferenze",
    body: "L'utente può in ogni momento modificare o bloccare i cookie dalle impostazioni del proprio browser. La disabilitazione dei cookie tecnici potrebbe impedire il corretto funzionamento dell'area riservata.",
  },
  {
    title: "6. Contatti",
    body: "Per qualsiasi informazione sulla presente informativa è possibile contattare il Titolare all'indirizzo privacy@truck-radar.it.",
  },
];

export default function CookiePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">&larr; Torna alla home</Link>
        <h1 className="mt-6 text-3xl font-bold">Informativa Cookie</h1>
        <p className="mt-2 text-sm text-slate-500">Ultimo aggiornamento: 23 settembre 2026.</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-300">
          {sections.map((s) => (
            <section key={s.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="mb-2 font-bold text-slate-100">{s.title}</h2>
              <p>{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
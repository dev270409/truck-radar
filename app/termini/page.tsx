import Link from "next/link";
import {
  Building2,
  Scale,
  RefreshCw,
  ShieldAlert,
  Lock,
  BadgeCheck,
  FileX,
  ShieldCheck,
  ScanText,
} from "lucide-react";

const sections = [
  {
    icon: Building2,
    title: "1. Oggetto e Accesso al Servizio",
    items: [
      {
        h: "Esclusività B2B",
        p: "Il servizio è riservato esclusivamente ad aziende e liberi professionisti (B2B). È esclusa la vendita a consumatori privati (B2C).",
      },
      {
        h: "Licenza d'uso",
        p: "Viene concessa una licenza temporanea, non esclusiva e non trasferibile. Il software è fornito \"così com'è\" (\"as is\") e \"secondo disponibilità\".",
      },
    ],
  },
  {
    icon: Scale,
    title: "2. Responsabilità del Cliente sui Dati e sui Driver (Blindatura Finale)",
    items: [
      {
        h: "Conformità Giuridica",
        p: "Il Cliente è l'unico responsabile del rispetto delle leggi sul lavoro (incluso l'Art. 4 Statuto dei Lavoratori in Italia per il controllo a distanza) e della normativa Privacy/GDPR.",
      },
      {
        h: "Manleva Totale",
        p: "Il Cliente si impegna a manlevare e tenere indenne il Fornitore da qualsiasi sanzione, multa, causa di lavoro o richiesta di risarcimento avanzata da dipendenti, driver, autorità giudiziarie o Garanti Privacy a causa dell'uso del software.",
      },
    ],
  },
  {
    icon: RefreshCw,
    title: "3. Piani, Pagamenti e Rimborsi",
    items: [
      {
        h: "Rinnovo Automatico",
        p: "Tutti gli abbonamenti si rinnovano automaticamente alla scadenza per la medesima durata (es. mese per mese o anno per anno), a meno che il Cliente non invii disdetta formale entro i termini indicati (es. 15 giorni prima).",
      },
      {
        h: "Politica \"Nessun Rimborso\"",
        p: "I pagamenti non sono in alcun caso rimborsabili. Il mancato utilizzo del software da parte del Cliente non dà diritto ad alcun rimborso o credito.",
      },
      {
        h: "Mancato o Ritardato Pagamento",
        p: "In caso di ritardo nel pagamento anche di una sola rata o fattura, il Fornitore ha il diritto di sospendere immediatamente l'accesso al servizio senza preavviso e senza responsabilità per eventuali danni subiti dal Cliente.",
      },
    ],
  },
  {
    icon: ShieldAlert,
    title: "4. Limitazione di Responsabilità (SLA & Danni)",
    items: [
      {
        h: "Hardware e Connettività di Terzi",
        p: "Il Fornitore non risponde di disservizi dovuti a malfunzionamenti di localizzatori GPS, SIM dati di terzi, assenza di segnale satellitare/di rete o problemi d'interruzione internet del Cliente.",
      },
      {
        h: "Soffitto di Responsabilità (Cap on Liability)",
        p: "L'eventuale risarcimento massimo a carico del Fornitore per qualsiasi controversia non potrà mai superare l'importo effettivamente pagato dal Cliente negli ultimi 12 mesi (o nei primi 3 mesi se la durata è inferiore). Il Fornitore non risponde mai di danni indiretti, perdita di profitto o fermo macchina.",
      },
    ],
  },
  {
    icon: Lock,
    title: "5. Proprietà Intellettuale e Sospensione",
    items: [
      {
        h: "Proprietà",
        p: "Il codice, la piattaforma e le tecnologie restano di esclusiva proprietà del Fornitore.",
      },
      {
        h: "Abuso",
        p: "Tentativi di reverse engineering, rivendita non autorizzata dell'account o abuso dei sistemi comporteranno la risoluzione immediata del contratto e il blocco dell'account, fatto salvo il risarcimento del danno.",
      },
    ],
  },
  {
    icon: ScanText,
    title: "6. Verifica di Identità, Idoneità Professionale e Regolarità (KYC/KYB)",
    items: [
      {
        h: "Finalità del Controllo",
        p: "Per garantire la sicurezza dei servizi, prevenire frodi e adempiere agli obblighi legali in materia di trasporto di merci per conto terzi e responsabilità solidale, l'Utente accetta di sottoporsi alla procedura di verifica aziendale e d'identità (KYC/KYB) fornendo la documentazione richiesta (a titolo esemplificativo: Visura Camerale, Documento d'Identità del Legale Rappresentante, Iscrizione all'Albo degli Autotrasportatori, Licenza REN, Polizza Assicurativa).",
      },
      {
        h: "Compilazione Automatica (Zero-Form)",
        p: "Per facilitare l'onboarding, la Piattaforma può avvalersi di strumenti di estrazione automatizzata dei documenti (intelligenza artificiale/OCR) al solo scopo di pre-compilare i campi del profilo aziendale e dell'amministratore. Sistemi AI agiscono quali Responsabili del Trattamento (Art. 28 GDPR) e non acquisiscono la titolarità dei dati né li utilizzano per l'addestramento dei propri modelli. L'Utente resta in ogni caso tenuto a verificare e confermare la correttezza dei dati precompilati.",
      },
      {
        h: "Esclusività e Vincolo di Destinazione",
        p: "Tutti i documenti forniti e le informazioni da essi estratte saranno utilizzati esclusivamente ed unicamente per: (i) verifica dell'identità del Legale Rappresentante/Operatore; (ii) validazione dei requisiti di idoneità professionale ed esercizio della professione di autotrasportatore; (iii) abilitazione dell'account aziendale all'interno della Piattaforma gestionale e della Borsa Carichi.",
      },
      {
        h: "Divieto di Cessione a Terzi",
        p: "Il Gestore della Piattaforma si impegna formalmente a non cedere, vendere, concedere in licenza o comunque condividere con soggetti terzi i documenti e i dati personali o aziendali raccolti durante la fase di onboarding, fatte salve le comunicazioni obbligatorie per legge verso Autorità Giudiziarie o di Pubblica Sicurezza, o per l'espletamento automatizzato della verifica mediante fornitori di servizi tecnici esterni (Data Processor) debitamente nominati.",
      },
    ],
  },
];

export default function TerminiPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">&larr; Torna alla home</Link>
        <h1 className="mt-6 text-3xl font-bold">Termini e Condizioni di Servizio (T&amp;C)</h1>
        <p className="mt-2 text-sm text-slate-500">Ultimo aggiornamento: 23 settembre 2026.</p>

        <div className="prose-invert mt-8 space-y-6 text-sm leading-7 text-slate-300">
          {sections.map(({ icon: Icon, title, items }) => (
            <section key={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="font-bold text-slate-100 mb-3 flex items-center">
                <Icon className="w-5 h-5 mr-2 text-blue-400 shrink-0" /> {title}
              </h2>
              <div className="space-y-4">
                {items.map((it) => (
                  <div key={it.h}>
                    <h3 className="font-semibold text-slate-200 text-sm mb-1 flex items-center">
                      <BadgeCheck className="w-4 h-4 mr-1.5 text-emerald-400 shrink-0" /> {it.h}
                    </h3>
                    <p className="text-slate-400">{it.p}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <p className="text-xs text-slate-500 flex items-center">
            <FileX className="w-3.5 h-3.5 mr-1.5" />
            I Termini vanno validati dal tuo consulente legale prima del lancio produttivo (v. §63 del paper).
          </p>
        </div>
      </div>
    </main>
  );
}
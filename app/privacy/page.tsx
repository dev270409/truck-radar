import Link from "next/link";
import {
  UserCog,
  Database,
  Clock,
  Trash2,
  BadgeCheck,
  FileWarning,
  ScanText,
  ShieldCheck,
} from "lucide-react";

const sections = [
  {
    icon: UserCog,
    title: "1. Ruoli Privacy",
    items: [
      {
        h: "Cliente = Titolare del Trattamento (Data Controller)",
        p: "Decide perché e come monitorare i veicoli ed è l'unico responsabile di informare i propri driver/dipendenti e raccogliere il loro consenso o base giuridica.",
      },
      {
        h: "Fornitore = Responsabile del Trattamento (Data Processor)",
        p: "Si limita a elaborare i dati tecnici e di geolocalizzazione per conto del Cliente tramite apposito Data Processing Agreement (DPA).",
      },
    ],
  },
  {
    icon: Database,
    title: "2. Dati Trattati e Finalità",
    items: [
      {
        h: "Dati dell'Account",
        p: "Dati di fatturazione, referenti e credenziali d'accesso.",
      },
      {
        h: "Dati Telemetrici e GPS",
        p: "Coordinate, velocità, tratte, soste e dati diagnostici del veicolo. I dati servono esclusivamente per la fornitura delle funzionalità gestionali previste dal piano acquistato.",
      },
    ],
  },
  {
    icon: Clock,
    title: "3. Conservazione, Backup e Cancellazione",
    items: [
      {
        h: "Ritenzione Dati",
        p: "I dati GPS/tracciamento sono conservati per un periodo predefinito (es. 12 mesi) dopo il quale possono essere cancellati o resi anonimi in modo irreversibile.",
      },
      {
        h: "Cessazione dell'Account",
        p: "In caso di disdetta o mancato rinnovo, il Cliente ha 30 giorni di tempo per scaricare i propri dati. Trascorsi i 30 giorni, il Fornitore avrà la facoltà di cancellare definitivamente tutti i dati della flotta dai propri server senza alcun obbligo di conservazione.",
      },
    ],
  },
  {
    icon: ScanText,
    title: "4. Informativa sul Trattamento dei Dati per la Verifica Aziendale (KYB/KYC)",
    items: [
      {
        h: "Base Giuridica e Finalità del Trattamento",
        p: "Il trattamento dei dati contenuti nei documenti identificativi e aziendali (inclusi dati di Visura Camerale, documenti di riconoscimento, posizioni Albo/REN) è necessario per: (i) l'esecuzione del contratto di servizio SaaS ed erogazione delle funzionalità della Borsa Carichi (Art. 6.1.b GDPR); (ii) l'adempimento di obblighi legali applicabili al settore dei trasporti e alla prevenzione del lavoro abusivo (Art. 6.1.c GDPR); (iii) il legittimo interesse del Titolare a prevenire truffe, furti d'identità e carichi fantasma all'interno del marketplace (Art. 6.1.f GDPR).",
      },
      {
        h: "Elaborazione Automatizzata tramite Intelligenza Artificiale",
        p: "Per facilitare l'esperienza d'uso dell'Utente ed evitare la digitazione manuale dei dati, la Piattaforma si avvale di strumenti automatizzati di estrazione ed elaborazione dei documenti (Intelligenza Artificiale / OCR). Tali strumenti analizzano i file caricati al solo fine di compilare automaticamente i campi del profilo aziendale. I fornitori di tecnologia AI agiscono quali Responsabili del Trattamento (Art. 28 GDPR) e non acquisiscono la titolarità dei dati né utilizzano i documenti dell'Utente per l'addestramento di modelli di intelligenza artificiale di loro proprietà.",
      },
      {
        h: "Conservazione e Sicurezza dei Dati",
        p: "I documenti caricati per il KYC/KYB vengono conservati in archivi digitali crittografati e protetti con standard di sicurezza adeguati (encryption at rest e in transit). I dati non saranno riutilizzati per finalità di marketing né profilati per scopi commerciali verso terzi.",
      },
      {
        h: "Divieto di Cessione a Terzi",
        p: "I dati e i documenti raccolti durante l'onboarding vengono trattati esclusivamente per le finalità di verifica sopra indicate e non vengono ceduti, venduti o condivisi con soggetti terzi, fatte salve le comunicazioni obbligatorie per legge o l'espletamento della verifica mediante fornitori tecnici nominati Responsabili del Trattamento.",
      },
    ],
  },
  {
    icon: ShieldCheck,
    title: "5. Diritti dell'Interessato e Recapito",
    items: [
      {
        h: "Diritti GDPR",
        p: "Il Cliente e i suoi referenti possono esercitare in qualsiasi momento i diritti previsti dagli artt. 15-22 GDPR (accesso, rettifica, cancellazione, limitazione, portabilità, opposizione) contattando il Data Controller all'indirizzo indicato nella homepage.",
      },
      {
        h: "Recapito",
        p: "Per qualsiasi richiesta relativa al trattamento dei dati KYC/KYB e di verifica aziendale, contattare: privacy@truck-radar.it (dpcm da definire), con riscontro entro 30 giorni.",
      },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">&larr; Torna alla home</Link>
        <Link href="/informativa-autisti" className="ml-3 text-sm text-blue-400 hover:text-blue-300">Informativa Autisti</Link>
        <h1 className="mt-6 text-3xl font-bold">Privacy Policy e Gestione Dati (GDPR)</h1>
        <p className="mt-2 text-sm text-slate-500">Ultimo aggiornamento: 23 settembre 2026.</p>

        <div className="prose-invert mt-8 space-y-6 text-sm leading-7 text-slate-300">
          {sections.map(({ icon: Icon, title, items }) => (
            <section key={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="font-bold text-slate-100 mb-3 flex items-center">
                <Icon className="w-5 h-5 mr-2 text-emerald-400 shrink-0" /> {title}
              </h2>
              <div className="space-y-4">
                {items.map((it) => (
                  <div key={it.h}>
                    <h3 className="font-semibold text-slate-200 text-sm mb-1 flex items-center">
                      <BadgeCheck className="w-4 h-4 mr-1.5 text-blue-400 shrink-0" /> {it.h}
                    </h3>
                    <p className="text-slate-400">{it.p}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <p className="text-xs text-slate-500 flex items-center">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Rischio residuo (consenso/DPA): la bozza va completata dal tuo consulente legale prima del lancio
            produttivo (v. §63 del paper).
          </p>
          <p className="text-xs text-slate-500 flex items-center">
            <FileWarning className="w-3.5 h-3.5 mr-1.5" />
            Per il trattamento dei dati degli autisti vedi{" "}
            <Link href="/informativa-autisti" className="text-blue-400 hover:text-blue-300 ml-1">
              l&apos;informativa dedicata
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
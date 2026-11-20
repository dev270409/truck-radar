export interface Tutorial {
  id: string;
  title: string;
  description: string;
  href: string;
  video: string;
  poster: string;
  captions: string;
  durationLabel: string;
  steps: string[];
}

export const TUTORIALS: Tutorial[] = [
  {
    id: "panoramica",
    title: "Come si usa la Panoramica",
    description: "KPI, attività di oggi, flotta e ricerca in un colpo d'occhio.",
    href: "/dashboard",
    video: "/tutorials/panoramica.mp4",
    poster: "/tutorials/panoramica.jpg",
    captions: "/tutorials/panoramica.vtt",
    durationLabel: "35 s",
    steps: [
      "Controlla le cose da fare oggi",
      "Leggi i numeri della flotta",
      "Usa ricerca e menu laterale",
    ],
  },
  {
    id: "viaggi",
    title: "Come si usano Viaggi e costi",
    description: "Crea il viaggio, assegna le risorse e controlla il margine.",
    href: "/dashboard/trips",
    video: "/tutorials/viaggi.mp4",
    poster: "/tutorials/viaggi.jpg",
    captions: "/tutorials/viaggi.vtt",
    durationLabel: "32 s",
    steps: [
      "Aggiungi un nuovo viaggio",
      "Assegna mezzo e autista",
      "Apri il dettaglio e i costi",
    ],
  },
  {
    id: "carico",
    title: "Come si usa il Piano di carico",
    description: "Colli, metri lineari, peso, baricentro e vista 2D/3D.",
    href: "/dashboard/carico",
    video: "/tutorials/carico.mp4",
    poster: "/tutorials/carico.jpg",
    captions: "/tutorials/carico.vtt",
    durationLabel: "32 s",
    steps: [
      "Scegli mezzo e aggiungi i colli",
      "Controlla peso, volume e baricentro",
      "Salva o stampa il piano",
    ],
  },
  {
    id: "preventivi",
    title: "Come si usano i Preventivi",
    description: "Cliente, percorso, prezzo, costo e margine in un unico flusso.",
    href: "/dashboard/preventivi",
    video: "/tutorials/preventivi.mp4",
    poster: "/tutorials/preventivi.jpg",
    captions: "/tutorials/preventivi.vtt",
    durationLabel: "34 s",
    steps: [
      "Crea un nuovo preventivo",
      "Compila prezzo e costo",
      "Salva, esporta o converti in ordine",
    ],
  },
  {
    id: "flotta",
    title: "Come si usa Flotta live",
    description: "Posizioni, stato mezzi e viaggi in corso sulla mappa.",
    href: "/dashboard/flotta",
    video: "/tutorials/flotta.mp4",
    poster: "/tutorials/flotta.jpg",
    captions: "/tutorials/flotta.vtt",
    durationLabel: "31 s",
    steps: [
      "Leggi lo stato della flotta",
      "Individua i mezzi sulla mappa",
      "Apri il viaggio in corso",
    ],
  },
  {
    id: "documenti",
    title: "Come si usa Documenti in arrivo",
    description: "Classifica e collega DDT, fatture, ordini e POD.",
    href: "/dashboard/documenti",
    video: "/tutorials/documenti.mp4",
    poster: "/tutorials/documenti.jpg",
    captions: "/tutorials/documenti.vtt",
    durationLabel: "32 s",
    steps: [
      "Carica un PDF o una foto",
      "Assegna il tipo di documento",
      "Collega il file a viaggio o mezzo",
    ],
  },
  {
    id: "carburante",
    title: "Come si usa Carburante",
    description: "Rifornimenti, consumi reali e costo per chilometro.",
    href: "/dashboard/carburante",
    video: "/tutorials/carburante.mp4",
    poster: "/tutorials/carburante.jpg",
    captions: "/tutorials/carburante.vtt",
    durationLabel: "35 s",
    steps: [
      "Registra un rifornimento",
      "Controlla i consumi reali",
      "Usa i dati nel margine del viaggio",
    ],
  },
  {
    id: "impostazioni",
    title: "Come si usa Impostazioni",
    description: "Menu personale, profilo e preferenze del browser.",
    href: "/dashboard/impostazioni",
    video: "/tutorials/impostazioni.mp4",
    poster: "/tutorials/impostazioni.jpg",
    captions: "/tutorials/impostazioni.vtt",
    durationLabel: "28 s",
    steps: [
      "Apri profilo e password",
      "Nascondi le voci che non usi",
      "Ripristina il menu con Mostra tutte",
    ],
  },
  {
    id: "scadenze",
    title: "Come si usa Scadenze e divieti",
    description: "Mezzi, autisti, azienda e divieti mezzi pesanti.",
    href: "/dashboard/scadenze",
    video: "/tutorials/scadenze.mp4",
    poster: "/tutorials/scadenze.jpg",
    captions: "/tutorials/scadenze.vtt",
    durationLabel: "31 s",
    steps: [
      "Leggi le scadenze in evidenza",
      "Aggiungi patenti e documenti",
      "Esporta o condividi gli avvisi",
    ],
  },
  {
    id: "mezzi",
    title: "Come si usa Gestione Flotta Veicoli",
    description: "Anagrafica, documenti, stato operativo e analisi mezzi.",
    href: "/dashboard/vehicles",
    video: "/tutorials/mezzi.mp4",
    poster: "/tutorials/mezzi.jpg",
    captions: "/tutorials/mezzi.vtt",
    durationLabel: "32 s",
    steps: [
      "Aggiungi un veicolo",
      "Carica i documenti",
      "Apri Analisi mezzi",
    ],
  },
];

export function getTutorialForPath(pathname: string): Tutorial | undefined {
  const normalized = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  return TUTORIALS.find((tutorial) => {
    if (tutorial.href === "/dashboard") return normalized === "/dashboard";
    return normalized === tutorial.href || normalized.startsWith(`${tutorial.href}/`);
  });
}

export interface FaqItem {
  question: string;
  answer: string;
  cta?: { label: string; href: string };
}

export interface FaqGroup {
  title: string;
  items: FaqItem[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: "Iniziare",
    items: [
      {
        question: "Quanto dura la prova gratuita?",
        answer:
          "La prova dura 21 giorni e include tutte le funzioni. Non serve inserire una carta. Alla scadenza puoi completare la verifica aziendale e attivare un piano per continuare a usare le sezioni operative.",
        cta: { label: "Vedi il piano", href: "/dashboard/abbonamenti" },
      },
      {
        question: "Come verifico azienda e identità?",
        answer:
          "Apri Verifica account. La verifica aziendale controlla P.IVA e visura; la verifica identità conferma il legale rappresentante. Puoi seguirla anche durante la prova.",
        cta: { label: "Apri verifica", href: "/onboarding/verifica" },
      },
      {
        question: "Quali ruoli posso creare?",
        answer:
          "Oggi puoi creare utenti ADMIN e AUTISTA. L'ADMIN gestisce l'azienda e le operazioni; l'AUTISTA vede i propri viaggi e usa la PWA per documenti e consegne. I limiti dipendono dal piano attivo.",
        cta: { label: "Gestisci il team", href: "/dashboard/users" },
      },
      {
        question: "Dove trovo tutte le guide?",
        answer:
          "Le guide restano sempre disponibili in questa pagina. Durante la prova trovi anche il collegamento rapido nella barra superiore e nel menu del profilo.",
      },
    ],
  },
  {
    title: "Viaggi e documenti",
    items: [
      {
        question: "Come creo un viaggio?",
        answer:
          "Apri Viaggi e premi Aggiungi viaggio. Inserisci ritiro, consegna, date, merce, peso, volume e prezzo. Puoi salvare subito e completare l'assegnazione in un secondo momento.",
        cta: { label: "Apri Viaggi", href: "/dashboard/trips" },
      },
      {
        question: "Come assegno mezzo e autista?",
        answer:
          "Apri il dettaglio del viaggio e scegli mezzo e autista disponibili. Da qui puoi anche cambiare stato, allegare documenti e controllare i costi analitici.",
      },
      {
        question: "Come funziona Documenti in arrivo?",
        answer:
          "Carica un PDF o una foto. Il documento entra in Da classificare: assegna il tipo e collegalo a un viaggio, a un mezzo o a una scadenza. Gli elementi non collegati restano in evidenza.",
        cta: { label: "Apri Documenti", href: "/dashboard/documenti" },
      },
      {
        question: "Come gestisco DDT e POD?",
        answer:
          "Dal dettaglio del viaggio puoi caricare i documenti di trasporto. L'autista può aggiungere foto e firma dalla PWA al momento della consegna; l'ufficio ritrova tutto nello stesso viaggio.",
      },
    ],
  },
  {
    title: "Carico, preventivi e costi",
    items: [
      {
        question: "Come calcolo un piano di carico?",
        answer:
          "Scegli il mezzo, aggiungi i colli con misure e peso e controlla il risultato. Truck Radar calcola metri lineari, volume, baricentro e riempimento, con vista 2D e 3D. Puoi salvare o stampare il piano.",
        cta: { label: "Apri Piano di carico", href: "/dashboard/carico" },
      },
      {
        question: "Come creo un preventivo?",
        answer:
          "Apri Preventivi, premi Nuovo preventivo e compila cliente, percorso, merce, pesi, prezzi e costi. Il margine si aggiorna mentre inserisci i dati. Salva l'offerta per esportarla o convertirla in ordine.",
        cta: { label: "Apri Preventivi", href: "/dashboard/preventivi" },
      },
      {
        question: "Come vedo il margine di un viaggio?",
        answer:
          "Apri il dettaglio del viaggio e usa il riepilogo costi: puoi aggiungere gasolio, pedaggi, autista, traghetto e altre voci. Il margine viene ricalcolato sul prezzo del viaggio.",
      },
      {
        question: "Come registro un rifornimento?",
        answer:
          "Apri Carburante e premi Registra rifornimento. Inserisci mezzo, litri, prezzo e odometro. Se indichi il pieno, il sistema calcola i consumi reali e aggiorna l'efficienza del mezzo.",
        cta: { label: "Apri Carburante", href: "/dashboard/carburante" },
      },
    ],
  },
  {
    title: "Flotta e scadenze",
    items: [
      {
        question: "Come collego Geotab?",
        answer:
          "Apri Integrazioni e cerca Geotab. Inserisci le credenziali del database e avvia il test di connessione. Dopo la sincronizzazione vedrai tratte e chilometri nella Panoramica e in Flotta live.",
        cta: { label: "Apri Integrazioni", href: "/dashboard/integrazioni" },
      },
      {
        question: "Come aggiungo un documento a un mezzo?",
        answer:
          "Apri Mezzi, scegli il veicolo e premi Documenti. Carica assicurazione, revisione o altri allegati con la data di scadenza: l'avviso compare nella pagina Scadenze e nella Panoramica.",
        cta: { label: "Apri Mezzi", href: "/dashboard/vehicles" },
      },
      {
        question: "Come controllo le scadenze?",
        answer:
          "Scadenze e divieti mostra documenti scaduti, in scadenza entro 30 giorni e divieti futuri. Le schede separano autisti, azienda e divieti mezzi pesanti. Puoi esportare l'elenco mezzi e condividere gli avvisi.",
        cta: { label: "Apri Scadenze", href: "/dashboard/scadenze" },
      },
      {
        question: "Posso nascondere le voci che non uso?",
        answer:
          "Sì. Apri Impostazioni e disattiva le voci del menu laterale. Le pagine restano raggiungibili da ricerca e link diretti. Mostra tutte ripristina il menu completo.",
        cta: { label: "Apri Impostazioni", href: "/dashboard/impostazioni" },
      },
    ],
  },
  {
    title: "Account e dati",
    items: [
      {
        question: "Come cambio password?",
        answer:
          "Apri Profilo e password dal menu del tuo nome. Inserisci la password attuale e la nuova password. Se l'hai dimenticata, chiedi a un amministratore della tua azienda di reimpostarla.",
        cta: { label: "Apri account", href: "/dashboard/account" },
      },
      {
        question: "Come funziona l'abbonamento?",
        answer:
          "Da Abbonamento vedi piano, stato, scadenza della prova e storico pagamenti. Il pagamento è gestito da Stripe. Prima dell'attivazione a pagamento devono essere completate le verifiche richieste.",
        cta: { label: "Apri Abbonamento", href: "/dashboard/abbonamenti" },
      },
      {
        question: "Come esporto i miei dati?",
        answer:
          "Le pagine con elenchi e report hanno il comando Esporta CSV. Per un export completo o per richieste privacy usa la pagina Contatti e indica quali dati ti servono.",
        cta: { label: "Apri Import / Export", href: "/dashboard/import-export" },
      },
      {
        question: "Come richiedo assistenza?",
        answer:
          "Se non trovi la risposta, scrivici dalla pagina Contatti. Indica azienda, pagina e cosa stai cercando di fare: ti rispondiamo con i passaggi o con una verifica mirata.",
        cta: { label: "Contatta il team", href: "/contatti" },
      },
    ],
  },
];

import type { ReactNode } from "react";
import SoonFeaturePage from "@/components/SoonFeaturePage";

/**
 * Contenuti d'esempio per le pagine SOON. Non contengono dati reali: servono
 * solo come anteprima. Le pagine originali restano nel codice e non vengono
 * cancellate; questo modulo fornisce solo la vista "In arrivo".
 */
type SoonKey =
  | "marketplace"
  | "smart-return"
  | "network"
  | "parking"
  | "geofence"
  | "ispezioni"
  | "esg"
  | "reporti";

const CONTENT: Record<SoonKey, Parameters<typeof SoonFeaturePage>[0]> = {
  marketplace: {
    title: "Borsa Carichi",
    subtitle: "Pubblica, cerca e affida carichi tra aziende verificate.",
    description:
      "La Borsa Carichi sarà attivata gradualmente. Nel frattempo puoi già usare il gestionale completo: qui sotto vedi solo un'anteprima di come funzionerà.",
    columns: ["Origine", "Destinazione", "Data", "Merce", "Peso", "Prezzo"],
    rows: [
      ["Milano", "Roma", "02/10", "Pallet", "12.000 kg", "€ 1.250"],
      ["Torino", "Bari", "03/10", "Semilavorati", "8.500 kg", "€ 1.480"],
      ["Bologna", "Napoli", "04/10", "Alimentari (frigo)", "6.200 kg", "€ 990"],
    ],
    bullets: [
      "Pubblicazione carichi solo da aziende verificate",
      "Ricerca per tratta, data, mezzo e capacità",
      "Matching automatico con i tuoi viaggi di ritorno",
      "Storico e reputazione dei vettori pubblici",
    ],
    metrics: [
      { label: "Carichi (esempio)", value: "24" },
      { label: "Match potenziali", value: "7" },
      { label: "Vettori verificati", value: "18" },
      { label: "Valore medio", value: "€ 1.100" },
    ],
  },
  "smart-return": {
    title: "Smart Return",
    subtitle: "Trova carichi di ritorno e riduci i km a vuoto.",
    description:
      "Smart Return propone carichi di ritorno compatibili con percorso, data e capacità del mezzo. I km a vuoto mostrati come esempio non sono calcolati sulla tua flotta.",
    columns: ["Tratta ritorno", "Data", "Compatibilità", "Ricavo stimato"],
    rows: [
      ["Roma → Milano", "02/10", "Alta", "€ 1.180"],
      ["Bari → Torino", "03/10", "Media", "€ 1.320"],
      ["Napoli → Bologna", "04/10", "Alta", "€ 870"],
    ],
    bullets: [
      "Match inverso su rete interna, poi su borse esterne collegate",
      "Metrica km a vuoto prima vs dopo per ogni viaggio",
      "Suggerimenti ordinati per ricavo e compatibilità",
    ],
    metrics: [
      { label: "Km a vuoto evitabili", value: "-12%" },
      { label: "Ricavo aggiuntivo", value: "€ 3.370" },
      { label: "Match trovati", value: "7" },
      { label: "A vuoto oggi", value: "esempio" },
    ],
  },
  network: {
    title: "Network",
    subtitle: "Directory di aziende verificate e reputazione pubblica.",
    description:
      "Il Network riunisce le aziende verificate con profilo e reputazione. Anteprima di esempio, non sono aziende reali.",
    columns: ["Azienda", "Zona", "Mezzi", "Buste", "Badge"],
    rows: [
      ["Vettore Alfa Srl", "Lombardia", "12", "4,8", "Verificato"],
      ["Trasporti Beta", "Emilia", "8", "4,6", "Verificato"],
      ["Logistica Gamma", "Lazio", "20", "4,9", "Top"],
    ],
    bullets: [
      "Profilo pubblico con reputazione e badge",
      "Filtro per area, capacità e tipo di mezzo",
      "Accesso riservato alle aziende verificate",
    ],
    metrics: [
      { label: "Aziende (esempio)", value: "42" },
      { label: "Verificate", value: "31" },
      { label: "Top rated", value: "6" },
      { label: "Busta media", value: "4,7" },
    ],
  },
  parking: {
    title: "Aree di Sosta",
    subtitle: "Community di parcheggi sicuri per gli autisti.",
    description:
      "Le aree di sosta con recensioni di sicurezza, illuminazione e servizi saranno attive con il modulo community. Anteprima di esempio.",
    columns: ["Area", "Tipo", "Sicurezza", "Illuminazione", "Servizi"],
    rows: [
      ["Autogrill A1 Nord", "Area servizio", "Alta", "Buona", "Docce, ristorante"],
      ["Parcheggio TIR Milano Est", "Privato", "Media", "Media", "Sorveglianza"],
      ["Area sosta Roma Sud", "Pubblica", "Alta", "Ottima", "Ristorazione"],
    ],
    bullets: [
      "Recensioni di driver su sicurezza e servizi",
      "Mappa delle aree consigliate",
      "Feedback su accessibilità e pulizia",
    ],
    metrics: [
      { label: "Aree (esempio)", value: "58" },
      { label: "Recensioni", value: "214" },
      { label: "Voto medio", value: "4,3" },
      { label: "Con docce", value: "19" },
    ],
  },
  geofence: {
    title: "Aree e Geofence",
    subtitle: "Zone, alert di ingresso/uscita e controllo accessi.",
    description:
      "La gestione delle aree geofence sarà attivata con la telemetria. Anteprima di esempio, nessuna area reale è configurata.",
    columns: ["Nome area", "Tipo", "Raggio", "Alert"],
    rows: [
      ["Deposito centrale", "Inclusione", "300 m", "Ingresso"],
      ["Zona urbana ristretta", "Esclusione", "1.200 m", "Uscita"],
      ["Piazzale carico", "Inclusione", "150 m", "Permanenza"],
    ],
    bullets: [
      "Disegno aree con centro e raggio",
      "Alert su ingresso, uscita e permanenza",
      "Associazione ai viaggi e ai mezzi",
    ],
    metrics: [
      { label: "Aree definite", value: "6" },
      { label: "Alert attivi", value: "3" },
      { label: "Eventi oggi", value: "12" },
      { label: "Mezzi coinvolti", value: "9" },
    ],
  },
  ispezioni: {
    title: "Check-list Ispezioni",
    subtitle: "Controlli pre-partenza e sicurezza mezzi dalla PWA.",
    description:
      "Le check-list di ispezione con esiti raccolti dagli autisti saranno attive con il modulo ispezioni. Anteprima di esempio.",
    columns: ["Mezzo", "Data", "Esito", "Voci KO", "Autista"],
    rows: [
      ["AB123CD", "28/09", "OK", "0", "Mario Rossi"],
      ["EF456GH", "28/09", "KO", "2", "Luca Bianchi"],
      ["IL789MN", "27/09", "OK", "0", "Anna Verdi"],
    ],
    bullets: [
      "Template di ispezione configurabili dalla sede",
      "Esiti raccolti dall'autista prima della partenza",
      "Alert su voci KO e mezzi non idonei",
    ],
    metrics: [
      { label: "Ispezioni oggi", value: "14" },
      { label: "Con KO", value: "2" },
      { label: "Completate", value: "12" },
      { label: "Mezzi non idonei", value: "1" },
    ],
  },
  esg: {
    title: "ESG e Sostenibilità",
    subtitle: "Km, emissioni evitate e report per la sostenibilità.",
    description:
      "Il report ESG sarà calcolato su dati reali di km e viaggi. Gli indicatori mostrati sono un'anteprima di esempio; i km a vuoto evitati non sono stimati finché non ci sono dati affidabili.",
    columns: ["Periodo", "Km totali", "Km a vuoto", "Km evitati", "CO₂"],
    rows: [
      ["Settembre", "18.400", "2.100", "620", "1,4 t"],
      ["Agosto", "16.900", "2.400", "540", "1,2 t"],
      ["Luglio", "20.100", "2.800", "700", "1,6 t"],
    ],
    bullets: [
      "Km percorsi, a vuoto e a vuoto evitati (dai dati reali)",
      "Stima CO₂ secondo metodologia documentata",
      "Report mensile e annuale esportabile",
    ],
    metrics: [
      { label: "Km totali", value: "18.400" },
      { label: "Km evitati", value: "620" },
      { label: "CO₂ stimata", value: "1,4 t" },
      { label: "Efficienza", value: "esempio" },
    ],
  },
  reporti: {
    title: "Report e impostazioni",
    subtitle: "Export avanzati, report periodici e impostazioni azienda.",
    description:
      "I report avanzati saranno attivati con i dati consolidati. Anteprima di esempio dei report disponibili.",
    columns: ["Report", "Periodo", "Formato", "Stato"],
    rows: [
      ["Viaggi e margini", "Settembre", "CSV", "In arrivo"],
      ["Flotta e scadenze", "Settembre", "PDF", "In arrivo"],
      ["ESG sostenibilità", "Q3", "PDF", "In arrivo"],
    ],
    bullets: [
      "Export CSV/PDF sui dati aziendali",
      "Report periodici automatici",
      "Impostazioni azienda centralizzate",
    ],
    metrics: [
      { label: "Report", value: "6" },
      { label: "Automatici", value: "3" },
      { label: "Formati", value: "CSV/PDF" },
      { label: "Pianificati", value: "2" },
    ],
  },
};

/** Ritorna il nodo "In arrivo" per una sezione SOON, senza toccare la pagina originale. */
export function soonPage(key: SoonKey): ReactNode {
  return <SoonFeaturePage {...CONTENT[key]} />;
}

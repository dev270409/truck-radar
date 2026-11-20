export const COST_AMBITI = [
  { id: "mezzo", label: "Mezzo" },
  { id: "personale", label: "Personale viaggiante" },
  { id: "personale_nv", label: "Personale non viaggiante" },
  { id: "servizi", label: "Servizi logistici" },
  { id: "azienda", label: "Azienda" },
] as const;

export const COST_TIPI = [
  { id: "ordinaria", label: "Manutenzione ordinaria" },
  { id: "straordinaria", label: "Manutenzione straordinaria" },
  { id: "fisso", label: "Costo fisso" },
  { id: "personale", label: "Personale" },
  { id: "struttura", label: "Struttura" },
  { id: "servizi", label: "Servizio" },
] as const;

export interface CostCategory {
  code: string;
  label: string;
  ambito: (typeof COST_AMBITI)[number]["id"];
  tipo: (typeof COST_TIPI)[number]["id"];
  unit?: string;
}

export const COST_CATEGORIES: CostCategory[] = [
  { code: "GASOLIO", label: "Gasolio", ambito: "mezzo", tipo: "ordinaria", unit: "l" },
  { code: "PEDAGGIO", label: "Pedaggi", ambito: "mezzo", tipo: "ordinaria" },
  { code: "AUTISTA", label: "Autista", ambito: "personale", tipo: "personale", unit: "h" },
  { code: "TRAGHETTO", label: "Traghetto e tunnel", ambito: "mezzo", tipo: "ordinaria" },
  { code: "PARCHEGGIO", label: "Parcheggio", ambito: "mezzo", tipo: "ordinaria" },
  { code: "MANUTENZIONE", label: "Manutenzione", ambito: "mezzo", tipo: "ordinaria" },
  { code: "ASSICURAZIONE", label: "Assicurazione", ambito: "mezzo", tipo: "fisso" },
  { code: "GOMME", label: "Gomme", ambito: "mezzo", tipo: "ordinaria" },
  { code: "TAGLIANDO", label: "Tagliando", ambito: "mezzo", tipo: "ordinaria" },
  { code: "OFFICINA", label: "Officina", ambito: "mezzo", tipo: "straordinaria" },
  { code: "CARROZZERIA", label: "Carrozzeria", ambito: "mezzo", tipo: "straordinaria" },
  { code: "RICAMBI", label: "Ricambi", ambito: "mezzo", tipo: "straordinaria" },
  { code: "REVISIONE", label: "Revisione", ambito: "mezzo", tipo: "ordinaria" },
  { code: "TACHIGRAFO", label: "Tachigrafo", ambito: "mezzo", tipo: "ordinaria" },
  { code: "FRIGO", label: "Gruppo frigo", ambito: "mezzo", tipo: "ordinaria" },
  { code: "LAVAGGIO", label: "Lavaggio", ambito: "mezzo", tipo: "ordinaria" },
  { code: "ADBLUE", label: "AdBlue", ambito: "mezzo", tipo: "ordinaria" },
  { code: "SOCCORSO", label: "Soccorso stradale", ambito: "mezzo", tipo: "straordinaria" },
  { code: "MULTE", label: "Multe", ambito: "mezzo", tipo: "straordinaria" },
  { code: "BOLLO", label: "Bollo", ambito: "mezzo", tipo: "fisso" },
  { code: "LEASING", label: "Leasing / noleggio", ambito: "mezzo", tipo: "fisso" },
  { code: "STIPENDIO", label: "Stipendio", ambito: "personale", tipo: "personale" },
  { code: "CONTRIBUTI", label: "Contributi", ambito: "personale", tipo: "personale" },
  { code: "INAIL", label: "INAIL", ambito: "personale", tipo: "personale" },
  { code: "TRASFERTA", label: "Trasferta", ambito: "personale", tipo: "personale" },
  { code: "STRAORDINARI", label: "Straordinari", ambito: "personale", tipo: "personale" },
  { code: "RIMBORSO", label: "Rimborso spese", ambito: "personale", tipo: "personale" },
  { code: "TFR", label: "TFR", ambito: "personale", tipo: "personale" },
  { code: "FORMAZIONE", label: "Formazione", ambito: "personale", tipo: "personale" },
  { code: "VESTIARIO", label: "Vestiario", ambito: "personale", tipo: "personale" },
  { code: "PERSONALE_ALTRO", label: "Altro personale", ambito: "personale", tipo: "personale" },
  { code: "AFFITTO", label: "Affitto", ambito: "azienda", tipo: "struttura" },
  { code: "UTENZE", label: "Utenze", ambito: "azienda", tipo: "struttura" },
  { code: "TELEFONO", label: "Telefono", ambito: "azienda", tipo: "struttura" },
  { code: "SOFTWARE", label: "Software", ambito: "azienda", tipo: "struttura" },
  { code: "CONSULENZE", label: "Consulenze", ambito: "azienda", tipo: "struttura" },
  { code: "ASSICURAZIONI_AZ", label: "Assicurazioni aziendali", ambito: "azienda", tipo: "struttura" },
  { code: "BANCA", label: "Banca", ambito: "azienda", tipo: "struttura" },
  { code: "TASSE", label: "Tasse", ambito: "azienda", tipo: "struttura" },
  { code: "PUBBLICITA", label: "Pubblicità", ambito: "azienda", tipo: "struttura" },
  { code: "AZIENDA_ALTRO", label: "Altro azienda", ambito: "azienda", tipo: "struttura" },
  { code: "PADRONCINO", label: "Padroncino", ambito: "servizi", tipo: "servizi" },
  { code: "CORRISPONDENTE", label: "Corrispondente", ambito: "servizi", tipo: "servizi" },
  { code: "COOPERATIVA", label: "Cooperativa", ambito: "servizi", tipo: "servizi" },
  { code: "INTERINALE", label: "Interinale", ambito: "servizi", tipo: "servizi" },
  { code: "MAGAZZINO_TERZI", label: "Magazzino terzi", ambito: "servizi", tipo: "servizi" },
  { code: "SERVIZI_ALTRO", label: "Altri servizi", ambito: "servizi", tipo: "servizi" },
  { code: "ALTRO", label: "Altro", ambito: "azienda", tipo: "struttura" },
];

export const COST_CATEGORY_MAP = new Map(
  COST_CATEGORIES.map((category) => [category.code, category])
);

export function costCategoryLabel(code: string | null | undefined): string {
  if (!code) return "Altro";
  return COST_CATEGORY_MAP.get(code.toUpperCase())?.label ?? code;
}

export function isCostCategory(code: string): boolean {
  return COST_CATEGORY_MAP.has(code.toUpperCase());
}

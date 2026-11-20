export type DeadlineSubject = "VEICOLO" | "AUTISTA" | "AZIENDA";

export interface DeadlineType {
  id: string;
  label: string;
  shortLabel: string;
  subject: DeadlineSubject;
  group: string;
  months?: number;
  days?: number;
  base: "scadenza" | "oggi";
  alertDays: number[];
  vehicleCategories?: string[];
  description: string;
}

const MOTORE = ["FRIGO", "TELONATO", "SPONDA_IDRAULICA", "CISTERNA", "ADR"];

export const DEADLINE_TYPES: DeadlineType[] = [
  {
    id: "assicurazione",
    label: "Assicurazione mezzo",
    shortLabel: "Assicurazione",
    subject: "VEICOLO",
    group: "Documenti mezzo",
    months: 12,
    base: "scadenza",
    alertDays: [30, 7, 1],
    description: "Polizza RC del veicolo.",
  },
  {
    id: "bollo",
    label: "Bollo mezzo",
    shortLabel: "Bollo",
    subject: "VEICOLO",
    group: "Documenti mezzo",
    months: 12,
    base: "scadenza",
    alertDays: [30, 7, 1],
    description: "Tassa automobilistica.",
  },
  {
    id: "revisione",
    label: "Revisione mezzo",
    shortLabel: "Revisione",
    subject: "VEICOLO",
    group: "Documenti mezzo",
    months: 24,
    base: "scadenza",
    alertDays: [30, 7, 1],
    description: "Revisione periodica del veicolo.",
  },
  {
    id: "tachigrafo_revisione",
    label: "Revisione tachigrafo",
    shortLabel: "Rev. tachigrafo",
    subject: "VEICOLO",
    group: "Tachigrafo",
    months: 24,
    base: "oggi",
    alertDays: [30, 7, 1],
    vehicleCategories: MOTORE,
    description: "Controllo periodico del cronotachigrafo.",
  },
  {
    id: "tachigrafo_scarico",
    label: "Scarico dati tachigrafo",
    shortLabel: "Scarico mezzo",
    subject: "VEICOLO",
    group: "Tachigrafo",
    days: 90,
    base: "oggi",
    alertDays: [10, 1],
    vehicleCategories: MOTORE,
    description: "Scarico della memoria del tachigrafo del mezzo.",
  },
  {
    id: "tagliando",
    label: "Tagliando mezzo",
    shortLabel: "Tagliando",
    subject: "VEICOLO",
    group: "Manutenzione",
    months: 12,
    base: "oggi",
    alertDays: [30, 7, 1],
    vehicleCategories: MOTORE,
    description: "Manutenzione programmata a data o chilometri.",
  },
  {
    id: "estintori",
    label: "Estintori",
    shortLabel: "Estintori",
    subject: "VEICOLO",
    group: "Sicurezza",
    months: 6,
    base: "oggi",
    alertDays: [10, 1],
    vehicleCategories: MOTORE,
    description: "Controllo periodico degli estintori.",
  },
  {
    id: "atp",
    label: "Certificato ATP",
    shortLabel: "ATP",
    subject: "VEICOLO",
    group: "Frigo",
    months: 36,
    base: "scadenza",
    alertDays: [30, 7, 1],
    vehicleCategories: ["FRIGO"],
    description: "Certificato per il trasporto di alimenti deperibili.",
  },
  {
    id: "adr_veicolo",
    label: "Certificato ADR mezzo",
    shortLabel: "ADR mezzo",
    subject: "VEICOLO",
    group: "ADR",
    months: 12,
    base: "scadenza",
    alertDays: [30, 7, 1],
    vehicleCategories: ["ADR"],
    description: "Certificato di approvazione del veicolo ADR.",
  },
  {
    id: "patente",
    label: "Patente",
    shortLabel: "Patente",
    subject: "AUTISTA",
    group: "Documenti autista",
    months: 60,
    base: "scadenza",
    alertDays: [30, 7, 1],
    description: "Scadenza della patente di guida.",
  },
  {
    id: "cqc",
    label: "CQC",
    shortLabel: "CQC",
    subject: "AUTISTA",
    group: "Documenti autista",
    months: 60,
    base: "scadenza",
    alertDays: [30, 7, 1],
    description: "Carta di qualificazione del conducente.",
  },
  {
    id: "carta_tachigrafica",
    label: "Carta tachigrafica",
    shortLabel: "Carta tachigrafica",
    subject: "AUTISTA",
    group: "Tachigrafo",
    months: 60,
    base: "scadenza",
    alertDays: [30, 7, 1],
    description: "Carta del conducente per il tachigrafo digitale.",
  },
  {
    id: "carta_scarico",
    label: "Scarico dati carta",
    shortLabel: "Scarico carta",
    subject: "AUTISTA",
    group: "Tachigrafo",
    days: 28,
    base: "oggi",
    alertDays: [7, 1],
    description: "Scarico dei dati della carta del conducente.",
  },
  {
    id: "visita_medica",
    label: "Visita medica",
    shortLabel: "Visita medica",
    subject: "AUTISTA",
    group: "Idoneità",
    months: 12,
    base: "oggi",
    alertDays: [30, 7, 1],
    description: "Visita del medico competente.",
  },
  {
    id: "adr_conducente",
    label: "Patentino ADR",
    shortLabel: "ADR",
    subject: "AUTISTA",
    group: "ADR",
    months: 60,
    base: "scadenza",
    alertDays: [30, 7, 1],
    description: "Certificato di formazione ADR del conducente.",
  },
  {
    id: "muletto",
    label: "Corso muletto",
    shortLabel: "Muletto",
    subject: "AUTISTA",
    group: "Formazione",
    months: 60,
    base: "oggi",
    alertDays: [30, 7, 1],
    description: "Abilitazione al carrello elevatore.",
  },
  {
    id: "sicurezza",
    label: "Formazione sicurezza",
    shortLabel: "Sicurezza",
    subject: "AUTISTA",
    group: "Formazione",
    months: 60,
    base: "oggi",
    alertDays: [30, 7, 1],
    description: "Aggiornamento della formazione sulla sicurezza.",
  },
  {
    id: "durc",
    label: "DURC",
    shortLabel: "DURC",
    subject: "AZIENDA",
    group: "Documenti azienda",
    days: 120,
    base: "oggi",
    alertDays: [10, 1],
    description: "Documento unico di regolarità contributiva.",
  },
  {
    id: "polizza_merci",
    label: "Polizza merci trasportate",
    shortLabel: "Polizza merci",
    subject: "AZIENDA",
    group: "Documenti azienda",
    months: 12,
    base: "scadenza",
    alertDays: [30, 7, 1],
    description: "Assicurazione della merce trasportata.",
  },
  {
    id: "albo",
    label: "Albo autotrasportatori",
    shortLabel: "Albo",
    subject: "AZIENDA",
    group: "Documenti azienda",
    months: 12,
    base: "scadenza",
    alertDays: [30, 7, 1],
    description: "Quota annuale di iscrizione all'Albo.",
  },
];

export const DEADLINE_TYPE_MAP = new Map(DEADLINE_TYPES.map((type) => [type.id, type]));

export const DEFAULT_ALERT_DAYS = [30, 7, 1];

export function deadlineType(id: string): DeadlineType | undefined {
  return DEADLINE_TYPE_MAP.get(id);
}

export function deadlineAppliesToVehicle(type: DeadlineType, category: string | null | undefined): boolean {
  if (!type.vehicleCategories) return true;
  return Boolean(category && type.vehicleCategories.includes(category));
}

export function nextDeadlineDate(
  type: DeadlineType,
  from: Date | string,
  fallback?: Date
): string {
  const base = new Date(from);
  if (Number.isNaN(base.getTime())) {
    return new Date(fallback ?? Date.now()).toISOString().slice(0, 10);
  }
  const d = new Date(base.getTime());
  if (type.days) d.setUTCDate(d.getUTCDate() + type.days);
  else d.setUTCMonth(d.getUTCMonth() + (type.months ?? 12));
  return d.toISOString().slice(0, 10);
}

export function deadlineStatus(
  due: Date | string,
  alertDays: number[] = DEFAULT_ALERT_DAYS
): "SCADUTA" | "IN_SCADENZA" | "OK" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(due);
  date.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "SCADUTA";
  if (alertDays.some((value) => days <= value)) return "IN_SCADENZA";
  return "OK";
}

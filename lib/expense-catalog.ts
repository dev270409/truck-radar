export interface ExpenseCategoryDefinition {
  code: string;
  label: string;
  group: string;
  defaultVatRate: number;
}

/**
 * Catalogo unico delle spese aziendali.
 * I codici sono salvati in "Expense".category e non vanno rinomiati:
 * le etichette si possono cambiare senza migrare i dati.
 */
export const EXPENSE_CATEGORIES: ExpenseCategoryDefinition[] = [
  { code: "CARBURANTE", label: "Carburante", group: "Flotta", defaultVatRate: 22 },
  { code: "PEDAGGI", label: "Pedaggi e traghetti", group: "Flotta", defaultVatRate: 22 },
  { code: "MANUTENZIONE", label: "Manutenzione e officina", group: "Flotta", defaultVatRate: 22 },
  { code: "PNEUMATICI", label: "Pneumatici", group: "Flotta", defaultVatRate: 22 },
  { code: "ASSICURAZIONI", label: "Assicurazioni", group: "Flotta", defaultVatRate: 22 },
  { code: "BOLLO_TASSE", label: "Bollo e tasse veicoli", group: "Flotta", defaultVatRate: 0 },
  { code: "LEASING_NOLO", label: "Leasing e noleggio", group: "Flotta", defaultVatRate: 22 },
  { code: "PARCHEGGI", label: "Parcheggi e aree di sosta", group: "Flotta", defaultVatRate: 22 },
  { code: "STIPENDI", label: "Stipendi", group: "Personale", defaultVatRate: 0 },
  { code: "CONTRIBUTI", label: "Contributi e previdenza", group: "Personale", defaultVatRate: 0 },
  { code: "TRASFERTE", label: "Trasferte e rimborsi", group: "Personale", defaultVatRate: 0 },
  { code: "FORMAZIONE", label: "Formazione obbligatoria", group: "Personale", defaultVatRate: 22 },
  { code: "AFFITTO", label: "Affitto sede o magazzino", group: "Struttura", defaultVatRate: 22 },
  { code: "UTENZE", label: "Utenze", group: "Struttura", defaultVatRate: 22 },
  { code: "TELEFONIA", label: "Telefonia e connettività", group: "Struttura", defaultVatRate: 22 },
  { code: "SOFTWARE", label: "Software e licenze", group: "Struttura", defaultVatRate: 22 },
  { code: "CONSULENZE", label: "Consulenze professionali", group: "Servizi", defaultVatRate: 22 },
  { code: "TRASPORTI", label: "Trasporti conto terzi", group: "Servizi", defaultVatRate: 22 },
  { code: "MATERIALE_CONSUMO", label: "Materiale di consumo", group: "Servizi", defaultVatRate: 22 },
  { code: "PASTI", label: "Pasti e ospitalità", group: "Altro", defaultVatRate: 10 },
  { code: "ALTRO", label: "Altro", group: "Altro", defaultVatRate: 22 },
];

export const EXPENSE_CATEGORY_MAP: Record<string, ExpenseCategoryDefinition> =
  Object.fromEntries(EXPENSE_CATEGORIES.map((item) => [item.code, item]));

export const EXPENSE_CATEGORY_GROUPS = Array.from(
  EXPENSE_CATEGORIES.reduce((groups, item) => {
    const list = groups.get(item.group) ?? [];
    list.push(item);
    groups.set(item.group, list);
    return groups;
  }, new Map<string, ExpenseCategoryDefinition[]>())
).map(([group, items]) => ({ group, items }));

export const VAT_RATES = [0, 4, 5, 10, 22] as const;

export const PAYMENT_METHODS = [
  { code: "BONIFICO", label: "Bonifico" },
  { code: "CARTA", label: "Carta" },
  { code: "CONTANTI", label: "Contanti" },
  { code: "RIBA", label: "Ri.Ba." },
  { code: "ALTRO", label: "Altro" },
] as const;

export const PAYMENT_METHOD_MAP: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((item) => [item.code, item.label])
);

export function expenseCategoryLabel(code: string | null | undefined): string {
  if (!code) return "Senza categoria";
  return EXPENSE_CATEGORY_MAP[code]?.label ?? code;
}

export function expensePaymentLabel(code: string | null | undefined): string {
  if (!code) return "";
  return PAYMENT_METHOD_MAP[code] ?? code;
}

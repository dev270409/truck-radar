export const DOC_INBOX_STATUSES = [
  "DA_CLASSIFICARE",
  "DA_COLLEGARE",
  "DA_APPROVARE",
  "ARCHIVIATO",
  "RIFIUTATO",
] as const;

export const DOC_INBOX_TYPES = [
  "DDT",
  "FATTURA",
  "BOLLA",
  "ORDINE_RITIRO",
  "PACKING_LIST",
  "CMR",
  "POD",
  "LIBRETTO",
  "PATENTE",
  "CQC",
  "ASSICURAZIONE",
  "REVISIONE",
  "MULTA",
  "RICEVUTA_CARBURANTE",
  "NOTA_SPESE",
  "CONTRATTO",
  "VISURA",
  "DURC",
  "ALBO",
  "REN",
  "ALTRO",
] as const;

export const DOC_INBOX_SOURCES = ["UPLOAD", "EMAIL", "WHATSAPP", "API"] as const;

export type DocInboxStatus = (typeof DOC_INBOX_STATUSES)[number];
export type DocInboxType = (typeof DOC_INBOX_TYPES)[number];
export type DocInboxSource = (typeof DOC_INBOX_SOURCES)[number];

export function isDocInboxStatus(value: unknown): value is DocInboxStatus {
  return typeof value === "string" && DOC_INBOX_STATUSES.includes(value as DocInboxStatus);
}

export function isDocInboxType(value: unknown): value is DocInboxType {
  return typeof value === "string" && DOC_INBOX_TYPES.includes(value as DocInboxType);
}

export function isDocInboxSource(value: unknown): value is DocInboxSource {
  return typeof value === "string" && DOC_INBOX_SOURCES.includes(value as DocInboxSource);
}

export function normalizeDocType(value: unknown): string | null {
  if (value == null) return null;
  const raw = String(value).trim().toUpperCase().replace(/\s+/g, "_");
  return raw.length > 0 ? raw : null;
}

export function deriveInboxStatus(input: {
  docType?: string | null;
  tripId?: string | null;
  vehicleId?: string | null;
  customerName?: string | null;
  currentStatus?: string | null;
}): DocInboxStatus {
  if (input.currentStatus === "ARCHIVIATO" || input.currentStatus === "RIFIUTATO") {
    return input.currentStatus;
  }
  if (!input.docType) return "DA_CLASSIFICARE";
  if (!input.tripId && !input.vehicleId && !input.customerName) return "DA_COLLEGARE";
  return "DA_APPROVARE";
}

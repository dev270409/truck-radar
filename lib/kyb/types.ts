import { Prisma } from "@prisma/client";

/** Documento KYB fornito dall'utente (URL UploadThing) */
export interface KybInputFile {
  tipo: "VISURA" | "DOCUMENTO_IDENTITA" | "ALBO_AUTOTRASPORTATORI" | "REN" | "PARTITA_IVA" | "DOCUMENTO_IDENTITA_LEGALE_RAPPRESENTANTE";
  fileUrl: string;
  fileName?: string;
}

/** Struttura JSON estratta dai documenti tramite AI/OCR (§ KYC Zero-Form) */
export interface KybExtraction {
  ragione_sociale: string | null;
  partita_iva: string | null;
  codice_fiscale_azienda: string | null;
  indirizzo: string | null;
  legale_rappresentante: {
    nome: string | null;
    cognome: string | null;
    codice_fiscale_personale: string | null;
    numero_documento_identita: string | null;
    scadenza_documento_identita: string | null;
  };
  iscrizione_albo: {
    numero_iscrizione: string | null;
    provincia: string | null;
    stato: string | null;
  };
  licenza_ren: {
    numero_ren: string | null;
    stato: string | null;
  };
  documenti_rilevati: string[];
}

/** Esito della verifica ufficiale (Openapi.it / Registro Imprese) */
export interface KybVerification {
  provider: string;
  checkedAt: string;
  status: "ATTIVA" | "NON_TROVATA" | "INATTIVA" | "NON_CONFIGURATO";
  partitaIva: string;
  ragioneSocialeUfficiale: string | null;
  ragioneSocialeMatch: boolean | null;
  address: string | null;
}

/** Risultato completo dell'analisi KYB */
export interface KybAnalysis {
  provider: string;
  mode: "ai" | "mock" | "manual";
  extraction: KybExtraction;
  verification: KybVerification;
}

/** Conversione tipi KYB generici in valori enum KycDocType usati dal DB */
export function kybFileTipoToKycDocType(tipo: KybInputFile["tipo"]): string {
  const map: Record<KybInputFile["tipo"], string> = {
    VISURA: "PARTITA_IVA",
    PARTITA_IVA: "PARTITA_IVA",
    DOCUMENTO_IDENTITA: "DOCUMENTO_IDENTITA_LEGALE_RAPPRESENTANTE",
    DOCUMENTO_IDENTITA_LEGALE_RAPPRESENTANTE: "DOCUMENTO_IDENTITA_LEGALE_RAPPRESENTANTE",
    ALBO_AUTOTRASPORTATORI: "ALBO_TRASPORTATORI",
    REN: "LICENZA_REN",
  };
  return map[tipo];
}

export type KybExtractionRow = {
  id: string;
  companyId: string;
  provider: string;
  mode: string;
  extraction: Prisma.JsonValue;
  verification: Prisma.JsonValue;
  documenti: Prisma.JsonValue;
  createdAt: Date;
};
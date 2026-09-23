import { extractWithAI } from "./ai";
import { verifyPivaWithOpenapi } from "./openapi";
import type { KybAnalysis, KybExtraction, KybInputFile, KybVerification } from "./types";

/**
 * KYB Zero-Form orchestratore:
 * 1. Prova il provider AI (OpenAI/Gemini) se configurato;
 * 2. In assenza di chiavi o in caso d'errore, esegue il fallback "manual/mock":
 *    i dati vengono ripresi dai campi hint trasmessi dal frontend (quando l'utente
 *    preferisce compilare a mano) oppure restituisce un'estrazione vuota.
 * 3. Esegue la verifica ufficiale della P.IVA su Openapi.it (se configurata).
 */

export interface KybHints {
  ragioneSociale?: string | null;
  partitaIva?: string | null;
  nome?: string | null;
  cognome?: string | null;
  // marcatori di contesto; non vengono mai usati come dati reali
  demo?: boolean;
}

export function emptyKybExtraction(): KybExtraction {
  return {
    ragione_sociale: null,
    partita_iva: null,
    codice_fiscale_azienda: null,
    indirizzo: null,
    legale_rappresentante: {
      nome: null,
      cognome: null,
      codice_fiscale_personale: null,
      numero_documento_identita: null,
      scadenza_documento_identita: null,
    },
    iscrizione_albo: { numero_iscrizione: null, provincia: null, stato: null },
    licenza_ren: { numero_ren: null, stato: null },
    documenti_rilevati: [],
  };
}

export async function analyzeKyb(
  files: KybInputFile[],
  hints: KybHints = {}
): Promise<KybAnalysis> {
  // 1. Provider AI (con fallback automatico su errore/503/download non disponibile)
  let ai: { provider: string; extraction: KybExtraction } | null = null;
  try {
    ai = await extractWithAI(files);
  } catch {
    ai = null;
  }
  let extraction: KybExtraction;
  let provider: string;
  let mode: KybAnalysis["mode"];

  if (ai?.extraction) {
    extraction = ai.extraction;
    provider = ai.provider;
    mode = "ai";
  } else {
    extraction = buildManualExtraction(files, hints);
    provider = "manual";
    mode = "manual";
  }

  // 2. Verifica ufficiale P.IVA
  const verification: KybVerification = await verifyPivaWithOpenapi(
    extraction.partita_iva ?? hints.partitaIva ?? null
  );

  // 3. Verifica di coerenza ragione sociale (solo se la verifica è reale)
  if (verification.status === "ATTIVA" && extraction.ragione_sociale && verification.ragioneSocialeUfficiale) {
    verification.ragioneSocialeMatch =
      normalizeRagione(extraction.ragione_sociale) === normalizeRagione(verification.ragioneSocialeUfficiale);
  }

  return { provider, mode, extraction, verification };
}

/** Normalizzazione per confronto ragione sociale (minuscole, spazi, caratteri speciali). */
function normalizeRagione(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "").trim();
}

/** Estrazione "manual/mock": i dati compaiono solo se l'utente li ha inseriti a mano (hints). */
function buildManualExtraction(files: KybInputFile[], hints: KybHints): KybExtraction {
  const ex = emptyKybExtraction();
  ex.documenti_rilevati = files.map((f) => f.tipo);
  if (hints.ragioneSociale) ex.ragione_sociale = hints.ragioneSociale;
  if (hints.partitaIva) ex.partita_iva = hints.partitaIva.replace(/[\s-]/g, "");
  ex.legale_rappresentante.nome = hints.nome ?? null;
  ex.legale_rappresentante.cognome = hints.cognome ?? null;
  return ex;
}

/** Utilizzato dal frontend per verificare che l'estrazione contenga dati usabili. */
export function hasUsableKybData(e: KybExtraction): boolean {
  return Boolean(e.ragione_sociale && e.partita_iva);
}
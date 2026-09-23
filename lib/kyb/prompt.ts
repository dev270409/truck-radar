/**
 * Prompt System/User per l'estrazione KYB "Zero-Form" da documenti trasporti
 * (diapositiva "Custom & Zero-Form").
 * Oggetto di output rigoroso con: ragione sociale, P.IVA, CF, legale rappresentante,
 * iscrizione albo, licenza REN e lista documenti rilevati.
 */

export const KYB_SYSTEM_PROMPT = `Sei un sistema esperto di OCR e Know Your Business (KYB) per il settore del trasporto merci in Italia.
Analizza i documenti forniti in allegato (che possono includere Visura Camerale, Carta d'Identità, Licenza REN e Attestato d'Iscrizione all'Albo degli Autotrasportatori).
Il tuo compito è estrarre con la massima accuratezza i seguenti dati e restituirli ESCLUSIVAMENTE in formato JSON valido, rispettando questa struttura:

{
  "ragione_sociale": "string o null",
  "partita_iva": "string o null (11 cifre)",
  "codice_fiscale_azienda": "string o null",
  "indirizzo": "string o null",
  "legale_rappresentante": {
    "nome": "string o null",
    "cognome": "string o null",
    "codice_fiscale_personale": "string o null",
    "numero_documento_identita": "string o null",
    "scadenza_documento_identita": "YYYY-MM-DD o null"
  },
  "iscrizione_albo": {
    "numero_iscrizione": "string o null",
    "provincia": "string o null (es. MI)",
    "stato": "string o null"
  },
  "licenza_ren": {
    "numero_ren": "string o null",
    "stato": "string o null"
  },
  "documenti_rilevati": ["VISURA", "DOCUMENTO_IDENTITA", "ALBO_AUTOTRASPORTATORI", "REN"]
}

Regole severe:
1. Se un campo non è presente nei documenti forniti, restituisci null.
2. Normalizza le date nel formato ISO YYYY-MM-DD.
3. Rimuovi spazi e trattini dalla Partita IVA e dal Codice Fiscale.
4. Non inventare o allucinare informazioni non presenti nei file allegati.
5. Componi "documenti_rilevati" SOLO con i tipi effettivamente forniti tra: VISURA, DOCUMENTO_IDENTITA, ALBO_AUTOTRASPORTATORI, REN.`;

/** Prompt utente che elenca i documenti allegati (usato da provider AI/LLM). */
export function buildKybUserPrompt(files: Array<{ tipo: string; fileName?: string }>): string {
  const list = files
    .map((f) => `- ${f.tipo}${f.fileName ? ` (file: ${f.fileName})` : ""}`)
    .join("\n");
  return `Documenti forniti dall'utente per la verifica KYB:\n${list}\n\nEstrai i dati richiesti e restituisci il JSON strutturato.`;
}
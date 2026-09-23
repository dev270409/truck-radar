import type { KybVerification } from "./types";

/**
 * Verifica ufficiale della Partita IVA/Visura camerale via Openapi.it
 * (endpoint: https://visure.openapi.it/v2/company/it/{partita_iva}).
 * Con OPENAPI_API_KEY configurata esegue la chiamata reale; altrimenti
 * restituisce un esito NON_CONFIGURATO (il frontend mostra il flusso
 * "verifica non disponibile" come da roadmap - demo).
 */

const VATI_CHECK_REGEX = /^\d{11}$/;

export function openapiConfigured(): boolean {
  return Boolean(process.env.OPENAPI_API_KEY);
}

export async function verifyPivaWithOpenapi(piva: string | null): Promise<KybVerification> {
  const clean = (piva ?? "").replace(/[\s-]/g, "");
  const base: KybVerification = {
    provider: "openapi.it",
    checkedAt: new Date().toISOString(),
    status: "NON_TROVATA",
    partitaIva: clean,
    ragioneSocialeUfficiale: null,
    ragioneSocialeMatch: null,
    address: null,
  };

  if (!openapiConfigured()) {
    return { ...base, status: "NON_CONFIGURATO" };
  }
  if (!VATI_CHECK_REGEX.test(clean)) {
    return base;
  }

  try {
    const res = await fetch(`https://visure.openapi.it/v2/company/it/${clean}`, {
      headers: {
        accept: "application/json",
        "x-api-key": process.env.OPENAPI_API_KEY ?? "",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return { ...base, status: "NON_TROVATA" };
    }
    const data = (await res.json()) as any;
    const company = data?.data ?? data?.company ?? data;
    const stato = String(company?.state ?? company?.status ?? "ATTIVA").toUpperCase();
    const ragione = company?.nome ?? company?.name ?? company?.ragione_sociale ?? null;
    return {
      ...base,
      status: stato.includes("ATTIV") ? "ATTIVA" : stato.includes("INATTIV") ? "INATTIVA" : "NON_TROVATA",
      ragioneSocialeUfficiale: typeof ragione === "string" ? ragione : null,
      address: company?.address ?? company?.indirizzo ?? null,
    };
  } catch {
    return { ...base, status: "NON_TROVATA" };
  }
}

/** Rappresenta l'esito "verifica non disponibile in demo" per la UI. */
export function unconfiguredVerification(): KybVerification {
  return {
    provider: "openapi.it",
    checkedAt: new Date().toISOString(),
    status: "NON_CONFIGURATO",
    partitaIva: "",
    ragioneSocialeUfficiale: null,
    ragioneSocialeMatch: null,
    address: null,
  };
}
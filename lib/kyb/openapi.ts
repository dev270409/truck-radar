import type { KybVerification } from "./types";

/**
 * Verifica ufficiale della Partita IVA via Openapi.it — prodotto "Company".
 * (endpoint: https://company.openapi.com/IT-start/{partita_iva}).
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
    const res = await fetch(`https://company.openapi.com/IT-start/${clean}`, {
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
    const company = Array.isArray(data?.data) ? data.data[0] : data?.data ?? data?.company ?? data;
    const stato = String(company?.activityStatus ?? company?.state ?? company?.status ?? "ATTIVA").toUpperCase();
    const ragione = company?.companyName ?? company?.nome ?? company?.name ?? company?.ragione_sociale ?? null;
    const addressNode = company?.address?.registeredOffice ?? company?.address ?? company?.indirizzo ?? null;
    const address =
      typeof addressNode === "string"
        ? addressNode
        : [addressNode?.streetName, addressNode?.town ?? addressNode?.comune, addressNode?.zipCode ?? addressNode?.cap]
            .filter(Boolean)
            .join(", ") || null;
    return {
      ...base,
      status: stato.includes("ATTIV") ? "ATTIVA" : stato.includes("INATTIV") || stato.includes("CESSAT") ? "INATTIVA" : "NON_TROVATA",
      ragioneSocialeUfficiale: typeof ragione === "string" ? ragione : null,
      address,
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
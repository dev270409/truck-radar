import type { KybVerification } from "./types";

const TAX_ID_REGEX = /^\d{11}$|^[A-Z0-9]{16}$/;
const VAT_REGEX = /^\d{11}$/;

function baseVerification(identifier: string, provider = "openapi.it"): KybVerification {
  return {
    provider,
    checkedAt: new Date().toISOString(),
    status: "NON_TROVATA",
    partitaIva: identifier,
    ragioneSocialeUfficiale: null,
    ragioneSocialeMatch: null,
    address: null,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() && value !== "---" ? value.trim() : null;
}

export function openapiConfigured(): boolean {
  return Boolean(process.env.OPENAPI_API_KEY);
}

async function openapiLookup(identifier: string): Promise<KybVerification> {
  const base = baseVerification(identifier);
  try {
    const res = await fetch(`https://company.openapi.com/IT-start/${identifier}`, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${process.env.OPENAPI_API_KEY ?? ""}`,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return base;

    const data = (await res.json()) as unknown;
    const root = asRecord(data);
    const rawCompany = Array.isArray(root?.data) ? root.data[0] : root?.data ?? root?.company ?? root;
    const company = asRecord(rawCompany);
    if (!company) return base;

    const status = String(
      company.activityStatus ?? company.state ?? company.status ?? "ATTIVA"
    ).toUpperCase();
    const name = stringValue(
      company.companyName ?? company.nome ?? company.name ?? company.ragione_sociale
    );
    const addressRecord = asRecord(company.address);
    const addressNode = asRecord(addressRecord?.registeredOffice ?? company.address) ?? company;
    const address =
      typeof company.address === "string"
        ? company.address
        : [
            addressNode?.streetName,
            addressNode?.town ?? addressNode?.comune,
            addressNode?.zipCode ?? addressNode?.cap,
          ]
            .filter((part) => typeof part === "string" && part.trim())
            .join(", ") || null;

    return {
      ...base,
      status: status.includes("ATTIV")
        ? "ATTIVA"
        : status.includes("INATTIV") || status.includes("CESSAT")
          ? "INATTIVA"
          : "NON_TROVATA",
      ragioneSocialeUfficiale: name,
      address,
    };
  } catch {
    return base;
  }
}

async function viesLookup(vatNumber: string): Promise<KybVerification> {
  const base = baseVerification(vatNumber, "vies");
  try {
    const res = await fetch("https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countryCode: "IT", vatNumber }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return base;

    const data = asRecord((await res.json()) as unknown);
    if (!data || data.valid !== true) {
      return { ...base, status: data?.userError === "INVALID" ? "NON_TROVATA" : "NON_TROVATA" };
    }

    return {
      ...base,
      status: "ATTIVA",
      ragioneSocialeUfficiale: stringValue(data.name),
      address: stringValue(data.address),
    };
  } catch {
    return base;
  }
}

/**
 * Verifica un identificativo fiscale italiano (P.IVA 11 cifre o CF 16 caratteri).
 * Se Openapi è configurato usa il Registro Imprese; per le P.IVA fa fallback
 * gratuito su VIES. Un CF a 16 caratteri richiede un provider camerale.
 */
export async function verifyPivaWithOpenapi(identifier: string | null): Promise<KybVerification> {
  const clean = (identifier ?? "").replace(/[\s-]/g, "").toUpperCase();
  const base = baseVerification(clean);
  if (!TAX_ID_REGEX.test(clean)) return base;

  if (openapiConfigured()) {
    const openapi = await openapiLookup(clean);
    if (openapi.status === "ATTIVA" || openapi.status === "INATTIVA") return openapi;
    if (VAT_REGEX.test(clean)) {
      const vies = await viesLookup(clean);
      if (vies.status === "ATTIVA") return vies;
    }
    return openapi;
  }

  if (VAT_REGEX.test(clean)) return viesLookup(clean);
  return { ...base, status: "NON_CONFIGURATO" };
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

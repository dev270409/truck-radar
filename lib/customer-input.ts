import type { CustomerInputData } from "./ops";

/**
 * Validazione e normalizzazione dei payload anagrafica.
 * Le API accettano JSON non fidato: qui si convertono i campi, si limitano
 * le lunghezze e si rifiutano i valori palesemente errati.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SDI_RE = /^[A-Z0-9]{7}$/;

class InputError extends Error {}

function field(
  body: Record<string, unknown>,
  key: string,
  label: string,
  max: number
): string | null | undefined {
  const raw = body[key];
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "string") throw new InputError(`${label} non valido.`);
  const value = raw.trim();
  if (!value) return null;
  if (value.length > max) throw new InputError(`${label}: massimo ${max} caratteri.`);
  return value;
}

function optionalEmail(
  body: Record<string, unknown>,
  key: string,
  label: string
): string | null | undefined {
  const value = field(body, key, label, 160);
  if (value && !EMAIL_RE.test(value)) throw new InputError(`${label} non valida.`);
  return value;
}

function country(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) return value;
  const normalized = value.toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new InputError("Stato: usare il codice ISO a 2 lettere (es. IT).");
  }
  return normalized;
}

function vatField(source: Record<string, unknown>): string | null | undefined {
  const value = field(source, "vat", "P.IVA / CF", 32);
  if (!value) return value;
  const compact = value.replace(/\s+/g, "");
  if (!/^[A-Z0-9]{5,32}$/i.test(compact)) {
    throw new InputError("P.IVA / CF non valido.");
  }
  return compact.toUpperCase();
}

function sdiField(source: Record<string, unknown>): string | null | undefined {
  const value = field(source, "sdi", "Codice SDI", 7);
  if (!value) return value;
  const normalized = value.toUpperCase();
  if (!SDI_RE.test(normalized)) {
    throw new InputError("Codice SDI non valido: 7 caratteri alfanumerici.");
  }
  return normalized;
}

function provinceField(source: Record<string, unknown>): string | null | undefined {
  const value = field(source, "province", "Provincia", 4);
  return value ? value.toUpperCase() : value;
}

export function parseCustomerPayload(
  body: unknown,
  options: { partial: boolean }
): { ok: true; data: Partial<CustomerInputData> } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Corpo della richiesta non valido." };
  }
  const source = body as Record<string, unknown>;

  try {
    const name = field(source, "name", "Nome", 160);
    if (!options.partial && !name) {
      return { ok: false, error: "Il nome del cliente o fornitore è obbligatorio." };
    }
    if (name !== undefined && name !== null && name.length < 2) {
      return { ok: false, error: "Il nome deve avere almeno 2 caratteri." };
    }

    let type: string | undefined;
    if (source.type !== undefined) {
      const raw = String(source.type).trim().toUpperCase();
      if (!["CLIENTE", "FORNITORE"].includes(raw)) {
        return { ok: false, error: "Tipo non valido: usare CLIENTE o FORNITORE." };
      }
      type = raw;
    } else if (!options.partial) {
      type = "CLIENTE";
    }

    const data: Partial<CustomerInputData> = {
      name: name ?? undefined,
      type,
      contactName: field(source, "contactName", "Referente", 120),
      email: optionalEmail(source, "email", "Email"),
      phone: field(source, "phone", "Telefono", 40),
      address: field(source, "address", "Indirizzo", 240),
      city: field(source, "city", "Città", 120),
      province: provinceField(source),
      postalCode: field(source, "postalCode", "CAP", 20),
      country: country(field(source, "country", "Stato", 56)),
      vat: vatField(source),
      sdi: sdiField(source),
      pec: optionalEmail(source, "pec", "PEC"),
      paymentTerms: field(source, "paymentTerms", "Condizioni di pagamento", 120),
      notes: field(source, "notes", "Note", 2000),
    };

    for (const key of Object.keys(data) as Array<keyof CustomerInputData>) {
      if (data[key] === undefined) delete data[key];
    }

    return { ok: true, data };
  } catch (error) {
    if (error instanceof InputError) return { ok: false, error: error.message };
    throw error;
  }
}

export interface CustomerAddressInput {
  label?: string | null;
  address: string;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
  notes?: string | null;
}

export function parseCustomerAddressPayload(
  body: unknown
): { ok: true; data: CustomerAddressInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Corpo della richiesta non valido." };
  }
  const source = body as Record<string, unknown>;

  try {
    const address = field(source, "address", "Indirizzo", 240);
    if (!address) return { ok: false, error: "L'indirizzo è obbligatorio." };
    const province = field(source, "province", "Provincia", 4);

    return {
      ok: true,
      data: {
        label: field(source, "label", "Etichetta", 60),
        address,
        city: field(source, "city", "Città", 120),
        province: province ? province.toUpperCase() : province,
        postalCode: field(source, "postalCode", "CAP", 20),
        country: country(field(source, "country", "Stato", 56)),
        notes: field(source, "notes", "Note", 500),
      },
    };
  } catch (error) {
    if (error instanceof InputError) return { ok: false, error: error.message };
    throw error;
  }
}

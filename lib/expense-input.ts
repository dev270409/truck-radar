import { EXPENSE_CATEGORY_MAP, PAYMENT_METHODS } from "./expense-catalog";
import { isAllowedUploadUrl } from "./url-safety";

export interface ExpensePayload {
  date?: string;
  category?: string;
  supplier?: string | null;
  description?: string;
  amount?: number;
  vatRate?: number;
  paymentMethod?: string | null;
  receiptUrl?: string | null;
  receiptName?: string | null;
  notes?: string | null;
}

class InputError extends Error {}

const PAYMENT_CODES: Set<string> = new Set(PAYMENT_METHODS.map((item) => item.code));

function text(
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

function dateField(body: Record<string, unknown>, required: boolean): string | undefined {
  const raw = body.date;
  if (raw === undefined || raw === null || raw === "") {
    if (required) throw new InputError("La data della spesa è obbligatoria.");
    return undefined;
  }
  if (typeof raw !== "string") throw new InputError("Data non valida.");
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) throw new InputError("Data non valida.");
  return parsed.toISOString().slice(0, 10);
}

function numberField(
  body: Record<string, unknown>,
  key: string,
  label: string,
  options: { required: boolean; min: number; max: number }
): number | undefined {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === "") {
    if (options.required) throw new InputError(`${label} è obbligatorio.`);
    return undefined;
  }
  const value = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
  if (!Number.isFinite(value)) throw new InputError(`${label} non valido.`);
  if (value < options.min || value > options.max) {
    throw new InputError(`${label}: valore fuori intervallo.`);
  }
  return Math.round(value * 100) / 100;
}

export function parseExpensePayload(
  body: unknown,
  options: { partial: boolean }
): { ok: true; data: ExpensePayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Corpo della richiesta non valido." };
  }
  const source = body as Record<string, unknown>;

  try {
    const date = dateField(source, !options.partial);

    let category: string | undefined;
    if (source.category !== undefined) {
      const raw = String(source.category).trim().toUpperCase();
      if (!EXPENSE_CATEGORY_MAP[raw]) {
        return { ok: false, error: "Categoria di spesa non valida." };
      }
      category = raw;
    } else if (!options.partial) {
      return { ok: false, error: "La categoria della spesa è obbligatoria." };
    }

    const description = text(source, "description", "Descrizione", 240);
    if (!options.partial && !description) {
      return { ok: false, error: "La descrizione è obbligatoria." };
    }
    if (description !== undefined && description !== null && description.length < 2) {
      return { ok: false, error: "La descrizione deve avere almeno 2 caratteri." };
    }

    const amount = numberField(source, "amount", "Importo totale", {
      required: !options.partial,
      min: 0.01,
      max: 10_000_000,
    });
    const vatRate = numberField(source, "vatRate", "Aliquota IVA", {
      required: !options.partial,
      min: 0,
      max: 100,
    });

    let paymentMethod: string | null | undefined;
    if (source.paymentMethod !== undefined) {
      const raw = source.paymentMethod === null ? "" : String(source.paymentMethod).trim().toUpperCase();
      if (!raw) {
        paymentMethod = null;
      } else if (!PAYMENT_CODES.has(raw)) {
        return { ok: false, error: "Metodo di pagamento non valido." };
      } else {
        paymentMethod = raw;
      }
    }

    let receiptUrl: string | null | undefined;
    if (source.receiptUrl !== undefined) {
      if (source.receiptUrl === null || source.receiptUrl === "") {
        receiptUrl = null;
      } else if (!isAllowedUploadUrl(source.receiptUrl)) {
        return { ok: false, error: "Ricevuta non valida: caricarla di nuovo." };
      } else {
        receiptUrl = source.receiptUrl;
      }
    }

    const data: ExpensePayload = {
      date,
      category,
      supplier: text(source, "supplier", "Fornitore", 160),
      description: description ?? undefined,
      amount,
      vatRate,
      paymentMethod,
      receiptUrl,
      receiptName: text(source, "receiptName", "Nome ricevuta", 160),
      notes: text(source, "notes", "Note", 1000),
    };

    for (const key of Object.keys(data) as Array<keyof ExpensePayload>) {
      if (data[key] === undefined) delete data[key];
    }

    return { ok: true, data };
  } catch (error) {
    if (error instanceof InputError) return { ok: false, error: error.message };
    throw error;
  }
}

import type { ParsedTripLine, ParsedTripStatement } from "./trip-statement";

const MODEL =
  process.env.TRIP_STATEMENT_AI_MODEL ||
  process.env.KYB_AI_MODEL ||
  "gemini-3.1-flash-lite";

const PROMPT = `Sei un esperto di documenti di trasporto italiani.
Leggi il PDF allegato: è un rendiconto viaggi periodico inviato da un provider/committente a un vettore.
Estrai TUTTI i viaggi, senza inventare e senza saltarne nessuno.

Rispondi SOLO con JSON valido in questa forma:
{
  "provider": "nome provider o null",
  "periodStart": "YYYY-MM-DD o null",
  "periodEnd": "YYYY-MM-DD o null",
  "declaredTrips": numero o null,
  "declaredDays": numero o null,
  "declaredTotal": numero o null,
  "lines": [
    {
      "code": "codice viaggio (es. T268486)",
      "date": "YYYY-MM-DD",
      "pickupTime": "HH:MM",
      "pickupTimeExplicit": true/false,
      "description": "tratta e riferimenti",
      "customer": "committente/cliente finale",
      "amount": numero in euro
    }
  ]
}

Regole:
- Il codice è di solito la sigla T seguita da 5+ cifre.
- Se il documento indica "PARTENZA HH:MM", usa quell'ora e pickupTimeExplicit=true; altrimenti usa 08:00 e false.
- "customer" è l'ultima riga/entità prima del prezzo della riga.
- amount è il prezzo della singola riga, non il totale giornaliero.
- La somma delle righe deve avvicinarsi al totale dichiarato.
- Se un valore manca, usa null (o stringa vuota per i testi).`;

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[€\s]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const it = value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (it) {
    const year = it[3].length === 2 ? `20${it[3]}` : it[3];
    return `${year}-${it[2].padStart(2, "0")}-${it[1].padStart(2, "0")}`;
  }
  return null;
}

function normalizeTime(value: unknown): string {
  if (typeof value !== "string") return "08:00";
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "08:00";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function sanitize(raw: unknown): ParsedTripStatement | null {
  let data: any = raw;
  if (typeof data === "string") {
    const cleaned = data.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    try {
      data = JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object" || !Array.isArray(data.lines)) return null;

  const lines: ParsedTripLine[] = [];
  for (const item of data.lines) {
    if (!item || typeof item !== "object") continue;
    const code = String(item.code ?? "").trim().toUpperCase();
    const date = normalizeDate(item.date);
    const amount = parseAmount(item.amount);
    if (!/^[A-Z]\d{5,}$/.test(code) || !date || amount == null || amount <= 0) continue;
    lines.push({
      code,
      date,
      pickupTime: normalizeTime(item.pickupTime),
      pickupTimeExplicit: Boolean(item.pickupTimeExplicit),
      description: String(item.description ?? "").trim().slice(0, 2000),
      customer: String(item.customer ?? "").trim().slice(0, 255),
      amount,
      raw: "",
    });
  }
  if (lines.length === 0) return null;

  const declaredTrips = Number.isFinite(Number(data.declaredTrips))
    ? Number(data.declaredTrips)
    : null;
  const declaredDays = Number.isFinite(Number(data.declaredDays)) ? Number(data.declaredDays) : null;
  const declaredTotal = parseAmount(data.declaredTotal);

  return {
    provider: typeof data.provider === "string" && data.provider.trim() ? data.provider.trim() : null,
    periodStart: normalizeDate(data.periodStart),
    periodEnd: normalizeDate(data.periodEnd),
    declaredTrips,
    declaredDays,
    declaredTotal,
    lines,
    warnings: ["Rendiconto letto con AI: controllare l'anteprima prima di importare."],
  };
}

export function tripStatementAiConfigured(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

/**
 * Fallback per PDF scansionati (senza testo): Gemini legge il PDF nativamente.
 * Restituisce null se la chiave manca o la risposta non è valida.
 */
export async function parseTripStatementWithAi(
  buffer: Uint8Array
): Promise<ParsedTripStatement | null> {
  if (!tripStatementAiConfigured()) return null;

  const body = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT },
          {
            inline_data: {
              mime_type: "application/pdf",
              data: Buffer.from(buffer).toString("base64"),
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
    },
  });

  let lastError = "Errore AI sconosciuto";
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
        },
        body,
        signal: AbortSignal.timeout(90_000),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      lastError = `Gemini OCR ${res.status}: ${text.slice(0, 300)}`;
      if ((res.status === 429 || res.status === 503) && attempt < 3) continue;
      throw new Error(lastError);
    }
    const payload = await res.json();
    const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    return sanitize(raw);
  }
  throw new Error(lastError);
}

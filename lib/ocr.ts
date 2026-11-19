export type OcrKind = "packing" | "libretto";

export interface PackingItem {
  descrizione: string | null;
  quantita: number | null;
  lunghezzaCm: number | null;
  larghezzaCm: number | null;
  altezzaCm: number | null;
  pesoKg: number | null;
  impilabile: boolean | null;
  fragile: boolean | null;
}

export interface PackingExtraction {
  items: PackingItem[];
  note: string | null;
}

export interface LibrettoExtraction {
  targa: string | null;
  marca: string | null;
  modello: string | null;
  categoria: string | null;
  portataMaxKg: number | null;
  volumeMaxM3: number | null;
  classeEuro: string | null;
  dataRevisione: string | null;
  numeroAssi: number | null;
  note: string | null;
}

const MODEL = process.env.KYB_AI_MODEL || "gemini-3.1-flash-lite";

const PACKING_PROMPT = `Sei un assistente per un'azienda di autotrasporto. Analizza il packing list o il documento di carico allegato e restituisci SOLO JSON valido con questa forma:
{"items":[{"descrizione":"string|null","quantita":number|null,"lunghezzaCm":number|null,"larghezzaCm":number|null,"altezzaCm":number|null,"pesoKg":number|null,"impilabile":boolean|null,"fragile":boolean|null}],"note":"string|null"}
Regole:
- Una riga del documento = un item.
- Usa null se un dato non è presente o non è deducibile.
- Non inventare misure o pesi.
- Se il documento non è un packing list, restituisci {"items":[],"note":"Documento non riconosciuto come packing list"}.`;

const LIBRETTO_PROMPT = `Sei un assistente per un'azienda di autotrasporto. Analizza il libretto di circolazione o la carta di circolazione allegata e restituisci SOLO JSON valido con questa forma:
{"targa":"string|null","marca":"string|null","modello":"string|null","categoria":"FRIGO|TELONATO|SPONDA_IDRAULICA|CISTERNA|ADR|null","portataMaxKg":number|null,"volumeMaxM3":number|null,"classeEuro":"string|null","dataRevisione":"YYYY-MM-DD|null","numeroAssi":number|null,"note":"string|null"}
Regole:
- La portata va convertita in kg.
- Il volume, se non presente, resta null: non inventarlo.
- La categoria va scelta solo se deducibile dalla carrozzeria o dal tipo di allestimento.
- Non inventare dati non presenti.`;

function emptyPacking(): PackingExtraction {
  return { items: [], note: null };
}

function emptyLibretto(): LibrettoExtraction {
  return {
    targa: null,
    marca: null,
    modello: null,
    categoria: null,
    portataMaxKg: null,
    volumeMaxM3: null,
    classeEuro: null,
    dataRevisione: null,
    numeroAssi: null,
    note: null,
  };
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function asNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function asBool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "si" || v === "sì" || v === "yes") return true;
  if (v === "false" || v === "no") return false;
  return null;
}

function parseJson(raw: unknown): any {
  if (typeof raw === "object" && raw) return raw;
  if (typeof raw !== "string") return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = fenced ? fenced[1] : raw;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function sanitizePacking(raw: unknown): PackingExtraction {
  const parsed = parseJson(raw);
  if (!parsed || !Array.isArray(parsed.items)) return emptyPacking();
  const items: PackingItem[] = parsed.items.slice(0, 500).map((it: any) => ({
    descrizione: asString(it?.descrizione),
    quantita: asNumber(it?.quantita),
    lunghezzaCm: asNumber(it?.lunghezzaCm),
    larghezzaCm: asNumber(it?.larghezzaCm),
    altezzaCm: asNumber(it?.altezzaCm),
    pesoKg: asNumber(it?.pesoKg),
    impilabile: asBool(it?.impilabile),
    fragile: asBool(it?.fragile),
  }));
  return { items, note: asString(parsed.note) };
}

export function sanitizeLibretto(raw: unknown): LibrettoExtraction {
  const parsed = parseJson(raw);
  const base = emptyLibretto();
  if (!parsed || typeof parsed !== "object") return base;
  const cat = asString(parsed.categoria)?.toUpperCase() ?? null;
  const allowed = ["FRIGO", "TELONATO", "SPONDA_IDRAULICA", "CISTERNA", "ADR"];
  base.targa = asString(parsed.targa)?.toUpperCase().replace(/[^A-Z0-9]/g, "") ?? null;
  base.marca = asString(parsed.marca);
  base.modello = asString(parsed.modello);
  base.categoria = cat && allowed.includes(cat) ? cat : null;
  base.portataMaxKg = asNumber(parsed.portataMaxKg);
  base.volumeMaxM3 = asNumber(parsed.volumeMaxM3);
  base.classeEuro = asString(parsed.classeEuro);
  base.dataRevisione = asString(parsed.dataRevisione);
  base.numeroAssi = asNumber(parsed.numeroAssi);
  base.note = asString(parsed.note);
  return base;
}

export function ocrConfigured(): "google" | "openai" | null {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return "google";
  if (process.env.OPENAI_API_KEY?.startsWith("sk-")) return "openai";
  return null;
}

function splitDataUrl(dataUrl: string): { mime: string; b64: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("File non valido: atteso data URL base64.");
  if (match[2].length > 12_000_000) throw new Error("File troppo grande (max ~8 MB).");
  return { mime: match[1], b64: match[2] };
}

async function geminiJson(dataUrl: string, prompt: string): Promise<unknown> {
  const { mime, b64 } = splitDataUrl(dataUrl);
  const body = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: b64 } }],
      },
    ],
    generationConfig: { temperature: 0, responseMimeType: "application/json" },
  });
  let lastErr = "errore OCR";
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) await new Promise((r) => setTimeout(r, 1200 * attempt));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
        },
        body,
      }
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      lastErr = `Gemini OCR error ${res.status}: ${txt.slice(0, 300)}`;
      if ((res.status === 429 || res.status === 503) && attempt < 3) continue;
      throw new Error(lastErr);
    }
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  }
  throw new Error(lastErr);
}

async function openaiJson(dataUrl: string, prompt: string): Promise<unknown> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Restituisci solo JSON valido." },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI OCR error ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

export async function extractWithOcr(
  kind: OcrKind,
  dataUrl: string
): Promise<{ provider: string; data: PackingExtraction | LibrettoExtraction } | null> {
  const provider = ocrConfigured();
  if (!provider) return null;
  const prompt = kind === "packing" ? PACKING_PROMPT : LIBRETTO_PROMPT;
  const raw = provider === "google" ? await geminiJson(dataUrl, prompt) : await openaiJson(dataUrl, prompt);
  const data = kind === "packing" ? sanitizePacking(raw) : sanitizeLibretto(raw);
  return { provider, data };
}

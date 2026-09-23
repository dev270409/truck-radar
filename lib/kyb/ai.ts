import { buildKybUserPrompt, KYB_SYSTEM_PROMPT } from "./prompt";
import type { KybExtraction, KybInputFile } from "./types";

/**
 * Provider AI per l'estrazione KYB "Zero-Form".
 * - Google Gemini (GRATIS, free tier generoso: vision/doc + 1500 richieste/giorno
 *   su 2.5 Flash-Lite / 2.0 Flash, senza scadenza) — preferito di default se
 *   GOOGLE_GENERATIVE_AI_API_KEY è presente.
 * - OpenAI GPT-4o-mini (opzionale, a pagamento) usato SOLO se GOOGLE è assente.
 * Le immagini vengono scaricate da UploadThing e inviate in modalità vision.
 * Se nessuna chiave è configurata le funzioni restituiscono null: l'orchestratore
 * usa allora il fallback mock/manuale (demo).
 */

const KYB_AI_MODEL = process.env.KYB_AI_MODEL || "gemini-flash-latest";

function emptyExtraction(): KybExtraction {
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

export function aiProviderConfigured(): "openai" | "google" | null {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return "google";
  if (process.env.OPENAI_API_KEY?.startsWith("sk-")) return "openai";
  return null;
}

async function fetchAsBase64(fileUrl: string): Promise<string> {
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`Impossibile scaricare il documento KYB (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") ?? "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function sanitizeExtraction(raw: unknown, files: KybInputFile[]): KybExtraction {
  const base = emptyExtraction();
  let r: any = raw;
  if (typeof r === "string") {
    try {
      r = JSON.parse(r);
    } catch {
      r = null;
    }
  }
  if (!r || typeof r !== "object") return base;

  const lr =
    r.legale_rappresentante && typeof r.legale_rappresentante === "object"
      ? r.legale_rappresentante
      : {};
  const albo = r.iscrizione_albo && typeof r.iscrizione_albo === "object" ? r.iscrizione_albo : {};
  const ren = r.licenza_ren && typeof r.licenza_ren === "object" ? r.licenza_ren : {};

  base.ragione_sociale = typeof r.ragione_sociale === "string" ? r.ragione_sociale : null;
  base.partita_iva = typeof r.partita_iva === "string" ? r.partita_iva.replace(/[\s-]/g, "") : null;
  base.codice_fiscale_azienda =
    typeof r.codice_fiscale_azienda === "string" ? r.codice_fiscale_azienda.replace(/[\s-]/g, "").toUpperCase() : null;
  base.indirizzo = typeof r.indirizzo === "string" ? r.indirizzo : null;
  base.legale_rappresentante = {
    nome: typeof lr.nome === "string" ? lr.nome : null,
    cognome: typeof lr.cognome === "string" ? lr.cognome : null,
    codice_fiscale_personale:
      typeof lr.codice_fiscale_personale === "string" ? lr.codice_fiscale_personale.replace(/[\s-]/g, "").toUpperCase() : null,
    numero_documento_identita: typeof lr.numero_documento_identita === "string" ? lr.numero_documento_identita : null,
    scadenza_documento_identita: typeof lr.scadenza_documento_identita === "string" ? lr.scadenza_documento_identita : null,
  };
  base.iscrizione_albo = {
    numero_iscrizione: typeof albo.numero_iscrizione === "string" ? albo.numero_iscrizione : null,
    provincia: typeof albo.provincia === "string" ? albo.provincia : null,
    stato: typeof albo.stato === "string" ? albo.stato : null,
  };
  base.licenza_ren = {
    numero_ren: typeof ren.numero_ren === "string" ? ren.numero_ren : null,
    stato: typeof ren.stato === "string" ? ren.stato : null,
  };
  base.documenti_rilevati = Array.isArray(r.documenti_rilevati)
    ? (r.documenti_rilevati as string[]).filter((d) => typeof d === "string")
    : files.map((f) => f.tipo);

  return base;
}

/** Chiamata OpenAI (Chat Completions, vision). */
async function extractWithOpenAI(files: KybInputFile[], userPrompt: string): Promise<KybExtraction> {
  const content: Array<any> = [{ type: "text", text: userPrompt }];
  for (const f of files) {
    content.push({ type: "image_url", image_url: { url: await fetchAsBase64(f.fileUrl) } });
  }
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
        { role: "system", content: KYB_SYSTEM_PROMPT },
        { role: "user", content },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI KYB error ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? null;
  return sanitizeExtraction(raw, files);
}

/** Chiamata Google Gemini (generateContent, vision inline) — free tier. */
async function extractWithGemini(files: KybInputFile[], userPrompt: string): Promise<KybExtraction> {
  const inlineParts: Array<any> = [];
  for (const f of files) {
    const dataUrl = await fetchAsBase64(f.fileUrl);
    const [meta, b64] = dataUrl.split(",");
    const mime = meta.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
    inlineParts.push({ inline_data: { mime_type: mime, data: b64 } });
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${KYB_AI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-goog-api-key": process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${KYB_SYSTEM_PROMPT}\n\n${userPrompt}` }, ...inlineParts],
          },
        ],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Gemini KYB error ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  return sanitizeExtraction(raw, files);
}

/**
 * Estrae i dati aziendali dai documenti con il provider AI configurato.
 * Ritorna null se nessuna chiave AI è presente (→ fallback demo/manuale).
 */
export async function extractWithAI(
  files: KybInputFile[]
): Promise<{ provider: string; extraction: KybExtraction } | null> {
  const provider = aiProviderConfigured();
  if (!provider) return null;
  const userPrompt = buildKybUserPrompt(files);
  const extraction =
    provider === "openai" ? await extractWithOpenAI(files, userPrompt) : await extractWithGemini(files, userPrompt);
  return { provider, extraction };
}
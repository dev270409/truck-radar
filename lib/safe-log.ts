/**
 * Logging strutturato con redazione dei dati sensibili.
 * Non loggare mai password, token, chiavi, documenti o URL di upload.
 */

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "secret",
  "apiKey",
  "api_key",
  "apikey",
  "token",
  "authorization",
  "cookie",
  "fileUrl",
  "file_url",
  "iban",
  "card",
  "cvv",
  "email",
]);

/** Sostituisce i valori dei campi sensibili con un placeholder, ricorsivamente. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

/** Log strutturato su console: msg + dati redatti (caso server-only). */
export function safeLog(level: "info" | "warn" | "error", msg: string, data?: unknown): void {
  const payload = data === undefined ? "" : ` ${JSON.stringify(redact(data))}`;
  const line = `[TruckRadar:${level}] ${msg}${payload}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
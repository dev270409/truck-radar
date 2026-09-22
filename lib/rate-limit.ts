/**
 * Rate limit in-memory (pattern token bucket, per chiave).
 * Su Vercel serverless ogni istanza ha memoria propria: utile per mitigare
 * abusi di base in assenza di provider esterno; da sostituire con un rate
 * limit distribuito (es. Upstash) se il servizio scala su più istanze.
 */

const buckets = new Map<string, { used: number; resetAt: number }>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { used: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt, retryAfterSeconds: 0 };
  }
  if (bucket.used >= limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  bucket.used += 1;
  return {
    ok: true,
    remaining: limit - bucket.used,
    resetAt: bucket.resetAt,
    retryAfterSeconds: 0,
  };
}

/**
 * Chiave stabile di rate limit da un request: IP (se presente) + chiave di scopo.
 * Un iteratore per ogni istanza Vercel: la soglia va intesa come "per istanza".
 */
export function rateLimitKeyFromRequest(req: Request, scope: string): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return `${scope}:${ip}`;
}
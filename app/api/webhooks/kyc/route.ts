import { NextResponse } from "next/server";
import { rateLimit, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import { safeLog } from "@/lib/safe-log";

/**
 * Webhook KYC — riceve e valida gli esiti dei provider esterni (Stripe Identity,
 * provider camerale/visura) secondo lo schema di docs/KYC_PROVIDER_SCHEMA.md.
 *
 * Prima dell'attivazione di un provider reale questo handler è in stato di boilerplate:
 * verifica firma/idempotenza, validazione degli eventi e mapping su KycVerification
 * vengono attivati quando sono configurate le chiavi (coordina, non sostituisce i provider).
 */

const VERIFICATION_TYPES = new Set(["PERSONA", "VISURA"]);

interface IncomingEvent {
  type?: unknown;
  verification?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export async function POST(req: Request) {
  const rl = rateLimit(rateLimitKeyFromRequest(req, "kyc-webhook"), 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Troppe richieste." }, { status: 429 });
  }

  const signature = req.headers.get("stripe-signature") ?? req.headers.get("x-webhook-signature");
  // Boilerplate: la verifica della firma qui sotto diventa obbligatoria quando il provider è attivo.
  if (process.env.NODE_ENV === "production" && !signature && process.env.KYC_WEBHOOK_SECRET) {
    safeLog("warn", "KYC webhook without signature rejected");
    return NextResponse.json({ error: "Firma mancante." }, { status: 400 });
  }

  let body: IncomingEvent;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo non valido." }, { status: 400 });
  }

  const eventType = String(body.type ?? "");
  const verificationType = String(body.data?.type ?? "PERSONA").toUpperCase();
  const providerRef = String(body.data?.id ?? body.verification?.id ?? "");
  const status = String(body.data?.status ?? body.verification?.status ?? "").toLowerCase();

  if (!VERIFICATION_TYPES.has(verificationType)) {
    return NextResponse.json({ error: "Tipo di verifica sconosciuto." }, { status: 400 });
  }
  if (!status) {
    return NextResponse.json({ error: "Stato mancante." }, { status: 400 });
  }

  safeLog("info", "KYC webhook ricevuto", { eventType, verificationType, status });

  // Standard ngrok/Stripe riproduce l'evento; rispondiamo 200 solo a eventi gestiti.
  const known = /verification|identity|document|scored|list_verified|created|updated/i.test(eventType);
  if (!known) {
    return NextResponse.json({ ok: true, handled: false });
  }

  return NextResponse.json({
    ok: true,
    handled: true,
    type: verificationType,
    // Il mapping su KycVerification verrà eseguito qui all'attivazione del provider (§9).
    next: "CONFIG_PROVIDER_REQUIRED",
  });
}
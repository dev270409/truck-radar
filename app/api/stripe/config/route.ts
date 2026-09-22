import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isStripeConfigured } from "@/lib/plans";
import { safeLog } from "@/lib/safe-log";

/**
 * Configurazione Stripe esposta alla UI dei clienti per la card abbonamento.
 * Non espone mai la chiave segreta. Ritorna solo la publishable key e lo stato
 * di pronto (checkout abilitato solo se Stripe è configurato con chiave live).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "UFFICIO") {
    return NextResponse.json({ error: "Solo l'Admin (o Ufficio) può gestire l'abbonamento." }, { status: 403 });
  }

  const configured = isStripeConfigured();

  safeLog("info", "Config Stripe richiesta", { configured, companyId: session.user.companyId });

  return NextResponse.json({
    configured,
    publishableKey: configured ? (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null) : null,
    priceBase: process.env.STRIPE_PRICE_ID_BASE ?? null,
    pricePro: process.env.STRIPE_PRICE_ID_PRO ?? null,
  });
}
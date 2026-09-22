import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { safeLog } from "@/lib/safe-log";
import { isStripeReady } from "@/lib/plans";
import { rateLimit, rateLimitKeyFromRequest } from "@/lib/rate-limit";

/**
 * Avvia il checkout Stripe per l'abbonamento di un tenant.
 * - Necessita di chiave Stripe live configurata (èStripeReady).
 * - Crea un customer Stripe per la company se non già esistente.
 * - Ritorna l'URL della Stripe Checkout Session (mode subscription).
 * L'utente completa il pagamento su stripe.com; il webhook aggiorna lo stato.
 */
export async function POST(req: Request) {
  const rl = rateLimit(rateLimitKeyFromRequest(req, "stripe-checkout"), 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Troppe richieste." }, { status: 429 });
  }

  const session = await auth();
  const companyId = session?.user?.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "UFFICIO") {
    return NextResponse.json({ error: "Solo l'Admin (o Ufficio) può attivare l'abbonamento." }, { status: 403 });
  }

  if (!isStripeReady()) {
    return NextResponse.json({ error: "Configura Stripe con chiave live prima di avviare il checkout." }, { status: 503 });
  }

  let plan = "BASE";
  try {
    const body = (await req.json()) as { plan?: string };
    plan = body.plan === "PRO" ? "PRO" : "BASE";
  } catch {
    /* corpo opzionale */
  }

  const priceId =
    plan === "PRO" ? process.env.STRIPE_PRICE_ID_PRO : process.env.STRIPE_PRICE_ID_BASE;
  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID mancante per il piano ${plan} (var ${plan === "PRO" ? "STRIPE_PRICE_ID_PRO" : "STRIPE_PRICE_ID_BASE"}).` },
      { status: 500 }
    );
  }

  try {
    const company = await db.company.findUnique({
      where: { id: companyId },
      include: { users: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Azienda non trovata." }, { status: 404 });
    }

    // Customer Stripe riusabile: riusa quello già salvato nella Subscription, se presente.
    let stripeCustomerId: string | null = null;
    const existing = await db.subscription.findFirst({ where: { companyId } });
    if (existing?.stripeCustomerId) {
      stripeCustomerId = existing.stripeCustomerId;
    } else {
      const adminEmail = company.users[0]?.email || `${company.partitaIva}@demo.local`;
      const customer = await stripe.customers.create({
        email: adminEmail,
        name: company.ragioneSociale,
        metadata: { companyId },
      });
      stripeCustomerId = customer.id;
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { companyId, plan },
      success_url: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/dashboard?paid=1`,
      cancel_url: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/dashboard?cancel=1`,
      subscription_data: { metadata: { companyId, plan } },
    });

    safeLog("info", "Checkout Stripe avviato", { companyId, plan });
    return NextResponse.json({ url: checkout.url });
  } catch (err: any) {
    safeLog("error", "Creazione checkout Stripe fallita", { companyId, plan, message: err.message });
    return NextResponse.json({ error: "Impossibile avviare il checkout." }, { status: 500 });
  }
}
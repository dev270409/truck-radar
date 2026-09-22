import Stripe from "stripe";
import { db } from "./db";

/**
 * Client Stripe lazy: il modulo non deve fallire durante la raccolta
 * configurazione della build (Vercel), dove NODE_ENV=production ma le
 * env di segreto possono non essere ancora disponibili.
 * - `getStripe()` lancia SOLO a runtime se serve davvero Stripe e manca la chiave.
 * - Le route guestiscono già la casistica "stripe non pronta" (503) via isStripeReady().
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === "sk_test_mock_secret_key") {
    throw new Error("STRIPE_SECRET_KEY is required in production.");
  }
  if (!_stripe) {
    _stripe = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia" as any,
      typescript: true,
    });
  }
  return _stripe;
}

/**
 * Compat: client condiviso per codice esistente che fa stripe.xxx direttamente.
 * La chiave mock evitano errori a build time; le route che usano Stripe
 * controllano isStripeReady() prima di chiamarla.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock_secret_key", {
  apiVersion: "2025-02-24.acacia" as any,
  typescript: true,
});

/**
 * Creates a Stripe customer for a given tenant company
 */
export async function createStripeCustomer(companyId: string, email: string, name: string) {
  const client = getStripe();
  const customer = await client.customers.create({
    email,
    name,
    metadata: {
      companyId,
    },
  });

  return customer;
}

/**
 * Helper to prepare customer and subscription metadata for tenant companies
 */
export async function prepareCompanySubscription(companyId: string, priceId: string) {
  const company = await db.company.findUnique({
    where: { id: companyId },
    include: { users: true },
  });

  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  const adminEmail = company.users[0]?.email || "admin@example.com";
  const customer = await createStripeCustomer(companyId, adminEmail, company.ragioneSociale);

  return {
    customerId: customer.id,
    companyId,
  };
}
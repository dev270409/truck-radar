import Stripe from "stripe";
import { db } from "./db";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock_secret_key", {
  apiVersion: "2025-02-24.acacia" as any,
  typescript: true,
});

/**
 * Creates a Stripe customer for a given tenant company
 */
export async function createStripeCustomer(companyId: string, email: string, name: string) {
  const customer = await stripe.customers.create({
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

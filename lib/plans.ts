/**
 * Piani Truck Radar e Price ID Stripe corrispondenti.
 * I Price ID vanno inseriti nelle Environment Variables di Vercel/ambiente
 * (STRIPE_PRICE_ID_BASE / STRIPE_PRICE_ID_PRO) — mai nel repository.
 */

export interface PlanDef {
  key: "BASE" | "PRO";
  label: string;
  description: string;
  priceIdEnv: "STRIPE_PRICE_ID_BASE" | "STRIPE_PRICE_ID_PRO";
}

export const PLANS: PlanDef[] = [
  {
    key: "BASE",
    label: "BASE",
    description: "Per piccole flotte e avvio del network.",
    priceIdEnv: "STRIPE_PRICE_ID_BASE",
  },
  {
    key: "PRO",
    label: "PRO",
    description: "Borsa carichi, subappalto e Smart Return completi.",
    priceIdEnv: "STRIPE_PRICE_ID_PRO",
  },
];

export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && key.startsWith("sk_live_"));
}

export function isStripeReady(): boolean {
  return isStripeConfigured();
}
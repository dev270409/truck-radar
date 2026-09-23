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

/** Limiti operativi per piano (fonte: requisito prodotto). */
export interface PlanLimits {
  /** Massimo numero di mezzi gestibili. */
  vehicleLimit: number;
  /** Massimo numero di autisti gestibili. */
  driverLimit: number;
}

export const PLAN_DEFAULT_LIMITS: PlanLimits = { vehicleLimit: 15, driverLimit: 15 };

export function getPlanLimits(planKey?: string | null): PlanLimits {
  const key = (planKey || "BASE").toUpperCase();
  if (key === "PRO") {
    return { vehicleLimit: 50, driverLimit: 50 };
  }
  return PLAN_DEFAULT_LIMITS;
}

/**
 * Un'azienda ha accesso completo a tutte le sezioni solo con
 * un abbonamento attivo (BASE/PRO). Chi è in TRIAL/SOSPESO o con solo
 * KYC Livello 1 ha le funzioni base di gestione flotta e può solo
 * *vedere* le sezioni premium.
 */
export function hasFullSectionAccess(subscriptionStatus?: string | null): boolean {
  return subscriptionStatus === "ACTIVE";
}
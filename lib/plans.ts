/**
 * Piani Truck Radar e Price ID Stripe corrispondenti.
 * I Price ID vanno inseriti nelle Environment Variables di Vercel/ambiente
 * (STRIPE_PRICE_ID_BASE / STRIPE_PRICE_ID_PRO) — mai nel repository.
 *
 * In modalità self-hosted (TRUCK_RADAR_SELF_HOSTED=true) i limiti e l'accesso
 * alle sezioni non dipendono da Stripe ma dalla licenza firmata: vedi
 * `lib/license.ts`.
 */

import {
  getLicensedLimits,
  isSelfHosted,
  UNLICENSED_SELF_HOSTED_LIMITS,
} from "./license";

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
  // Self-hosted: i limiti sono definiti dalla licenza, non dall'abbonamento.
  if (isSelfHosted()) {
    return getLicensedLimits() ?? UNLICENSED_SELF_HOSTED_LIMITS;
  }
  const key = (planKey || "BASE").toUpperCase();
  if (key === "PRO") {
    return { vehicleLimit: 50, driverLimit: 50 };
  }
  return PLAN_DEFAULT_LIMITS;
}

/**
 * Funzioni commerciali incluse nel piano. Non modificano i limiti mezzi/autisti:
 * servono a mostrare il lock "Pro" e a predisporre l'automazione documenti.
 */
export interface PlanFeatures {
  /** Coda manuale "Documenti in arrivo" (disponibile anche in Base). */
  documentInbox: boolean;
  /** Classificazione/estrazione automatica da email e AI (solo Pro). */
  aiDocumentIntake: boolean;
  /** Numero aziendale e registro chiamate (solo Pro). */
  businessPhone: boolean;
  /** Dominio/email dedicata per i documenti (solo Pro). */
  customEmailDomain: boolean;
  /** WhatsApp Cloud API (solo Pro, a consumo). */
  whatsapp: boolean;
}

export function getPlanFeatures(planKey?: string | null): PlanFeatures {
  const key = (planKey || "BASE").toUpperCase();
  if (key === "PRO") {
    return {
      documentInbox: true,
      aiDocumentIntake: true,
      businessPhone: true,
      customEmailDomain: true,
      whatsapp: true,
    };
  }
  return {
    documentInbox: true,
    aiDocumentIntake: false,
    businessPhone: false,
    customEmailDomain: false,
    whatsapp: false,
  };
}

/**
 * Accesso completo: abbonamento ACTIVE oppure trial non scaduto.
 * Dopo il trial serve la verifica KYC/KYB e un piano attivo per le sezioni premium.
 */
export function hasFullSectionAccess(
  subscriptionStatus?: string | null,
  trialEndsAt?: Date | string | null
): boolean {
  // Self-hosted: l'accesso completo è concesso da una licenza valida.
  if (isSelfHosted()) return getLicensedLimits() !== null;
  if (subscriptionStatus === "ACTIVE") return true;
  if (subscriptionStatus === "TRIAL" && trialEndsAt) {
    return new Date(trialEndsAt).getTime() > Date.now();
  }
  return false;
}
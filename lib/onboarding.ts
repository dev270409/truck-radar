import { db } from "./db";

export interface OnboardingStatus {
  trialEndsAt: Date | null;
  trialActive: boolean;
  trialExpired: boolean;
  trialDaysLeft: number | null;
  kybStatus: string | null;
  kybVerified: boolean;
  kycStatus: string | null;
  kycVerified: boolean;
  complete: boolean;
  lastError: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isTrialActive(trialEndsAt?: Date | string | null): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() > Date.now();
}

export function trialDaysLeft(trialEndsAt?: Date | string | null): number | null {
  if (!trialEndsAt) return null;
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000));
}

export async function getOnboardingStatus(
  companyId: string,
  trialEndsAt?: Date | string | null
): Promise<OnboardingStatus> {
  const [kybRows, identityRows] = await Promise.all([
    db.$queryRawUnsafe(
      `SELECT "verification", "createdAt" FROM "KybExtraction"
       WHERE "companyId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
      companyId
    ) as Promise<Array<{ verification: unknown; createdAt: Date }>>,
    db.$queryRawUnsafe(
      `SELECT status, "lastError", "verifiedAt", "createdAt" FROM "IdentityVerification"
       WHERE "companyId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
      companyId
    ) as Promise<Array<{ status: string; lastError: string | null; verifiedAt: Date | null; createdAt: Date }>>,
  ]);

  const kybVerification = asRecord(kybRows[0]?.verification);
  const kybStatus = typeof kybVerification?.status === "string" ? kybVerification.status : null;
  const kybVerified = kybStatus === "ATTIVA";

  const identity = identityRows[0] ?? null;
  const kycStatus = identity?.status ?? null;
  const kycVerified = kycStatus === "verified";

  const active = isTrialActive(trialEndsAt);
  const expired = Boolean(trialEndsAt) && !active;

  return {
    trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
    trialActive: active,
    trialExpired: expired,
    trialDaysLeft: trialDaysLeft(trialEndsAt),
    kybStatus,
    kybVerified,
    kycStatus,
    kycVerified,
    complete: kybVerified && kycVerified,
    lastError: identity?.lastError ?? null,
  };
}

export function isIdentityEnabled(): boolean {
  if (process.env.STRIPE_IDENTITY_ENABLED === "true") return true;
  if (process.env.STRIPE_IDENTITY_ENABLED === "false") return false;
  return Boolean(process.env.STRIPE_SECRET_KEY) && process.env.NODE_ENV === "production";
}

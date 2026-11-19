export function getAppUrl(): string | null {
  const configured = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return null;
}

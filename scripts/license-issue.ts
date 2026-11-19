import { createPrivateKey, sign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { LicensePayload } from "../lib/license";

/**
 * Emette una license key firmata per un'installazione self-hosted.
 * Usa la chiave privata in `license-keys/private.pem` (vedi license-keygen.ts).
 *
 * Uso:
 *   npx tsx scripts/license-issue.ts --licensee "Acme Trasporti Srl" --plan PRO \
 *       --vehicles 50 --drivers 50 --months 12
 *
 * Opzioni:
 *   --licensee  intestatario (obbligatorio)
 *   --plan      BASE | PRO | ENTERPRISE (default PRO)
 *   --vehicles  limite mezzi (default: in base al piano)
 *   --drivers   limite autisti (default: in base al piano)
 *   --months    durata in mesi (default 12)
 *   --features  lista separata da virgole (opzionale)
 */

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const PLAN_DEFAULTS: Record<string, { vehicleLimit: number; driverLimit: number }> = {
  BASE: { vehicleLimit: 15, driverLimit: 15 },
  PRO: { vehicleLimit: 50, driverLimit: 50 },
  ENTERPRISE: { vehicleLimit: 500, driverLimit: 500 },
};

const licensee = arg("licensee");
if (!licensee) {
  console.error('Manca --licensee (es. --licensee "Acme Trasporti Srl").');
  process.exit(1);
}

const plan = (arg("plan") || "PRO").toUpperCase();
if (!PLAN_DEFAULTS[plan]) {
  console.error(`Piano non valido: ${plan} (usa BASE, PRO o ENTERPRISE).`);
  process.exit(1);
}

const defaults = PLAN_DEFAULTS[plan];
const vehicleLimit = Number(arg("vehicles") ?? defaults.vehicleLimit);
const driverLimit = Number(arg("drivers") ?? defaults.driverLimit);
const months = Number(arg("months") ?? 12);
const features = arg("features")
  ?.split(",")
  .map((f) => f.trim())
  .filter(Boolean);

if (!Number.isFinite(vehicleLimit) || vehicleLimit <= 0 || !Number.isFinite(driverLimit) || driverLimit <= 0) {
  console.error("Limiti veicoli/autisti non validi.");
  process.exit(1);
}

const privPath = path.join(process.cwd(), "license-keys", "private.pem");
if (!existsSync(privPath)) {
  console.error(`Chiave privata non trovata: ${privPath}. Esegui prima scripts/license-keygen.ts.`);
  process.exit(1);
}

const issuedAt = new Date();
const expiresAt = new Date(issuedAt);
expiresAt.setMonth(expiresAt.getMonth() + months);

const payload: LicensePayload = {
  v: 1,
  licensee,
  plan: plan as LicensePayload["plan"],
  vehicleLimit,
  driverLimit,
  issuedAt: issuedAt.toISOString(),
  expiresAt: expiresAt.toISOString(),
  ...(features && features.length > 0 ? { features } : {}),
};

const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
const privateKey = createPrivateKey(readFileSync(privPath, "utf8"));
const signature = sign(null, Buffer.from(payloadB64, "utf8"), privateKey).toString("base64url");
const licenseKey = `${payloadB64}.${signature}`;

console.log("Licenza emessa:");
console.log(`  intestatario : ${licensee}`);
console.log(`  piano        : ${plan}`);
console.log(`  mezzi/autisti: ${vehicleLimit}/${driverLimit}`);
console.log(`  scadenza     : ${expiresAt.toISOString()}`);
console.log("\nImposta questa variabile d'ambiente nell'installazione del cliente:\n");
console.log(`TRUCK_RADAR_SELF_HOSTED=true`);
console.log(`TRUCK_RADAR_LICENSE=${licenseKey}`);

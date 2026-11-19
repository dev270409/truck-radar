import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Genera la coppia di chiavi Ed25519 usata per firmare/verificare le licenze
 * self-hosted di Truck Radar.
 *
 * - La chiave PRIVATA resta in `license-keys/private.pem` (già in .gitignore:
 *   pattern `*.pem`). NON va mai committata, condivisa o pubblicata: serve solo
 *   a emettere le licenze con `scripts/license-issue.ts`.
 * - La chiave PUBBLICA va incollata nella costante `EMBEDDED_PUBLIC_KEY` di
 *   `lib/license.ts` (le chiavi pubbliche sono sicure da distribuire).
 *
 * Uso: npx tsx scripts/license-keygen.ts
 */

const dir = path.join(process.cwd(), "license-keys");
const privPath = path.join(dir, "private.pem");
const pubPath = path.join(dir, "public.pem");

if (existsSync(privPath)) {
  console.error(
    `Esiste già ${privPath}. Rimuovila esplicitamente per rigenerare la coppia ` +
      "(attenzione: invalida tutte le licenze già emesse)."
  );
  process.exit(1);
}

mkdirSync(dir, { recursive: true });

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

writeFileSync(pubPath, publicPem);
writeFileSync(privPath, privatePem, { mode: 0o600 });

console.log("Coppia di chiavi Ed25519 generata:");
console.log(`  pubblica : ${pubPath}`);
console.log(`  privata  : ${privPath} (NON committare)`);
console.log("\nIncolla la chiave pubblica in lib/license.ts (EMBEDDED_PUBLIC_KEY):\n");
console.log(publicPem);

import { generateKeyPairSync, sign } from "node:crypto";

/**
 * E2E del sistema di licenza self-hosted (nessun server richiesto).
 * Verifica: licenza valida, firma manomessa, licenza scaduta, fallback trial
 * self-hosted e comportamento non-self-hosted.
 *
 * Uso: npx tsx scripts/e2e-license.ts
 */

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();

(process.env as Record<string, string>).NODE_ENV = "test";
process.env.TRUCK_RADAR_LICENSE_PUBLIC_KEY = publicPem;
process.env.TRUCK_RADAR_SELF_HOSTED = "true";

function issue(payload: Record<string, unknown>): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(null, Buffer.from(payloadB64, "utf8"), privateKey).toString("base64url");
  return `${payloadB64}.${signature}`;
}

const basePayload = {
  v: 1,
  licensee: "Acme Trasporti Srl",
  plan: "PRO",
  vehicleLimit: 50,
  driverLimit: 50,
  issuedAt: new Date(Date.now() - 86_400_000).toISOString(),
  expiresAt: new Date(Date.now() + 86_400_000 * 30).toISOString(),
};

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.error(`  FAIL  ${name}`);
  }
}

async function main() {
  const license = await import("../lib/license");
  const { getPlanLimits } = await import("../lib/plans");

  // 1. Licenza valida
  process.env.TRUCK_RADAR_LICENSE = issue(basePayload);
  license.__resetLicenseCache();
  let state = license.getLicenseState();
  check("licenza valida riconosciuta", state.valid === true);
  check("intestatario letto", state.payload?.licensee === "Acme Trasporti Srl");
  check("limiti licenza applicati (50/50)", getPlanLimits("BASE").vehicleLimit === 50 && getPlanLimits("BASE").driverLimit === 50);

  // 2. Firma manomessa
  const parts = issue(basePayload).split(".");
  process.env.TRUCK_RADAR_LICENSE = `${parts[0]}.${Buffer.from("manomesso").toString("base64url")}`;
  license.__resetLicenseCache();
  state = license.getLicenseState();
  check("firma manomessa rifiutata", state.valid === false && state.reason === "Firma non valida");

  // 3. Licenza scaduta
  process.env.TRUCK_RADAR_LICENSE = issue({
    ...basePayload,
    expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
  });
  license.__resetLicenseCache();
  state = license.getLicenseState();
  check("licenza scaduta rifiutata", state.valid === false && state.reason === "Licenza scaduta");

  // 4. Self-hosted senza licenza → trial ridotto
  delete process.env.TRUCK_RADAR_LICENSE;
  license.__resetLicenseCache();
  state = license.getLicenseState();
  check("self-hosted senza licenza non valida", state.valid === false);
  const trial = getPlanLimits("PRO");
  check("fallback trial self-hosted (2/2)", trial.vehicleLimit === 2 && trial.driverLimit === 2);

  // 5. Non self-hosted → comportamento invariato (abbonamento)
  process.env.TRUCK_RADAR_SELF_HOSTED = "false";
  license.__resetLicenseCache();
  check("non self-hosted: PRO = 50", getPlanLimits("PRO").vehicleLimit === 50);
  check("non self-hosted: BASE = 15", getPlanLimits("BASE").vehicleLimit === 15);

  console.log(`\n${pass}/${pass + fail} PASS`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

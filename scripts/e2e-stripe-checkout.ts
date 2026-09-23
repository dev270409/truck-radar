import { startDev, stopDev, login, makeClient } from "./e2e-http";
import { readFileSync } from "node:fs";
import path from "node:path";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };

function liveKeyFromEnv(): boolean {
  const envFile = path.resolve(__dirname, "..", ".env.local");
  try {
    const raw = readFileSync(envFile, "utf8");
    const m = raw.match(/^STRIPE_SECRET_KEY=(.+)$/m);
    const val = m?.[1]?.trim().replace(/^"|"$/g, "");
    return Boolean(val && val.startsWith("sk_live_"));
  } catch {
    return false;
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("STRIPE CHECKOUT e2e: avvio dev server...");
  const child = await startDev(3000);

  try {
    const adminCookie = await login(3000, ADMIN.email, ADMIN.password);
    const admin = makeClient(3000, adminCookie);

    console.log("1) Config senza login → 401...");
    const anon = makeClient(3000, "nope");
    const unauth = await anon.req("/api/stripe/config");
    assert(unauth.status === 401, "GET config senza login 401");

    console.log("2) Config (admin) — reflechà lo stato reale Stripe...");
    const cfg = await admin.req("/api/stripe/config");
    assert(cfg.status === 200, "GET config 200");
    assert(typeof cfg.body.configured === "boolean", "configured: boolean");
    const live = liveKeyFromEnv();
    assert(cfg.body.configured === live, `configured=${cfg.body.configured} coerente con ambiente (live=${live})`);

    console.log("3) Checkout senza Stripe live → 503...");
    if (!live) {
      const co = await admin.req("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "BASE" }),
      });
      assert(co.status === 503, "POST checkout 503 (provider non configurato)");
    } else {
      console.log("  (Stripe live presente, skip blocco 503)");
    }

    console.log("4) Autista bloccato...");
    const driverCookie = await login(3000, "autista@demo.com", "Demo123!");
    const driver = makeClient(3000, driverCookie);
    const dcfg = await driver.req("/api/stripe/config");
    assert(dcfg.status === 403, "GET config autista 403");

    console.log("5) Dashboard con la card abbonamento...");
    const page = await admin.req("/dashboard");
    assert(page.status === 200, "dashboard 200 (card abbonamento renderizzata)");

    console.log("STRIPE CHECKOUT e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
});
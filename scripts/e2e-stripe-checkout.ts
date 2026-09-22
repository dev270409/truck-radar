import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };

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

    console.log("2) Config (admin) — chiave non live → configured=false...");
    const cfg = await admin.req("/api/stripe/config");
    assert(cfg.status === 200, "GET config 200");
    assert(cfg.body.configured === false, "configured=false (chiave test/mock presente)");

    console.log("3) Checkout senza Stripe live → 503...");
    const co = await admin.req("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "BASE" }),
    });
    assert(co.status === 503, "POST checkout 503 (provider non configurato)");

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
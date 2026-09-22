import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("INCASSO RAPIDO (Stripe Connect Soon) e2e: avvio dev server...");
  const child = await startDev(3000);

  try {
    const adminCookie = await login(3000, ADMIN.email, ADMIN.password);
    const admin = makeClient(3000, adminCookie);

    console.log("1) Endpoint lead senza login → 401...");
    const anon = makeClient(3000, "nope");
    const unauth = await anon.req("/api/finance/stripe-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    assert(unauth.status === 401, "POST lead senza login 401");

    console.log("2) Registrazione interesse (admin) — idempotente...");
    const first = await admin.req("/api/finance/stripe-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    assert(first.status === 200, "POST lead 200");
    assert(first.body.registered === true || first.body.already === true, "lead registrata o già presente (idempotente)");

    console.log("3) Seconda registrazione → idempotente (already)...");
    const second = await admin.req("/api/finance/stripe-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    assert(second.status === 200, "seconda POST 200");
    assert(second.body.already === true, "already=true (niente duplicati)");

    console.log("4) Pagine UI con il modulo 'In arrivo'...");
    const economia = await admin.req("/dashboard/economia");
    assert(economia.status === 200, "pagina economia 200");
    const market = await admin.req("/dashboard/marketplace");
    assert(market.status === 200, "pagina borsa carichi 200");

    console.log("INCASSO RAPIDO e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
});
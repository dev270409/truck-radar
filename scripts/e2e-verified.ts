import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const DRIVER = { email: "autista@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("VERIFIED ACCOUNT e2e: avvio dev server...");
  const child = await startDev(3000);

  try {
    const adminCookie = await login(3000, ADMIN.email, ADMIN.password);
    const driverCookie = await login(3000, DRIVER.email, DRIVER.password);
    const admin = makeClient(3000, adminCookie);
    const driver = makeClient(3000, driverCookie);

    console.log("1) GET verifica (admin)...");
    const res = await admin.req("/api/account/verification");
    assert(res.status === 200, `GET /api/account/verification 200 (${res.status})`);
    assert(typeof res.body.verified === "boolean", "verified booleano");
    const crit = res.body.criteria as Array<{ key: string; ok: boolean }>;
    assert(crit.length >= 4, `criteri >= 4 (${crit.length})`);
    const keys = crit.map((c) => c.key).sort();
    assert(JSON.stringify(keys) === JSON.stringify(["abbonamento", "api", "flotta", "verifica"]), "criteri: abbonamento, api, flotta, verifica");

    const initialVerified = res.body.verified;
    console.log(`   verified iniziale: ${initialVerified}`);

    console.log("2) GET verifica (autista) accessibile...");
    const resD = await driver.req("/api/account/verification");
    assert(resD.status === 200, `verifica autista 200 (${resD.status})`);

    console.log("3) Attivo il requisito API: collego, testo e sincronizzo una connessione...");
    const cat = await admin.req("/api/integrazioni");
    const gpsProv = cat.body.catalogo.find((p: any) => p.provider === "GPS").id;
    const conn = await admin.req("/api/integrazioni", {
      method: "POST",
      body: JSON.stringify({
        integrationId: gpsProv,
        name: "GPS Verified e2e",
        baseUrl: "https://api.gps-demo.example.com",
        credentials: { apiKey: "sk-demo" },
      }),
    });
    const connId = conn.body.connection.id;
    await admin.req(`/api/integrazioni/${connId}/test`, { method: "POST" });
    const sync = await admin.req(`/api/integrazioni/${connId}/sync`, { method: "POST" });
    assert(sync.status === 200, `GPS sync 200 (${sync.status})`);

    console.log("4) Verified dopo API+abbonamento+KYC...");
    const after = await admin.req("/api/account/verification");
    assert(after.status === 200, "verifica 200 dopo sync");
    const apiCrit = after.body.criteria.find((c: any) => c.key === "api");
    assert(apiCrit.ok === true, "criterio api ok");
    console.log(`   verified dopo: ${after.body.verified}`);

    console.log("5) Badge in dashboard / layout...");
    const dash = await admin.req("/dashboard");
    assert(dash.status === 200, `dashboard 200 (${dash.status})`);

    // Lascio la connessione GPS come dato demo (utile per marketplace/smart return)
    console.log("   (connessione GPS demo mantenuta per il network)");

    console.log("VERIFIED ACCOUNT e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
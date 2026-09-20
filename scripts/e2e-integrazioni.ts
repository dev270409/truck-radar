import { startDev, stopDev, login, makeClient } from "./e2e-http";
import { listApiConnections } from "../lib/raw-tables";
import { decryptSecret, hasSecret } from "../lib/crypto";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const DRIVER = { email: "autista@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("INTEGRAZIONI e2e: avvio dev server...");
  const child = await startDev(3000);

  try {
    const adminCookie = await login(3000, ADMIN.email, ADMIN.password);
    const driverCookie = await login(3000, DRIVER.email, DRIVER.password);
    const admin = makeClient(3000, adminCookie);
    const driver = makeClient(3000, driverCookie);

    console.log("1) Catalogo provider...");
    const cat = await admin.req("/api/integrazioni");
    assert(cat.status === 200, `GET /api/integrazioni 200 (${cat.status})`);
    const providers = cat.body.catalogo as Array<{ id: string; provider: string; type: string }>;
    assert(providers.length >= 6, `catalogo >= 6 provider (${providers.length})`);
    const byProv = Object.fromEntries(providers.map((p) => [p.provider, p.id]));
    for (const k of ["GPS", "TMS", "ERP", "TACHIGRAFO", "BORSA-CARICHI", "CARBURANTE"]) {
      assert(Boolean(byProv[k]), `provider ${k} presente`);
    }

    console.log("2) Acces control...");
    const forbidden = await driver.req("/api/integrazioni");
    assert(forbidden.status === 403, `autista 403 su integrazioni (${forbidden.status})`);

    console.log("3) Connessione GPS valida...");
    const conn = await admin.req("/api/integrazioni", {
      method: "POST",
      body: JSON.stringify({
        integrationId: byProv.GPS,
        name: "GPS Flotta",
        baseUrl: "https://api.gps-demo.example.com",
        credentials: { apiKey: "sk-super-secret-123", username: "azienda" },
      }),
    });
    assert(conn.status === 201, `collega GPS 201 (${conn.status})`);
    const connId = conn.body.connection.id;
    assert(conn.body.connection.status === "DRAFT", "nuova connessione DRAFT");

    console.log("4) Base URL non valido → 400...");
    const badUrl = await admin.req("/api/integrazioni", {
      method: "POST",
      body: JSON.stringify({ integrationId: byProv.TMS, name: "x", baseUrl: "ftp://x" }),
    });
    assert(badUrl.status === 400, `baseUrl invalida 400 (${badUrl.status})`);

    console.log("5) Provider sconosciuto → 404...");
    const badProv = await admin.req("/api/integrazioni", {
      method: "POST",
      body: JSON.stringify({ integrationId: "nope", name: "x" }),
    });
    assert(badProv.status === 404, `provider sconosciuto 404 (${badProv.status})`);

    console.log("6) Test senza baseUrl → 400...");
    const noUrl = await admin.req("/api/integrazioni", {
      method: "POST",
      body: JSON.stringify({ integrationId: byProv.TMS, name: "TMS no url", credentials: { apiKey: "k" } }),
    });
    const tryTestNoUrl = await admin.req(`/api/integrazioni/${noUrl.body.connection.id}/test`, { method: "POST" });
    assert(tryTestNoUrl.status === 400, `test senza baseUrl 400 (${tryTestNoUrl.status})`);

    console.log("7) Test connessione GPS → TESTED...");
    const t1 = await admin.req(`/api/integrazioni/${connId}/test`, { method: "POST" });
    assert(t1.status === 200 && t1.body.connection.status === "TESTED", `test GPS → TESTED (${t1.status})`);
    assert(t1.body.detail?.ok === true, "detail.ok true");

    console.log("8) Sync senza test → 400...");
    const trySyncNoUrl = await admin.req(`/api/integrazioni/${noUrl.body.connection.id}/sync`, { method: "POST" });
    assert(trySyncNoUrl.status === 400, `sync su non-TESTED 400 (${trySyncNoUrl.status})`);

    console.log("9) Sync GPS → SYNCED...");
    const s1 = await admin.req(`/api/integrazioni/${connId}/sync`, { method: "POST" });
    assert(s1.status === 200 && s1.body.connection.status === "SYNCED", `sync GPS → SYNCED (${s1.status})`);

    console.log("10) Roundtrip cifratura (nessun segreto in chiaro)...");
    const companyId = conn.body.connection.companyId as string;
    const direct = await listApiConnections(companyId);
    const myRow = direct.find((r) => r.id === connId);
    assert(myRow !== undefined, "connessione presente su DB");
    assert(hasSecret(myRow?.credentialsCipher ?? null), "credenziali cifrate nel DB");
    assert(!(myRow?.credentialsCipher ?? "").includes("sk-super-secret"), "secret non in chiaro nel DB");
    const decrypted = decryptSecret(myRow!.credentialsCipher!);
    assert(decrypted.includes("sk-super-secret"), "decrittazione corretta (roundtrip)");

    console.log("11) Lista masked (niente secret restituiti)...");
    const list = await admin.req("/api/integrazioni");
    const mine = list.body.connessioni.find((c: any) => c.id === connId);
    assert(mine?.hasCreds === true, "hasCreds true nella lista");
    assert(mine?.credsKeys === 2, "credsKeys = 2 campi");
    const text = JSON.stringify(mine);
    assert(!text.includes("sk-super-secret"), "lista senza secret in chiaro");

    console.log("12) Disconnect → 200...");
    const del = await admin.req(`/api/integrazioni/${connId}`, { method: "DELETE" });
    assert(del.status === 200 && del.body.ok === true, `disconnect 200 (${del.status})`);
    const after = await admin.req("/api/integrazioni");
    assert(!after.body.connessioni.some((c: any) => c.id === connId), "connessione rimossa");

    console.log("13) Pagina UI...");
    const page = await admin.req("/dashboard/integrazioni");
    assert(page.status === 200, `pagina /dashboard/integrazioni 200 (${page.status})`);

    console.log("INTEGRAZIONI e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
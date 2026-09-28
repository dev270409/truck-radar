import { startDev, stopDev, login, makeClient } from "./e2e-http";
import { deleteGeotabTripSnapshots, listApiConnections, saveGeotabSnapshot, upsertGeotabTripSnapshots } from "../lib/raw-tables";
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
    const providers = cat.body.catalogo as Array<{ id: string; provider: string; type: string; docsUrl?: string | null }>;
    assert(providers.length >= 6, `catalogo >= 6 provider (${providers.length})`);
    const byProv = Object.fromEntries(providers.map((p) => [p.provider, p.id]));
    for (const k of ["GPS", "TMS", "ERP", "TACHIGRAFO", "BORSA-CARICHI", "CARBURANTE"]) {
      assert(Boolean(byProv[k]), `provider ${k} presente`);
    }
    assert(Boolean(byProv.GEOTAB), "provider GEOTAB presente");
    const geotab = providers.find((p) => p.provider === "GEOTAB");
    assert(Boolean(geotab?.docsUrl?.startsWith("https://developers.geotab.com/")), "Geotab link documentazione ufficiale");

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

    console.log("5b) Geotab richiede database, username e password...");
    const missingGeotabCreds = await admin.req("/api/integrazioni", {
      method: "POST",
      body: JSON.stringify({ integrationId: byProv.GEOTAB, name: "MyGeotab", baseUrl: "https://my.geotab.com", credentials: { username: "api@example.test" } }),
    });
    assert(missingGeotabCreds.status === 400, `Geotab senza credenziali complete 400 (${missingGeotabCreds.status})`);

    console.log("5c) Snapshot Geotab letto e mostrato in mappa senza creare un Vehicle locale...");
    const geotabConn = await admin.req("/api/integrazioni", {
      method: "POST",
      body: JSON.stringify({
        integrationId: byProv.GEOTAB,
        name: "Geotab snapshot e2e",
        baseUrl: "https://my.geotab.com",
        credentials: { database: "test-db", username: "api@test.invalid", password: "test-secret" },
      }),
    });
    assert(geotabConn.status === 201, `crea configurazione Geotab (${geotabConn.status})`);
    assert(!("credentialsCipher" in geotabConn.body.connection), "cipher Geotab assente dalla risposta browser");
    const session = await admin.req("/api/auth/session");
    const companyId = session.body.user.companyId as string;
    const geotabId = geotabConn.body.connection.id as string;
    await saveGeotabSnapshot(companyId, geotabId, {
      source: "GEOTAB",
      snapshotAt: new Date().toISOString(),
      positionsAvailable: true,
      devices: [{ geotabId: "geo-device-1", name: "Taros truck", licensePlate: "TR123OS", latitude: 45.46, longitude: 9.19, isDriving: true, isDeviceCommunicating: true, driverName: "Mario Rossi" }],
      drivers: [{ geotabId: "geo-driver-1", firstName: "Mario", lastName: "Rossi" }],
    });
    const historicalStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await upsertGeotabTripSnapshots(companyId, geotabId, [{
      geotabTripId: "geo-trip-e2e",
      geotabDeviceId: "geo-device-1",
      geotabDriverId: "geo-driver-1",
      deviceName: "Taros truck",
      licensePlate: "TR123OS",
      driverName: "Mario Rossi",
      startAt: historicalStart,
      stopAt: new Date().toISOString(),
      distanceKm: 123.4,
      odometerMeters: 456000,
      drivingSeconds: "PT2H",
      idlingSeconds: "PT5M",
    }]);
    const fleetMap = await admin.req("/api/fleet/map");
    assert(fleetMap.status === 200, `GET mappa flotta 200 (${fleetMap.status})`);
    assert(fleetMap.body.vehicles.some((v: any) => v.source === "GEOTAB" && v.targa === "TR123OS"), "dispositivo snapshot presente sulla mappa");
    assert(!fleetMap.body.vehicles.some((v: any) => v.id === "geo-device-1"), "snapshot non inventa ID Vehicle locali");
    const analyticsGeotab = await admin.req("/api/analytics/geotab");
    assert(analyticsGeotab.status === 200 && analyticsGeotab.body.totalTrips === 1, "analytics Geotab legge lo storico tenant-scoped");
    assert(analyticsGeotab.body.totalKm === 123.4 && analyticsGeotab.body.unladenKm === null, "km tracciati reali, km a vuoto non inventati");
    const geotabList = await admin.req("/api/integrazioni");
    const geotabListed = geotabList.body.connessioni.find((c: any) => c.id === geotabId);
    assert(geotabListed?.geotabSnapshot?.drivers?.length === 1, "snapshot driver disponibile alla UI admin");
    const geotabDisconnect = await admin.req(`/api/integrazioni/${geotabId}`, { method: "DELETE" });
    assert(geotabDisconnect.status === 200, "rimuove snapshot/connessione di test");

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
    assert(!("credentialsCipher" in t1.body.connection), "test API non restituisce ciphertext");

    console.log("8) Sync senza test → 400...");
    const trySyncNoUrl = await admin.req(`/api/integrazioni/${noUrl.body.connection.id}/sync`, { method: "POST" });
    assert(trySyncNoUrl.status === 400, `sync su non-TESTED 400 (${trySyncNoUrl.status})`);

    console.log("9) Sync GPS → SYNCED...");
    const s1 = await admin.req(`/api/integrazioni/${connId}/sync`, { method: "POST" });
    assert(s1.status === 200 && s1.body.connection.status === "SYNCED", `sync GPS → SYNCED (${s1.status})`);
    assert(!("credentialsCipher" in s1.body.connection), "sync API non restituisce ciphertext");

    console.log("10) Roundtrip cifratura (nessun segreto in chiaro)...");
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
    assert(!("credentialsCipher" in conn.body.connection), "API collegamento non restituisce ciphertext al browser");
    const text = JSON.stringify(mine);
    assert(!text.includes("sk-super-secret"), "lista senza secret in chiaro");

    console.log("12) Disconnect → 200...");
    const del = await admin.req(`/api/integrazioni/${connId}`, { method: "DELETE" });
    assert(del.status === 200 && del.body.ok === true, `disconnect 200 (${del.status})`);
    const after = await admin.req("/api/integrazioni");
    assert(!after.body.connessioni.some((c: any) => c.id === connId), "connessione rimossa");

    console.log("13) Pagina UI...");
    const page = await fetch("http://localhost:3000/dashboard/integrazioni", { headers: { Cookie: adminCookie } });
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

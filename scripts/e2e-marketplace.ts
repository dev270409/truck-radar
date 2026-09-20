import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const DRIVER = { email: "autista@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("MARKETPLACE e2e: avvio dev server...");
  const child = await startDev(3000);

  try {
    const adminCookie = await login(3000, ADMIN.email, ADMIN.password);
    const driverCookie = await login(3000, DRIVER.email, DRIVER.password);
    const admin = makeClient(3000, adminCookie);
    const driver = makeClient(3000, driverCookie);

    console.log("1) Gate ruolo: autista 403...");
    const g = await driver.req("/api/marketplace");
    assert(g.status === 403, `AUTISTA GET /api/marketplace 403 (${g.status})`);

    console.log("2) GET lista (admin)...");
    const list = await admin.req("/api/marketplace");
    assert(list.status === 200, `GET /api/marketplace 200 (${list.status})`);
    assert(Array.isArray(list.body.carichi), "carichi array");
    assert(typeof list.body.mioAccount?.verified === "boolean", "mioAccount.verified");
    const baseCount = list.body.carichi.length;

    console.log("3) POST valido → 201...");
    const pub = await admin.req("/api/marketplace", {
      method: "POST",
      body: JSON.stringify({
        kind: "OFFRO",
        luogoRitiro: "Milano",
        luogoConsegna: "Roma",
        dataRitiro: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
        dataConsegna: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
        tipoMerce: "Ortofrutta",
        pesoKg: 12000,
        volumeM3: 42,
        vehicleCategory: "TELONATO",
        prezzo: 850,
      }),
    });
    assert(pub.status === 201, `POST pubblico 201 (${pub.status})`);
    const loadId = pub.body.carico.id;

    console.log("4) Il carico è visibile in lista come MIO...");
    const list2 = await admin.req("/api/marketplace");
    const mine = list2.body.carichi.find((c: any) => c.id === loadId);
    assert(mine && mine.isMine === true, "carico mio visibile con isMine=true");
    assert(mine.status === "ATTIVO", "stato ATTIVO");

    console.log("5) GET con filtro kind CERCO → il carico OFFRO non c'è...");
    const listCerco = await admin.req("/api/marketplace?kind=CERCO");
    assert(!listCerco.body.carichi.some((c: any) => c.id === loadId), "filtro kind CERCO esclude OFFRO");

    console.log("6) POST con dati mancanti → 400...");
    const bad = await admin.req("/api/marketplace", {
      method: "POST",
      body: JSON.stringify({ kind: "OFFRO" }),
    });
    assert(bad.status === 400, `POST mancante 400 (${bad.status})`);

    console.log("7) Matcher inverso sul carico appena pubblicato...");
    const m = await admin.req(
      `/api/marketplace/matches?origine=Milano&destinazione=Roma&dataRitiro=${new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}`
    );
    assert(m.status === 200, `GET /api/marketplace/matches 200 (${m.status})`);
    assert(Array.isArray(m.body.matches), "matches array");

    console.log("8) Match su percorso inverso: pubblico CERCO Roma→Milano...");
    const pubBack = await admin.req("/api/marketplace", {
      method: "POST",
      body: JSON.stringify({
        kind: "CERCO",
        luogoRitiro: "Roma",
        luogoConsegna: "Milano",
        dataRitiro: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
        dataConsegna: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
        pesoKg: 8000,
      }),
    });
    assert(pubBack.status === 201, `pubblicazione CERCO 201 (${pubBack.status})`);
    const m2 = await admin.req(
      `/api/marketplace/matches?origine=Milano&destinazione=Roma&dataRitiro=${new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}`
    );
    const matched = m2.body.matches.find((x: any) => x.id === pubBack.body.carico.id);
    assert(!!matched, "il carico CERCO inverso Roma→Milano viene suggerito");
    assert(matched.score >= 2, `score >= 2 (${matched.score})`);

    console.log("9) PATCH stato COMPLETATO (own)...");
    const patch = await admin.req(`/api/marketplace/${loadId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "COMPLETATO" }),
    });
    assert(patch.status === 200, `PATCH 200 (${patch.status})`);

    console.log("10) PATCH su carico non proprio (garbage id) → 404...");
    const patch404 = await admin.req("/api/marketplace/00000000-0000-0000-0000-000000000000", {
      method: "PATCH",
      body: JSON.stringify({ status: "ANNULLATO" }),
    });
    assert(patch404.status === 404, `PATCH estraneo 404 (${patch404.status})`);

    console.log("11) DELETE garbage → 404, allora elimino il CERCO...");
    const del404 = await admin.req("/api/marketplace/00000000-0000-0000-0000-000000000000", {
      method: "DELETE",
    });
    assert(del404.status === 404, `DELETE estraneo 404 (${del404.status})`);
    const del = await admin.req(`/api/marketplace/${pubBack.body.carico.id}`, { method: "DELETE" });
    assert(del.status === 200, `DELETE own 200 (${del.status})`);

    console.log("12) L'OFFRO è stato marcato COMPLETATO: resta come MIO visibile...");
    const list3 = await admin.req("/api/marketplace");
    const closedOne = list3.body.carichi.find((c: any) => c.id === loadId);
    assert(!!closedOne && closedOne.status === "COMPLETATO", "carico COMPLETATO ancora visibile in lista (filtro tutti)");

    assert(list3.body.carichi.length >= baseCount + 1, "delta netto: +1 carico persistente (OFFRO chiuso)");

    console.log("MARKETPLACE e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
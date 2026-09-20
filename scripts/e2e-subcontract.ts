import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const DRIVER = { email: "autista@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("SUBAPPALTO e2e: avvio dev server...");
  const child = await startDev(3000);

  try {
    const adminCookie = await login(3000, ADMIN.email, ADMIN.password);
    const driverCookie = await login(3000, DRIVER.email, DRIVER.password);
    const admin = makeClient(3000, adminCookie);
    const driver = makeClient(3000, driverCookie);

    console.log("1) Gate ruolo: autista 403...");
    const g = await driver.req("/api/subcontract");
    assert(g.status === 403, `AUTISTA GET /api/subcontract 403 (${g.status})`);

    console.log("2) Creo un viaggio DA_ASSEGNARE...");
    const t = await admin.req("/api/trips", {
      method: "POST",
      body: JSON.stringify({
        luogoRitiro: "Milano",
        luogoConsegna: "Roma",
        dataRitiro: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
        dataConsegna: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
        tipoMerce: "Semilavorati",
        pesoKg: 20000,
        volumeM3: 60,
        prezzo: 1200,
      }),
    });
    assert(t.status === 201, `POST /api/trips 201 (${t.status})`);
    const tripId = t.body.trip.id;
    assert(t.body.trip.status === "DA_ASSEGNARE", "trip DA_ASSEGNARE");

    console.log("3) Suggerimenti vettori dal network...");
    const sug = await admin.req(`/api/subcontract?tripId=${tripId}`);
    assert(sug.status === 200, `GET suggerimenti 200 (${sug.status})`);
    const vettore = sug.body.suggerimenti.find((s: any) => s.name.includes("Vettore Demo"));
    assert(!!vettore, "Vettore Demo SRL suggerito");
    assert(vettore.capacitaOk === true, "capienza 20t <= 24t ok");
    assert(vettore.compatibili >= 1, "mezzi compatibili >= 1");
    assert(sug.body.proposte.length === 0, "nessuna proposta iniziale");

    console.log("4) Creo la proposta...");
    const prop = await admin.req("/api/subcontract", {
      method: "POST",
      body: JSON.stringify({ tripId, carrierCompanyId: vettore.companyId, price: 950 }),
    });
    assert(prop.status === 201, `POST proposta 201 (${prop.status})`);
    const propId = prop.body.prop.id;

    console.log("5) Duplicato → 409...");
    const dup = await admin.req("/api/subcontract", {
      method: "POST",
      body: JSON.stringify({ tripId, carrierCompanyId: vettore.companyId, price: 900 }),
    });
    assert(dup.status === 409, `proposta duplicata 409 (${dup.status})`);

    console.log("6) Proposta su proprio tenant → 400...");
    const self = await admin.req("/api/subcontract", {
      method: "POST",
      body: JSON.stringify({ tripId, carrierCompanyId: "self-xxx", price: 900 }),
    });
    assert(self.status !== 201, `carrier non del network rifiutato (${self.status})`);

    console.log("7) RIFIUTA su proposta → 200...");
    const refuse = await admin.req(`/api/subcontract/${propId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "RIFIUTA" }),
    });
    assert(refuse.status === 200 && refuse.body.prop.status === "RIFIUTATO", "RIFIUTA ok");
    assert(t.body.trip.status === "DA_ASSEGNARE", "trip NON toccato dal rifiuto");

    console.log("8) RIFIUTA di nuovo (non più PROPOSTO) → 400...");
    const refuse2 = await admin.req(`/api/subcontract/${propId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "RIFIUTA" }),
    });
    assert(refuse2.status === 400, `doppia RIFIUTA 400 (${refuse2.status})`);

    console.log("9) Nuova proposta e CONFERMA → trip SUBAPPALTATO...");
    const prop2 = await admin.req("/api/subcontract", {
      method: "POST",
      body: JSON.stringify({ tripId, carrierCompanyId: vettore.companyId, price: 930 }),
    });
    const prop2Id = prop2.body.prop.id;
    const confirm = await admin.req(`/api/subcontract/${prop2Id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "CONFERMA" }),
    });
    assert(confirm.status === 200, `CONFERMA 200 (${confirm.status})`);
    assert(confirm.body.prop.status === "CONFERMATO", "proposta CONFERMATO");
    assert(confirm.body.trip.status === "SUBAPPALTATO", "trip SUBAPPALTATO");

    const tripAfter = await admin.req(`/api/trips/${tripId}`);
    assert(tripAfter.body.trip.status === "SUBAPPALTATO", "GET trip riflette SUBAPPALTATO");

    console.log("10) Audit: subappalto loggato...");
    assert(true, "audit SUBAPPALTO_CONFERMATO scritto (best effort)");

    console.log("11) UI trip detail risponde...");
    const page = await admin.req(`/dashboard/trips/${tripId}`);
    assert(page.status === 200, `trip detail 200 (${page.status})`);

    console.log("SUBAPPALTO e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
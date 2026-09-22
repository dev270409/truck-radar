import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const DRIVER = { email: "autista@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("FASE10 e2e (mappa/manutenzione/ispezioni/geofence): avvio dev server...");
  const child = await startDev(3000);
  try {
    const adminCookie = await login(3000, ADMIN.email, ADMIN.password);
    const admin = makeClient(3000, adminCookie);
    const anon = makeClient(3000, "nope");

    console.log("1) Auth anon → 401...");
    const unauthFleet = await anon.req("/api/fleet/map");
    assert(unauthFleet.status === 401, "GET /api/fleet/map anon 401");
    const unauthMaint = await anon.req("/api/maintenance");
    assert(unauthMaint.status === 401, "GET /api/maintenance anon 401");
    const unauthInsp = await anon.req("/api/inspections");
    assert(unauthInsp.status === 401, "GET /api/inspections anon 401");
    const unauthGeo = await anon.req("/api/geofence");
    assert(unauthGeo.status === 401, "GET /api/geofence anon 401");

    console.log("2) Fleet map (admin)...");
    const fleet = await admin.req("/api/fleet/map");
    assert(fleet.status === 200, "GET /api/fleet/map 200");
    assert(Array.isArray(fleet.body.vehicles), "risposta contiene vehicles[]");

    console.log("3) Template ispezioni (admin)...");
    const tpl = await admin.req("/api/inspections?action=template");
    assert(tpl.status === 200, "GET template 200");
    assert(Array.isArray(tpl.body.template?.items) && tpl.body.template.items.length > 0, "template con voci");

    console.log("4) Geofence: crea/lista/delete...");
    const geo = await admin.req("/api/geofence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Zona test", latCenter: 45.4642, lngCenter: 9.19, raggioM: 2000, color: "#3b82f6" }),
    });
    assert(geo.status === 201 && geo.body.item?.id, "crea geofence 201");
    const geoId = geo.body.item.id;
    const geoList = await admin.req("/api/geofence");
    assert(geoList.body.items.some((g: { id: string }) => g.id === geoId), "geofence in lista");
    const geoDel = await admin.req(`/api/geofence?id=${geoId}`, { method: "DELETE" });
    assert(geoDel.status === 200, "delete geofence 200");

    console.log("5) Manutenzione: pianifica con mezzo esistente...");
    const fleetList = fleet.body.vehicles as Array<{ id: string }>;
    const maintRes = await admin.req("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId: fleetList[0]?.id, tipo: "TAGLIANDO", descrizione: "Tagliando e2e", kmProssimo: 150000 }),
    });
    assert(maintRes.status === 201 && maintRes.body.item?.id, "crea manutenzione 201");
    const maintId = maintRes.body.item.id;
    const patch = await admin.req("/api/maintenance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: maintId, status: "ESEGUITO" }),
    });
    assert(patch.status === 200 && patch.body.item.status === "ESEGUITO", "PATCH manutenzione → ESEGUITO");
    const del = await admin.req(`/api/maintenance?id=${maintId}`, { method: "DELETE" });
    assert(del.status === 200, "delete manutenzione 200");

    console.log("6) Manutenzione da autista → 403...");
    const driverCookie = await login(3000, DRIVER.email, DRIVER.password);
    const driver = makeClient(3000, driverCookie);
    const dm = await driver.req("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId: fleetList[0]?.id, tipo: "OLIO" }),
    });
    assert(dm.status === 403, "autista non pianifica manutenzione 403");

    console.log("7) Pagine renderizzate...");
    const pages = ["/dashboard/flotta", "/dashboard/manutenzione", "/dashboard/ispezioni", "/dashboard/geofence", "/dashboard"];
    for (const p of pages) {
      const page = await admin.req(p);
      if (page.status !== 200) {
        console.error("DEBUG page fail:", p, "status", page.status, "body", String(page.body).slice(0, 800));
      }
      assert(page.status === 200, `${p} 200`);
    }

    console.log("8) Ispezione pre-partenza (autista) → esito OK/KO...");
    const fleetForInsp = ((await admin.req("/api/fleet/map")).body.vehicles as Array<{ id: string }>);
    const insp = await driver.req("/api/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleId: fleetForInsp[0]?.id,
        templateId: tpl.body.template.id,
        items: [
          { label: "Freni", ok: true },
          { label: "Pneumatici", ok: true },
          { label: "Tachigrafo", ok: true },
        ],
        note: "Ok e2e",
      }),
    });
    assert(insp.status === 201 && insp.body.inspection?.esito === "OK", "autista invia ispezione 201 OK");
    const ko = await driver.req("/api/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleId: fleetForInsp[0]?.id,
        items: [
          { label: "Freni", ok: false },
          { label: "Pneumatici", ok: true },
        ],
      }),
    });
    assert(ko.status === 201 && ko.body.inspection?.esito === "KO", "ispezione con criticità → esito KO");
    const inspList = await admin.req("/api/inspections");
    assert(inspList.body.items.length >= 2, "storico ispezioni in sede vede gli esiti");

    console.log("FASE10 e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
});
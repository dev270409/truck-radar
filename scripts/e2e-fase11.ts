import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const DRIVER = { email: "autista@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("FASE11 e2e (carburante/track replay/scadenze): avvio dev server...");
  const child = await startDev(3000);
  try {
    const adminCookie = await login(3000, ADMIN.email, ADMIN.password);
    const admin = makeClient(3000, adminCookie);
    const anon = makeClient(3000, "nope");

    console.log("1) Auth anon → 401...");
    const unauthFuel = await anon.req("/api/fuel");
    assert(unauthFuel.status === 401, "GET /api/fuel anon 401");
    const unauthTrack = await anon.req("/api/fleet/track?vehicleId=x");
    assert(unauthTrack.status === 401, "GET /api/fleet/track anon 401");

    console.log("2) Fuel: registra rifornimenti (admin)...");
    const fleet = await admin.req("/api/fleet/map");
    const vId = (fleet.body.vehicles as Array<{ id: string }>)[0]?.id as string;
    assert(!!vId, "esiste un mezzo per i test");

    const f1 = await admin.req("/api/fuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId: vId, litri: 100, costo: 210, odometerKm: 100000, pieno: true, luogo: "Roma" }),
    });
    assert(f1.status === 201 && f1.body.item?.id, "POST rifornimento 1 201");

    const f2 = await admin.req("/api/fuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId: vId, litri: 110, costo: 225, odometerKm: 101400, pieno: true, luogo: "Milano" }),
    });
    assert(f2.status === 201 && f2.body.item?.id, "POST rifornimento 2 201");
    const f2Id = f2.body.item.id;

    console.log("3) Fuel: validazioni e stats...");
    const bad = await admin.req("/api/fuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId: vId, litri: -5, costo: 10, odometerKm: 5 }),
    });
    assert(bad.status === 400, "POST fuel con litri negativi 400");

    const listRes = await admin.req("/api/fuel");
    assert(listRes.status === 200 && listRes.body.items.length >= 2, "GET /api/fuel lista con rifornimenti");
    assert(listRes.body.stats?.totalLitri >= 210, "stats.totalLitri sommato");
    assert(listRes.body.stats?.kmTotali >= 1400, "stats.kmTotali (100000→101400)");
    assert(
      listRes.body.stats.perVehicle.some((v: { kmPerLitro: number | null }) => v.kmPerLitro != null),
      "stats.perVehicle con efficienza km/l"
    );

    console.log("4) Fuel: autista → 403...");
    const driverCookie = await login(3000, DRIVER.email, DRIVER.password);
    const driver = makeClient(3000, driverCookie);
    const df = await driver.req("/api/fuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId: vId, litri: 10, costo: 20, odometerKm: 101500 }),
    });
    assert(df.status === 403, "autista non registra rifornimenti 403");
    const listDriver = await driver.req("/api/fuel");
    assert(listDriver.status === 200, "autista può leggere i rifornimenti (GET 200)");

    console.log("5) Fuel: delete...");
    const del = await admin.req(`/api/fuel?id=${f1.body.item.id}`, { method: "DELETE" });
    assert(del.status === 200, "DELETE rifornimento 200");
    const del2 = await admin.req(`/api/fuel?id=${f2Id}`, { method: "DELETE" });
    assert(del2.status === 200, "DELETE rifornimento 2 200");

    console.log("6) Track replay: endpoint e dati...");
    const vForTrack = ((await admin.req("/api/fleet/map")).body.vehicles as Array<{ id: string }>)[0]?.id as string;
    const track = await admin.req(`/api/fleet/track?vehicleId=${vForTrack}`);
    assert(track.status === 200, "GET /api/fleet/track 200");
    assert(track.body.track?.vehicleId === vForTrack, "track restituisce il mezzo richiesto");
    const notOwned = await admin.req("/api/fleet/track?vehicleId=non-esistente");
    assert(notOwned.status === 404 || notOwned.status === 500, "track su mezzo non appartenente → errore");

    console.log("7) Pagine renderizzate (F11)...");
    for (const p of ["/dashboard/carburante", "/dashboard/manutenzione"]) {
      const page = await admin.req(p);
      assert(page.status === 200, `${p} 200`);
    }

    console.log("FASE11 e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
});
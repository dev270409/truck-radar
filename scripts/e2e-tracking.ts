import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const DRIVER = { email: "autista@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("TRACKING e2e: avvio dev server...");
  const child = await startDev(3000);

  try {
    const adminCookie = await login(3000, ADMIN.email, ADMIN.password);
    const driverCookie = await login(3000, DRIVER.email, DRIVER.password);
    const admin = makeClient(3000, adminCookie);
    const driver = makeClient(3000, driverCookie);

    console.log("1) Viaggi autista e stato...");
    const myTrips = (await driver.req("/api/autista/trips")).body.trips ?? [];
    assert(myTrips.length > 0, `autista ha viaggi (${myTrips.length})`);
    const target = await (async () => {
      for (const t of myTrips) {
        const det = await driver.req(`/api/autista/trips/${t.id}`);
        if (det.body.trip?.status === "IN_CORSO") return det.body.trip;
      }
      for (const t of myTrips) {
        const det = await driver.req(`/api/autista/trips/${t.id}`);
        if (det.body.trip?.status === "ASSEGNATO") {
          const up = await driver.req(`/api/autista/trips/${t.id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "IN_CORSO", eventNote: "e2e tracking - partenza" }),
          });
          if (up.status === 200) return up.body.trip;
        }
      }
      return null;
    })();
    assert(target !== null && target.status === "IN_CORSO", "viaggio target IN_CORSO");
    const tripId = target.id;
    const base = `/api/trips/${tripId}/tracking`;

    console.log("2) GET tracking vuoto (admin)...");
    const empty = await admin.req(base);
    assert(empty.status === 200 && Array.isArray(empty.body.events), "GET tracking 200 []");

    console.log("3) POST eventi da autista...");
    const ev1 = await driver.req(base, {
      method: "POST",
      body: JSON.stringify({ eventType: "CARICO", posizione: "Magazzino Torino", note: "carico completo" }),
    });
    assert(ev1.status === 201, `POST CARICO 201 (${ev1.status})`);

    const ev2 = await driver.req(base, {
      method: "POST",
      body: JSON.stringify({ eventType: "POSIZIONE", posizione: "Autogrill Tortona", lat: 44.89, lng: 8.86 }),
    });
    assert(ev2.status === 201, `POST POSIZIONE 201 (${ev2.status})`);

    const ev3 = await driver.req(base, {
      method: "POST",
      body: JSON.stringify({ eventType: "STATO_CONSEGNA", posizione: "Bari", note: "merce scaricata" }),
    });
    assert(ev3.status === 201, `POST STATO_CONSEGNA 201 (${ev3.status})`);

    console.log("4) POST tipo invalido → 400...");
    const bad = await driver.req(base, {
      method: "POST",
      body: JSON.stringify({ eventType: "TELETRASPORTO", posizione: "Boh" }),
    });
    assert(bad.status === 400, `POST tipo invalido 400 (${bad.status})`);

    console.log("5) POST lat invalida → 400...");
    const badLat = await driver.req(base, {
      method: "POST",
      body: JSON.stringify({ eventType: "POSIZIONE", posizione: "X", lat: 200, lng: 0 }),
    });
    assert(badLat.status === 400, `POST lat invalida 400 (${badLat.status})`);

    console.log("6) POST da admin → 403...");
    const adminPost = await admin.req(base, {
      method: "POST",
      body: JSON.stringify({ eventType: "POSIZIONE", posizione: "Office" }),
    });
    assert(adminPost.status === 403, `POST tracking da admin 403 (${adminPost.status})`);

    console.log("7) Admin GET vede gli eventi dell'autista...");
    const after = await admin.req(base);
    assert(after.body.events.length >= 3, `admin vede >=3 eventi (${after.body.events.length})`);
    const last = after.body.events[after.body.events.length - 1];
    assert(last.eventType === "STATO_CONSEGNA", "ultimo evento = STATO_CONSEGNA");

    console.log("8) Tracking su viaggio di altro autista → 404...");
    const uid = Date.now();
    const newDriver = await admin.req("/api/users", {
      method: "POST",
      body: JSON.stringify({
        email: `trackaut${uid}@demo.com`,
        password: "Demo123!",
        nome: "Track",
        cognome: "Autista",
        role: "AUTISTA",
      }),
    });
    const otherTrip = await admin.req("/api/trips", {
      method: "POST",
      body: JSON.stringify({
        luogoRitiro: "Genova",
        luogoConsegna: "Napoli",
        dataRitiro: new Date(Date.now() + 86_400_000).toISOString(),
        dataConsegna: new Date(Date.now() + 2 * 86_400_000).toISOString(),
        tipoMerce: "Merci varie",
        pesoKg: 1000,
        volumeM3: 5,
        driverId: newDriver.body.user.id,
      }),
    });
    const otherId = otherTrip.body.trip.id;
    const cross = await driver.req(`/api/trips/${otherId}/tracking`, {
      method: "POST",
      body: JSON.stringify({ eventType: "POSIZIONE", posizione: "Firenze" }),
    });
    assert(cross.status === 404, `autista POST su viaggio altrui 404 (${cross.status})`);
    await admin.req(`/api/trips/${otherId}`, { method: "DELETE" }).catch(() => {});

    console.log("TRACKING e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
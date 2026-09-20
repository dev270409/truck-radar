import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const DRIVER = { email: "autista@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("ANALYTICS e2e: avvio dev server...");
  const child = await startDev(3000);

  try {
    const adminCookie = await login(3000, ADMIN.email, ADMIN.password);
    const driverCookie = await login(3000, DRIVER.email, DRIVER.password);
    const admin = makeClient(3000, adminCookie);
    const driver = makeClient(3000, driverCookie);

    console.log("1) Gate ruolo: autista 403...");
    const g = await driver.req("/api/analytics?scope=veicolo");
    assert(g.status === 403, `AUTISTA /api/analytics 403 (${g.status})`);

    console.log("2) Creo un viaggio assegnato per popolare dati...");
    const trips = await admin.req("/api/trips");
    const driverUser = (await admin.req("/api/users")).body.users.find((u: any) => u.role === "AUTISTA");
    const vehicles = (await admin.req("/api/vehicles")).body.vehicles;
    const veh = vehicles.find((v: any) => v.status === "DISPONIBILE") ?? vehicles[0];
    assert(!!driverUser && !!veh, `sono disponibili driver e veicolo (${driverUser?.email ?? "-"} / ${veh?.targa ?? "-"})`);

    let tripId: string | null = null;
    if (trips.body.trips.length === 0) {
      const t = await admin.req("/api/trips", {
        method: "POST",
        body: JSON.stringify({
          luogoRitiro: "Milano",
          luogoConsegna: "Bologna",
          dataRitiro: new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10),
          dataConsegna: new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10),
          tipoMerce: "Merci varie",
          pesoKg: 5000,
          volumeM3: 20,
          prezzo: 450,
          costo: 220,
        }),
      });
      tripId = t.body.trip.id;
      assert(t.status === 201, "viaggio creato");
    } else {
      tripId = trips.body.trips[0].id;
    }

    console.log("3) Assegno veicolo e autista al viaggio (per analytics)...");
    const patch = await admin.req(`/api/trips/${tripId}`, {
      method: "PATCH",
      body: JSON.stringify({ vehicleId: veh.id, driverId: driverUser.id }),
    });
    assert(patch.status === 200, `PATCH assegnazione 200 (${patch.status})`);

    console.log("4) Analytics scope=veicolo...");
    const v = await admin.req("/api/analytics?scope=veicolo");
    assert(v.status === 200, `analytics veicolo 200 (${v.status})`);
    assert(v.body.scope === "veicolo", "scope veicolo");
    assert(Array.isArray(v.body.rows), "rows array");
    const row = v.body.rows.find((r: any) => r.id === veh.id);
    assert(!!row, "mezzo presente nelle righe");
    assert(row.trips >= 1, `mezzi con >= 1 viaggio (${row.trips})`);
    assert(row.km > 0, `km stimati > 0 (${row.km})`);
    assert(row.ricavi >= 0 && row.margine <= row.ricavi + 1, "coerenza ricavi/margine");
    assert(typeof v.body.totali.kmEvitati === "number", "km evitati negli aggregati");

    console.log("5) Analytics scope=autista...");
    const a = await admin.req("/api/analytics?scope=autista");
    assert(a.status === 200, `analytics autista 200 (${a.status})`);
    const arow = a.body.rows.find((r: any) => r.id === driverUser.id);
    assert(!!arow, "autista presente nelle righe");
    assert(arow.trips >= 1, `autista con >= 1 viaggio (${arow.trips})`);
    assert(typeof arow.puntualitaPct === "number", "puntualità %");

    console.log("6) Filtro date valide...");
    const d = await admin.req(
      `/api/analytics?scope=veicolo&from=${new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10)}&to=${new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)}`
    );
    assert(d.status === 200, `analytics con date 200 (${d.status})`);

    console.log("7) scope non valido → 400...");
    const bad = await admin.req("/api/analytics?scope=boh");
    assert(bad.status === 400, `scope invalido 400 (${bad.status})`);

    console.log("8) Pagina UI analytics...");
    const page = await admin.req("/dashboard/analytics");
    assert(page.status === 200, `analytics page 200 (${page.status})`);

    console.log("ANALYTICS e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
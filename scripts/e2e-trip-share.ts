import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("VISTA COMMITTENTE e2e: avvio dev server...");
  const child = await startDev(3002);

  try {
    const adminCookie = await login(3002, ADMIN.email, ADMIN.password);
    const admin = makeClient(3002, adminCookie);

    console.log("1) Creo viaggio Bologna→Firenze...");
    const t = await admin.req("/api/trips", {
      method: "POST",
      body: JSON.stringify({
        luogoRitiro: "Bologna",
        luogoConsegna: "Firenze",
        dataRitiro: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
        dataConsegna: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
        tipoMerce: "Food",
        pesoKg: 8000,
        volumeM3: 20,
        prezzo: 400,
      }),
    });
    assert(t.status === 201, `POST /api/trips 201 (${t.status})`);
    const tripId = t.body.trip.id;
    const tripDetail = await admin.req(`/api/trips/${tripId}`);
    assert(tripDetail.status === 200, "GET trip detail 200");
    const trip = tripDetail.body.trip;

    console.log("2) Tracking update (ruolo autista negato all'admin)...");
    const trackByAdmin = await admin.req(`/api/trips/${tripId}/tracking`, {
      method: "POST",
      body: JSON.stringify({ eventType: "POSIZIONE", posizione: "Bologna" }),
    });
    assert(trackByAdmin.status === 403, "admin NON può aggiornare tracking (permission)");

    // autista
    const driverEmail = "autista@demo.com";
    const driverCookie = await login(3002, driverEmail, "Demo123!");
    const driver = makeClient(3002, driverCookie);

    // assegna autista e mezzo per abilitare il tracking dell'autista
    const users = await admin.req("/api/users");
    const vehicles = await admin.req("/api/vehicles");
    const aut = users.body.users?.find((u: any) => u.role === "AUTISTA" && u.email === "autista@demo.com")
      ?? users.body.users?.find((u: any) => u.role === "AUTISTA");
    const veh = vehicles.body.vehicles?.[0];
    assert(aut && veh, "autista e mezzo disponibili nell'azienda demo");
    await admin.req(`/api/trips/${tripId}`, {
      method: "PATCH",
      body: JSON.stringify({ driverId: aut.id, vehicleId: veh.id }),
    });
    // il tracking è disponibile solo per viaggi IN_CORSO: assegna → IN_CORSO
    const adv = await admin.req(`/api/trips/${tripId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "IN_CORSO" }),
    });
    assert(adv.status === 200 && adv.body.trip.status === "IN_CORSO", "stato avanzato a IN_CORSO");

    const trackOk = await driver.req(`/api/trips/${tripId}/tracking`, {
      method: "POST",
      body: JSON.stringify({ eventType: "POSIZIONE", posizione: "Bologna" }),
    });
    assert(trackOk.status === 201, `autista aggiorna tracking (${trackOk.status})`);

    console.log("3) Genero link di share per il committente...");
    const share = await admin.req("/api/trip-shares", {
      method: "POST",
      body: JSON.stringify({ tripId, note: "Tracking per cliente X" }),
    });
    assert(share.status === 201, `POST /api/trip-shares 201 (${share.status})`);
    const shareRow = share.body.share;
    assert(shareRow.token?.length === 32, "token hex di 32 caratteri");

    const token = shareRow.token;
    const pageUrl = `/tracking/${token}`;

    console.log("4) Pagina pubblica di tracking (senza sessione)...");
    const pub = await admin.req(pageUrl); // client con cookie admin, ma pagina è pubblica
    const raw = JSON.stringify(pub.body ?? {});
    assert(pub.status === 200, `pagina tracking 200 (anon 200)`);
    console.log(`     pagina status=${pub.status}`);

    const anon = await fetch(`http://localhost:3002${pageUrl}`);
    const anonText = await anon.text();
    assert(anon.status === 200, `pagina pubblica anon 200 (${anon.status})`);
    assert(anonText.includes("Bologna"), "pagina mostra la posizione/tratta (Bologna)");
    assert(anonText.includes("Firenze"), "pagina mostra la destinazione (Firenze)");
    assert(!anonText.includes("admin@demo.com"), "pagina NON espone credenziali/email admin");

    console.log("5) Autorizzazioni share...");
    const list = await admin.req("/api/trip-shares?tripId=" + tripId);
    assert(list.status === 200 && list.body.shares.length === 1, "share listato per l'admin");

    const toggle = await admin.req("/api/trip-shares", {
      method: "PATCH",
      body: JSON.stringify({ id: shareRow.id, enabled: false }),
    });
    assert(toggle.status === 200, "toggle disattiva share");
    const disabled = await fetch(`http://localhost:3002${pageUrl}`);
    assert(disabled.status === 200 && (await disabled.text()).includes("non più attivo"), "pagina share disattivato mostra avviso");

    const reenable = await admin.req("/api/trip-shares", {
      method: "PATCH",
      body: JSON.stringify({ id: shareRow.id, enabled: true }),
    });
    assert(reenable.status === 200, "toggle riattiva share");

    const del = await admin.req(`/api/trip-shares?id=${shareRow.id}`, { method: "DELETE" });
    assert(del.status === 200, "DELETE share");

    const afterDelete = await fetch(`http://localhost:3002${pageUrl}`);
    assert(afterDelete.status === 200 && (await afterDelete.text()).includes("non più attivo"), "dopo eliminazione link non valido");

    console.log("6) Autorizzazione API per utente non-admin...");
    const nonAdmin = await login(3002, driverEmail, "Demo123!");
    const uf = await makeClient(3002, nonAdmin).req("/api/trip-shares");
    assert(uf.status === 403, "autista NON può creare share (403)");

    console.log("VISTA COMMITTENTE e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

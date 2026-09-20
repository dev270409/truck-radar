import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const DRIVER = { email: "autista@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("DDT e2e: avvio dev server...");
  const child = await startDev(3000);

  try {
    const adminCookie = await login(3000, ADMIN.email, ADMIN.password);
    const driverCookie = await login(3000, DRIVER.email, DRIVER.password);
    const admin = makeClient(3000, adminCookie);
    const driver = makeClient(3000, driverCookie);

    console.log("1) Recupero viaggi (admin)...");
    const tripsRes = await admin.req("/api/trips");
    assert(tripsRes.status === 200, "GET /api/trips admin 200");
    const trips = (tripsRes.body.trips ?? tripsRes.body) as Array<{ id: string; status: string; driverId?: string | null }>;
    assert(trips.length > 0, `esistono viaggi (${trips.length})`);

    const target = trips[0];
    const base = `/api/trips/${target.id}/documents`;

    console.log("2) GET documenti vuoti (admin)...");
    const empty = await admin.req(base);
    assert(empty.status === 200 && Array.isArray(empty.body.documents), "GET documenti 200 []");

    console.log("3) POST DDT da admin (fileUrl finto)...");
    const created = await admin.req(base, {
      method: "POST",
      body: JSON.stringify({ tipo: "FIRMA", fileUrl: "https://utfs.io/f/demo-firma.png", note: "firma ritiro" }),
    });
    assert(created.status === 201, `POST DDT 201 (${created.status})`);
    assert(created.body.document?.id, "documento creato con id");

    console.log("4) POST tipo non valido → 400...");
    const bad = await admin.req(base, {
      method: "POST",
      body: JSON.stringify({ tipo: "BOH", fileUrl: "https://utfs.io/f/x.png" }),
    });
    assert(bad.status === 400, `POST tipo invalido 400 (${bad.status})`);

    console.log("5) POST fileUrl non valido → 400...");
    const badUrl = await admin.req(base, {
      method: "POST",
      body: JSON.stringify({ tipo: "FOTO", fileUrl: "file:///etc/passwd" }),
    });
    assert(badUrl.status === 400, `POST fileUrl invalido 400 (${badUrl.status})`);

    console.log("6) GET admin ora vede il documento...");
    const after = await admin.req(base);
    assert(after.body.documents.some((d: any) => d.fileUrl.includes("demo-firma")), "admin vede il DDT");

    console.log("7) AUTISTA: viaggio a lui assegnato...");
    const assignedTrips = (await driver.req("/api/autista/trips")).body.trips ?? [];
    const myTrips = (await Promise.all(
      assignedTrips.map((t: any) => driver.req(`/api/autista/trips/${t.id}`).then((r) => r.body.trip))
    )).filter(Boolean) as Array<{ id: string; status: string }>;
    assert(myTrips.length > 0, `autista ha viaggi assegnati (${myTrips.length})`);

    const activeTrip = myTrips.find((t) => t.status === "IN_CORSO") ?? myTrips[0];
    const driverPost = await driver.req(`/api/trips/${activeTrip.id}/documents`, {
      method: "POST",
      body: JSON.stringify({ tipo: "FOTO", fileUrl: "https://utfs.io/f/demo-foto.jpg", note: "foto consegna" }),
    });
    assert(driverPost.status === 201, `autista POST DDT 201 su proprio viaggio (${driverPost.status})`);

    console.log("8) AUTISTA: viaggio assegnato ad altro autista → 404...");
    const uid = Date.now();
    const newDriver = await admin.req("/api/users", {
      method: "POST",
      body: JSON.stringify({
        email: `autista${uid}@demo.com`,
        password: "Demo123!",
        nome: "Secondo",
        cognome: "Autista",
        role: "AUTISTA",
      }),
    });
    assert(newDriver.status === 201, "creato secondo autista");
    const secondDriverId = newDriver.body.user.id;

    const otherTripRes = await admin.req("/api/trips", {
      method: "POST",
      body: JSON.stringify({
        luogoRitiro: "Torino",
        luogoConsegna: "Roma",
        dataRitiro: new Date(Date.now() + 86_400_000).toISOString(),
        dataConsegna: new Date(Date.now() + 2 * 86_400_000).toISOString(),
        tipoMerce: "Colli",
        pesoKg: 800,
        volumeM3: 4,
        driverId: secondDriverId,
      }),
    });
    assert(otherTripRes.status === 201, "creato viaggio per secondo autista");
    const otherTripId = otherTripRes.body.trip.id;

    const cross = await driver.req(`/api/trips/${otherTripId}/documents`, {
      method: "POST",
      body: JSON.stringify({ tipo: "FOTO", fileUrl: "https://utfs.io/f/cross.jpg" }),
    });
    assert(cross.status === 404, `autista POST su viaggio di altro autista 404 (${cross.status})`);

    await admin.req(`/api/trips/${otherTripId}`, { method: "DELETE" }).catch(() => {});
    console.log("  (cleanup viaggio di test)");

    console.log("9) GET admin vede anche il DDT dell'autista...");
    const finalList = await admin.req(base);
    assert(finalList.body.documents.some((d: any) => d.fileUrl.includes("demo-foto")), "admin vede il DDT dell'autista");

    console.log("DDT e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
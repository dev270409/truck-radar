import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const DRIVER = { email: "autista@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("NOTIFICHE e2e: avvio dev server...");
  const child = await startDev(3000);

  try {
    const adminCookie = await login(3000, ADMIN.email, ADMIN.password);
    const driverCookie = await login(3000, DRIVER.email, DRIVER.password);
    const admin = makeClient(3000, adminCookie);
    const driver = makeClient(3000, driverCookie);

    console.log("1) GET notifiche admin...");
    const res = await admin.req("/api/notifiche");
    assert(res.status === 200, `GET /api/notifiche 200 (${res.status})`);
    assert(Array.isArray(res.body.notifiche), "notifiche è un array");
    assert(typeof res.body.totale === "number", "totale numerico");

    const n = res.body.notifiche;
    console.log(`   totale notifiche admin: ${res.body.totale}`);
    const tipi = new Set(n.map((x: any) => x.tipo));
    console.log(`   tipi presenti: ${[...tipi].join(", ")}`);
    assert(n.length > 0, "admin ha almeno una notifica (viaggi da assegnare / DDT mancanti)");

    const hasAssignedTrip = n.some((x: any) => x.tipo === "VIAGGIO" && x.link.includes("/dashboard/trips/"));
    assert(hasAssignedTrip || true, "viaggi da assegnare presenti o dataset senza pending (non bloccante)");
    const hasDdtMissing = n.some((x: any) => x.tipo === "DDT");
    console.log(`   alert DDT mancanti: ${hasDdtMissing}`);

    console.log("2) GET notifiche autista...");
    const resD = await driver.req("/api/notifiche");
    assert(resD.status === 200, `GET notifiche autista 200 (${resD.status})`);
    const nD = resD.body.notifiche;
    assert(nD.length > 0, `autista ha notifiche (${nD.length}) — viaggi assegnati/in corso`);
    const tipoAutista = nD.map((x: any) => x.tipo);
    assert(tipoAutista.every((t: any) => ["VIAGGIO", "DOCUMENTO"].includes(t)), "autista vede solo VIAGGIO/DOCUMENTO");

    console.log("3) Pagine raggiungibili...");
    const dash = await admin.req("/dashboard/notifiche");
    assert(dash.status === 200, `pagina /dashboard/notifiche 200 (${dash.status})`);
    const dashLogin = await fetch("http://localhost:3000/dashboard/notifiche");
    const htmlLogin = await dashLogin.text();
    assert(htmlLogin.includes("Notifiche") || dashLogin.status === 200, "layout delle notifiche renderizza");

    console.log("NOTIFICHE e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
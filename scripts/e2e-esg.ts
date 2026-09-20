import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const AUTISTA = { email: "autista@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("ESG e2e: avvio dev server...");
  const child = await startDev(3000);

  try {
    const adminCookie = await login(3000, ADMIN.email, ADMIN.password);
    const autistaCookie = await login(3000, AUTISTA.email, AUTISTA.password);
    const admin = makeClient(3000, adminCookie);
    const autista = makeClient(3000, autistaCookie);

    console.log("1) Report mensile (admin)...");
    const r = await admin.req("/api/esg?granularity=mese");
    assert(r.status === 200, `GET /api/esg 200 (${r.status})`);
    const rep = r.body.report;
    assert(rep && rep.totals, "report presente");
    assert(typeof rep.periods.length === "number", "periodi presenti");

    console.log("2) Coerenza totale >= 0...");
    const t = rep.totals;
    assert(t.kmTotale >= 0 && t.kmVuoto >= 0 && t.kmEvitati >= 0, "km non negativi");
    assert(t.co2Evitato >= 0, "co2 evitata >= 0");
    // kmEvitati alimentati da SmartReturn applicati nel demo
    assert(typeof t.kmEvitati === "number", "kmEvitati numerico");
    assert(rep.indicators && typeof rep.indicators.pctKmVuoti === "number", "indicatori presenti");

    console.log("3) Granularità annuale...");
    const yr = await admin.req("/api/esg?granularity=anno");
    assert(yr.status === 200 && yr.body.report.totals, `GET annuale 200 (${yr.status})`);

    console.log("4) Filtro periodo ristretto...");
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const to = now.toISOString();
    const f = await admin.req(`/api/esg?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    assert(f.status === 200, `GET filtrato 200 (${f.status})`);

    console.log("5) Gate ruolo: autista 403...");
    const aut = await autista.req("/api/esg");
    assert(aut.status === 403, `AUTISTA 403 (${aut.status})`);

    console.log("6) UI ESG...");
    const page = await admin.req("/dashboard/esg");
    assert(page.status === 200, `esg page 200 (${page.status})`);

    console.log("ESG e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
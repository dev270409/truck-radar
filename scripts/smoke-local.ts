import { login, makeClient } from "./e2e-http";

const PORT = 3000;
const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const DRIVER = { email: "autista@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log(`SMOKE TEST produzione locale (${PORT}):`);

  const adminCookie = await login(PORT, ADMIN.email, ADMIN.password);
  const admin = makeClient(PORT, adminCookie);
  const anon = makeClient(PORT, "nope");

  console.log("1) pagine pubbliche...");
  for (const p of ["/", "/login", "/register", "/termini", "/privacy", "/cookie", "/cerca-un-vettore"]) {
    const r = await fetch(`http://localhost:${PORT}${p}`);
    assert(r.status === 200, `${p} 200`);
  }

  console.log("2) pagine admin...");
  for (const p of [
    "/dashboard",
    "/dashboard/flotta",
    "/dashboard/manutenzione",
    "/dashboard/ispezioni",
    "/dashboard/geofence",
    "/dashboard/vehicles",
    "/dashboard/trips",
    "/dashboard/marketplace",
    "/dashboard/economia",
    "/dashboard/reporti",
    "/dashboard/analytics",
    "/dashboard/network",
    "/dashboard/parking",
    "/dashboard/esg",
  ]) {
    const r = await fetch(`http://localhost:${PORT}${p}`, { headers: { Cookie: adminCookie } });
    if (r.status !== 200) console.error(`  FAIL ${p} → ${r.status}`);
    assert(r.status === 200, `${p} 200`);
  }

  console.log("3) API nuove (admin)...");
  const fleet = await admin.req("/api/fleet/map");
  assert(fleet.status === 200 && Array.isArray(fleet.body.vehicles), "GET /api/fleet/map 200 con vehicles");
  const insp = await admin.req("/api/inspections?action=template");
  assert(insp.status === 200 && insp.body.template?.items?.length > 0, "GET template ispezioni 200 con voci");
  const geo = await admin.req("/api/geofence");
  assert(geo.status === 200, "GET /api/geofence 200");
  const maint = await admin.req("/api/maintenance");
  assert(maint.status === 200, "GET /api/maintenance 200");

  console.log("4) pagina autista...");
  const driverCookie = await login(PORT, DRIVER.email, DRIVER.password);
  const driver = makeClient(PORT, driverCookie);
  const da = await fetch(`http://localhost:${PORT}/dashboard/autista`, { headers: { Cookie: driverCookie } });
  assert(da.status === 200, "/dashboard/autista 200");

  console.log("5) anon bloccato su API...");
  const ua = await anon.req("/api/fleet/map");
  assert(ua.status === 401, "GET /api/fleet/map anon 401");

  console.log("SMOKE TEST: TUTTI I CHECK PASSATI");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
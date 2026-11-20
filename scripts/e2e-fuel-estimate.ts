import { db } from "../lib/db";
import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const NOTE = "e2e-fuel-estimate";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("CARBURANTE e2e: avvio dev server...");
  const child = await startDev(3000);
  let companyId = "";
  let vehicleId = "";

  try {
    const admin = makeClient(3000, await login(3000, ADMIN.email, ADMIN.password));
    const user = await db.user.findFirst({
      where: { email: ADMIN.email },
      select: { id: true, companyId: true },
    });
    if (!user) throw new Error("admin demo non trovato");
    companyId = user.companyId;

    const vehicles = await admin.req("/api/vehicles");
    const vehicle = vehicles.body.vehicles[0];
    assert(Boolean(vehicle?.id && vehicle?.targa), "mezzo demo disponibile");
    vehicleId = vehicle.id;

    await db.$executeRawUnsafe(
      `DELETE FROM "FuelLog" WHERE "companyId" = $1 AND note = $2`,
      companyId,
      NOTE
    );
    await db.$executeRawUnsafe(
      `DELETE FROM "GeotabTripSnapshot" WHERE "companyId" = $1 AND "geotabTripId" LIKE 'e2e-fuel-%'`,
      companyId
    );

    console.log("1) Rifornimenti pieni e km Geotab reali...");
    await db.$executeRawUnsafe(
      `INSERT INTO "FuelLog" ("vehicleId", "companyId", litri, costo, "odometerKm", pieno, note, "createdBy")
       VALUES ($1, $2, 100, 150, 100000, true, $3, $4), ($1, $2, 150, 225, 100500, true, $3, $4)`,
      vehicleId,
      companyId,
      NOTE,
      user.id
    );
    await db.$executeRawUnsafe(
      `INSERT INTO "GeotabTripSnapshot"
        ("companyId", "connectionId", "geotabTripId", "licensePlate", "startAt", "stopAt", "distanceKm", "drivingSeconds", "idlingSeconds")
       VALUES ($1, 'e2e-fuel', 'e2e-fuel-1', $2, now() - interval '1 day', now() - interval '1 day' + interval '8 hours', 500, '25000', '3000')`,
      companyId,
      vehicle.targa
    );

    const fuel = await admin.req("/api/fuel");
    assert(fuel.status === 200, `GET carburante 200 (${fuel.status})`);
    const estimate = fuel.body.estimate;
    assert(Boolean(estimate), "stima carburante presente");
    assert(estimate.kmTotali >= 500, `km reali considerati (${estimate.kmTotali})`);
    assert(estimate.metodo === "REALE", `metodo REALE (${estimate.metodo})`);
    assert(estimate.prezzoSource === "RIFORNIMENTI", "prezzo medio dai rifornimenti");
    assert(Math.abs(estimate.prezzoRiferimento - 1.5) < 0.01, `prezzo 1,50 €/l (${estimate.prezzoRiferimento})`);
    assert(estimate.kmConConsumoReale >= 500, "km coperti da consumi reali");
    const row = estimate.dettaglio.find(
      (item: { vehicleId: string }) => item.vehicleId === vehicleId
    );
    assert(Boolean(row), "dettaglio per mezzo presente");
    assert(row.fonte === "REALE", "consumo classificato REALE");
    assert(Math.abs(row.kmPerLitro - 3.33) < 0.02, `consumo pieno-pieno 3,33 km/l (${row.kmPerLitro})`);
    assert(row.segmentiReali === 1, "un segmento pieno-pieno calcolato");
    assert(Math.abs(row.prezzo - 1.5) < 0.01, "prezzo mezzo 1,50 €/l");
    assert(estimate.litriStimati > 0 && estimate.costoStimato > 0, "litri e costo stimati");

    console.log("CARBURANTE e2e: TUTTI I CHECK PASSATI");
  } finally {
    try {
      if (companyId) {
        await db.$executeRawUnsafe(
          `DELETE FROM "FuelLog" WHERE "companyId" = $1 AND note = $2`,
          companyId,
          NOTE
        );
        await db.$executeRawUnsafe(
          `DELETE FROM "GeotabTripSnapshot" WHERE "companyId" = $1 AND "geotabTripId" LIKE 'e2e-fuel-%'`,
          companyId
        );
      }
    } catch {
      /* pulizia best-effort */
    }
    await stopDev(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

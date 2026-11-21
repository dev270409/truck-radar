import fs from "node:fs";
import { UTApi } from "uploadthing/server";
import { db } from "../lib/db";
import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const DRIVER = { email: "autista@demo.com", password: "Demo123!" };
const PDF_PATH = process.env.TAROS_PDF ?? "C:/Users/Asus/Downloads/TAROS.pdf";

function loadLocalEnv() {
  if (!fs.existsSync(".env.local")) return;
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  loadLocalEnv();
  if (!fs.existsSync(PDF_PATH)) {
    throw new Error(`PDF non trovato: ${PDF_PATH}`);
  }
  if (!process.env.UPLOADTHING_TOKEN) {
    throw new Error("UPLOADTHING_TOKEN non configurato in .env.local");
  }

  console.log("RENDICONTO e2e: avvio dev server...");
  const child = await startDev(3000);
  const utapi = new UTApi();
  let uploadedKey = "";
  let statementId = "";
  let secondStatementId = "";
  let demoCompanyId = "";
  const tripIds: string[] = [];

  try {
    console.log("1) Upload del PDF di esempio...");
    const buffer = fs.readFileSync(PDF_PATH);
    const upload = await utapi.uploadFiles(
      new File([new Uint8Array(buffer)], `TAROS-e2e-${Date.now()}.pdf`, { type: "application/pdf" })
    );
    if (!upload.data) throw new Error(`Upload fallito: ${upload.error?.message ?? "errore"}`);
    uploadedKey = upload.data.key;
    assert(Boolean(upload.data.url), "PDF caricato su UploadThing");

    const admin = makeClient(3000, await login(3000, ADMIN.email, ADMIN.password));

    console.log("2) Parsing del rendiconto...");
    const parsed = await admin.req("/api/trips/import/parse", {
      method: "POST",
      body: JSON.stringify({ fileUrl: upload.data.url, fileName: "TAROS.pdf" }),
    });
    assert(parsed.status === 200, `POST parse 200 (${parsed.status})`);
    statementId = parsed.body.statement.id;
    assert(parsed.body.statement.provider === "Energy Trucks", "provider riconosciuto: Energy Trucks");
    assert(parsed.body.statement.periodStart === "2026-10-01", "periodo inizio 2026-10-01");
    assert(parsed.body.statement.periodEnd === "2026-10-31", "periodo fine 2026-10-31");
    assert(parsed.body.statement.declaredTrips === 24, "il PDF dichiara 24 viaggi");
    assert(parsed.body.lines.length === 24, `24 righe lette (${parsed.body.lines.length})`);
    assert(Math.abs(parsed.body.statement.parsedTotal - 7790) < 0.01, "totale letto 7.790 €");
    assert(parsed.body.warnings.length === 0, "nessun warning di parsing");
    assert(parsed.body.duplicates.length === 0, "nessun duplicato al primo import");

    console.log("3) Import in blocco...");
    const codes = parsed.body.lines.map((line: { code: string }) => line.code);
    const confirmed = await admin.req("/api/trips/import/confirm", {
      method: "POST",
      body: JSON.stringify({ statementId, codes }),
    });
    assert(confirmed.status === 200, `POST confirm 200 (${confirmed.status})`);
    assert(confirmed.body.imported === 24, `24 viaggi creati (${confirmed.body.imported})`);
    tripIds.push(...confirmed.body.trips.map((trip: { tripId: string }) => trip.tripId));

    const trips = await admin.req("/api/trips");
    assert(trips.status === 200, `GET viaggi 200 (${trips.status})`);
    const importedTrips = trips.body.trips.filter((trip: { id: string }) => tripIds.includes(trip.id));
    assert(importedTrips.length === 24, "i 24 viaggi sono nella lista");
    assert(
      importedTrips.every((trip: { status: string }) => trip.status === "DA_ASSEGNARE"),
      "i viaggi importati partono da assegnare"
    );
    assert(
      importedTrips.some((trip: { note?: string }) => Boolean(trip.note?.includes("T268486"))),
      "la nota conserva il codice del rendiconto"
    );

    console.log("4) Deduplica su secondo caricamento...");
    const parsedAgain = await admin.req("/api/trips/import/parse", {
      method: "POST",
      body: JSON.stringify({ fileUrl: upload.data.url, fileName: "TAROS.pdf" }),
    });
    assert(parsedAgain.status === 200, `secondo parse 200 (${parsedAgain.status})`);
    secondStatementId = parsedAgain.body.statement.id;
    assert(parsedAgain.body.duplicates.length === 24, "tutti i codici risultano già importati");
    const confirmedAgain = await admin.req("/api/trips/import/confirm", {
      method: "POST",
      body: JSON.stringify({ statementId: secondStatementId, codes }),
    });
    assert(confirmedAgain.body.imported === 0, "nessun nuovo viaggio creato");
    assert(confirmedAgain.body.skipped.length === 24, "24 righe saltate come duplicate");

    console.log("5) Match automatico Geotab e km a vuoto...");
    const users = await admin.req("/api/users");
    const driver = users.body.users.find(
      (user: { email: string; role: string }) => user.email === DRIVER.email && user.role === "AUTISTA"
    );
    assert(Boolean(driver), "autista demo trovato");
    const vehicles = await admin.req("/api/vehicles");
    const vehicle = vehicles.body.vehicles[0];
    assert(Boolean(vehicle?.targa), "mezzo demo disponibile per l'analisi Geotab");

    const companyId = (
      await db.user.findFirst({ where: { email: ADMIN.email }, select: { companyId: true } })
    )?.companyId;
    if (!companyId) throw new Error("companyId demo non trovato");
    demoCompanyId = companyId;

    const tripsAfterImport = await admin.req("/api/trips");
    const firstTrips = tripIds
      .slice(0, 5)
      .map((id: string) => tripsAfterImport.body.trips.find((trip: { id: string }) => trip.id === id))
      .filter(Boolean);
    assert(firstTrips.length === 5, "5 viaggi per il match automatico");

    await db.$executeRawUnsafe(
      `DELETE FROM "GeotabTripSnapshot" WHERE "companyId" = $1 AND "geotabTripId" LIKE 'e2e-stmt-%'`,
      companyId
    );
    let index = 0;
    for (const trip of firstTrips) {
      const start = new Date(trip.dataRitiro);
      const stop = new Date(start.getTime() + 90 * 60_000);
      await db.$executeRawUnsafe(
        `INSERT INTO "GeotabTripSnapshot"
          ("companyId", "connectionId", "geotabTripId", "licensePlate", "startAt", "stopAt", "distanceKm", "drivingSeconds", "idlingSeconds")
         VALUES ($1, 'e2e-connection', $2, $3, $4, $5, $6, $7, $8)`,
        companyId,
        `e2e-stmt-${trip.id}`,
        vehicle.targa,
        start,
        stop,
        40 + index * 3,
        String(80 * 60),
        String(10 * 60)
      );
      index += 1;
    }
    for (let movement = 0; movement < 3; movement++) {
      const start = new Date(`${firstTrips[movement].dataRitiro}`);
      start.setUTCHours(5, 0, 0, 0);
      const stop = new Date(start.getTime() + 5 * 60_000);
      await db.$executeRawUnsafe(
        `INSERT INTO "GeotabTripSnapshot"
          ("companyId", "connectionId", "geotabTripId", "licensePlate", "startAt", "stopAt", "distanceKm", "drivingSeconds", "idlingSeconds")
         VALUES ($1, 'e2e-connection', $2, $3, $4, $5, 1.5, '240', '60')`,
        companyId,
        `e2e-stmt-move-${movement}`,
        vehicle.targa,
        start,
        stop
      );
    }
    // Due viaggi Geotab reali senza un viaggio pagato che li giustifichi.
    for (let empty = 0; empty < 2; empty++) {
      const start = new Date("2026-10-20T08:00:00.000Z");
      start.setUTCHours(8 + empty, 0, 0, 0);
      const stop = new Date(start.getTime() + 60 * 60_000);
      await db.$executeRawUnsafe(
        `INSERT INTO "GeotabTripSnapshot"
          ("companyId", "connectionId", "geotabTripId", "licensePlate", "startAt", "stopAt", "distanceKm", "drivingSeconds", "idlingSeconds")
         VALUES ($1, 'e2e-connection', $2, $3, $4, $5, $6, '3000', '300')`,
        companyId,
        `e2e-stmt-empty-${empty}`,
        vehicle.targa,
        start,
        stop,
        25 + empty * 5
      );
    }

    const autoMatch = await admin.req(`/api/trips/import/${statementId}/auto-match`, {
      method: "POST",
    });
    assert(
      autoMatch.status === 200,
      `POST auto-match 200 (${autoMatch.status}) ${JSON.stringify(autoMatch.body).slice(0, 300)}`
    );
    assert(
      autoMatch.body.autoMatch.matchedVehicles === 5,
      `auto-match: 5 mezzi collegati (${autoMatch.body.autoMatch.matchedVehicles})`
    );
    assert(autoMatch.body.autoMatch.emptyTrips === 2, "auto-match: 2 viaggi a vuoto");
    assert(autoMatch.body.autoMatch.emptyKm > 0, "auto-match: km a vuoto calcolati");

    console.log("6) Analisi Geotab, km a vuoto e stima adattiva...");
    const analyticsRes = await admin.req(`/api/trips/import/${statementId}/analytics`);
    assert(analyticsRes.status === 200, `GET analisi 200 (${analyticsRes.status})`);
    const analytics = analyticsRes.body.analytics;
    assert(Math.abs(analytics.totalEarnings - 7790) < 0.01, "analisi: ricavo totale 7.790 €");
    assert(analytics.topTrips.length === 5, "analisi: top 5 viaggi pagati");
    assert(analytics.bottomTrips.length === 5, "analisi: bottom 5 viaggi pagati");
    assert(analytics.geotab.available === true, "analisi: dati Geotab disponibili");
    assert(analytics.geotab.movementCount === 3, "analisi: 3 micro-spostamenti esclusi");
    assert(analytics.geotab.matchedTrips === 5, `analisi: 5 viaggi collegati (${analytics.geotab.matchedTrips})`);
    assert(analytics.geotab.emptyTrips === 2, "analisi: 2 viaggi a vuoto");
    assert(analytics.geotab.emptyKm > 0, "analisi: km a vuoto espliciti");
    assert(analytics.geotab.totalKm > 0, "analisi: km Geotab calcolati");
    assert(analytics.forecast.monthsUsed === 1, "forecast: 1 mese importato");
    assert(analytics.forecast.confidence === "BASSA", "forecast: affidabilità bassa con un mese");
    assert(Math.abs(analytics.forecast.projected12m - 93480) < 0.01, "forecast: stima 12 mesi 93.480 €");
    assert(analytics.topRevenuePerKm.length > 0, "analisi: resa €/km calcolata");

    const firstTripId = firstTrips[0].id;
    const recommendations = await admin.req(`/api/trips/${firstTripId}/recommendations`);
    assert(recommendations.status === 200, `GET consigli 200 (${recommendations.status})`);
    assert(recommendations.body.vehicles.length > 0, "consigli: mezzi proposti");
    assert(
      recommendations.body.vehicles.every((vehicle: { reasons: string[] }) => vehicle.reasons.length > 0),
      "consigli: motivazioni mezzo presenti"
    );
    assert(recommendations.body.drivers.length > 0, "consigli: autisti proposti");

    const assigned = await admin.req(`/api/trips/${firstTripId}`, {
      method: "PATCH",
      body: JSON.stringify({
        driverId: driver.id,
        vehicleId: vehicle.id,
        status: "COMPLETATO",
        eventNote: "e2e rendiconto",
      }),
    });
    assert(assigned.status === 200, `PATCH assegnazione autista 200 (${assigned.status})`);
    assert(assigned.body.trip.driver?.id === driver.id, "autista collegato al viaggio");

    const driverClient = makeClient(3000, await login(3000, DRIVER.email, DRIVER.password));
    const driverTrips = await driverClient.req("/api/autista/trips");
    assert(driverTrips.status === 200, `GET viaggi autista 200 (${driverTrips.status})`);
    assert(
      driverTrips.body.trips.some((trip: { id: string }) => trip.id === firstTripId),
      "l'autista vede il viaggio assegnato"
    );

    console.log("7) Pagina di import...");
    const page = await admin.req("/dashboard/trips/importa");
    assert(page.status === 200, `pagina import 200 (${page.status})`);
    assert(
      typeof page.body === "string" && page.body.includes("Importa rendiconto viaggi"),
      "la pagina renderizza il titolo"
    );

    console.log("RENDICONTO e2e: TUTTI I CHECK PASSATI");
  } finally {
    try {
      if (demoCompanyId) {
        await db.$executeRawUnsafe(
          `DELETE FROM "GeotabTripSnapshot" WHERE "companyId" = $1 AND "geotabTripId" LIKE 'e2e-stmt-%'`,
          demoCompanyId
        );
      }
      if (tripIds.length > 0) {
        await db.$executeRawUnsafe(`DELETE FROM "Trip" WHERE id = ANY($1::text[])`, tripIds);
      }
      for (const id of [statementId, secondStatementId].filter(Boolean)) {
        await db.$executeRawUnsafe(`DELETE FROM "TripStatementLine" WHERE "statementId" = $1`, id);
        await db.$executeRawUnsafe(`DELETE FROM "TripStatement" WHERE id = $1`, id);
      }
      if (uploadedKey) await utapi.deleteFiles(uploadedKey);
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

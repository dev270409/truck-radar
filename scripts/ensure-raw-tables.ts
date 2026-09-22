import { db } from "../lib/db";
import bcrypt from "bcryptjs";

/**
 * Bootstrap idempotente di tabelle che richiedono SQL raw
 * (Prisma CLI migrate/db push non disponibile: manca DIRECT_URL locale).
 * Eseguire: npx tsx scripts/ensure-raw-tables.ts
 * Nota: NON replicare queste tabelle in schema.prisma a meno che un db push
 * futuro non venga garantito (evitare drift).
 */

const statements = [
  // Entità §61 — DDT digitale (FASE 2)
  `
  CREATE TABLE IF NOT EXISTS "TripDocument" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "tripId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS "TripDocument_tripId_idx" ON "TripDocument"("tripId");
  CREATE INDEX IF NOT EXISTS "TripDocument_companyId_idx" ON "TripDocument"("companyId");
  `,

  // Entità §61 — Tracking (FASE 2)
  `
  CREATE TABLE IF NOT EXISTS "TrackingEvent" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "tripId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "posizione" TEXT,
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS "TrackingEvent_tripId_idx" ON "TrackingEvent"("tripId");
  CREATE INDEX IF NOT EXISTS "TrackingEvent_companyId_idx" ON "TrackingEvent"("companyId");
  `,

  // Entità §61 — Catalogo provider esterni (FASE 3)
  `
  CREATE TABLE IF NOT EXISTS "ExternalIntegration" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "docsUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "ExternalIntegration_provider_key" ON "ExternalIntegration"("provider");
  `,

  // Entità §61 — Connessione API azienda (FASE 3, credenziali cifrate)
  `
  CREATE TABLE IF NOT EXISTS "ApiConnection" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "companyId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT,
    "credentialsCipher" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "config" JSONB,
    "lastTestedAt" TIMESTAMPTZ,
    "lastSyncAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS "ApiConnection_companyId_idx" ON "ApiConnection"("companyId");
  `,

  // Entità §61 — Borsa carichi interna (FASE 5)
  `
  CREATE TABLE IF NOT EXISTS "MarketplaceLoad" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "companyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'OFFRO',
    "luogoRitiro" TEXT NOT NULL,
    "luogoConsegna" TEXT NOT NULL,
    "dataRitiro" TIMESTAMPTZ NOT NULL,
    "dataConsegna" TIMESTAMPTZ NOT NULL,
    "tipoMerce" TEXT,
    "pesoKg" DOUBLE PRECISION,
    "volumeM3" DOUBLE PRECISION,
    "vehicleCategory" TEXT,
    "prezzo" DOUBLE PRECISION,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATTIVO',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS "MarketplaceLoad_companyId_idx" ON "MarketplaceLoad"("companyId");
  CREATE INDEX IF NOT EXISTS "MarketplaceLoad_status_idx" ON "MarketplaceLoad"("status");
  `,

  // Entità §61 — Subappalto (FASE 5)
  `
  CREATE TABLE IF NOT EXISTS "Subcontract" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "tripId" TEXT NOT NULL,
    "parentCompanyId" TEXT NOT NULL,
    "carrierCompanyId" TEXT NOT NULL,
    "marketplaceLoadId" TEXT,
    "price" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PROPOSTO',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS "Subcontract_tripId_idx" ON "Subcontract"("tripId");
  CREATE INDEX IF NOT EXISTS "Subcontract_carrierCompanyId_idx" ON "Subcontract"("carrierCompanyId");
  `,

  // Entità §61 — Reviews blind (FASE 8)
  `
  CREATE TABLE IF NOT EXISTS "Review" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "tripId" TEXT NOT NULL,
    "reviewerCompanyId" TEXT NOT NULL,
    "reviewedCompanyId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "publishedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS "Review_reviewedCompanyId_idx" ON "Review"("reviewedCompanyId");
  CREATE INDEX IF NOT EXISTS "Review_tripId_idx" ON "Review"("tripId");
  CREATE UNIQUE INDEX IF NOT EXISTS "Review_trip_reviewer_unique" ON "Review"("tripId", "reviewerCompanyId");
  `,

  // Entità §55 — Smart Return (FASE 6): carichi di ritorno applicati + metrica km a vuoto
  `
  CREATE TABLE IF NOT EXISTS "SmartReturn" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "tripId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "matchLoadId" TEXT,
    "kmOneWay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kmVuotiPrima" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kmVuotiDopo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ricavoAggiuntivo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "candidato" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS "SmartReturn_companyId_idx" ON "SmartReturn"("companyId");
  CREATE INDEX IF NOT EXISTS "SmartReturn_tripId_idx" ON "SmartReturn"("tripId");
  `,

  // Entità §55/T13 — KM per viaggio: base dati km (stima deterministica città) per analytics/ESG
  `
  CREATE TABLE IF NOT EXISTS "TripKm" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "tripId" TEXT NOT NULL UNIQUE,
    "companyId" TEXT NOT NULL,
    "km" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS "TripKm_companyId_idx" ON "TripKm"("companyId");
  `,

  // Entità §46 — Badge automatici (FASE 8)
  `
  CREATE TABLE IF NOT EXISTS "Badge" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "earnedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE ("companyId", "code")
  );
  CREATE INDEX IF NOT EXISTS "Badge_companyId_idx" ON "Badge"("companyId");
  `,

  // Entità §47 — Aree di sosta community (FASE 8)
  `
  CREATE TABLE IF NOT EXISTS "ParkingArea" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "companyId" TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    security BOOLEAN NOT NULL DEFAULT false,
    illuminated BOOLEAN NOT NULL DEFAULT false,
    restaurant BOOLEAN NOT NULL DEFAULT false,
    showers BOOLEAN NOT NULL DEFAULT false,
    wifi BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS "ParkingArea_city_idx" ON "ParkingArea"("city");
  CREATE TABLE IF NOT EXISTS "ParkingFeedback" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "parkingAreaId" TEXT NOT NULL REFERENCES "ParkingArea"(id) ON DELETE CASCADE,
    "companyId" TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE ("parkingAreaId", "companyId")
  );
  `,

  // Entità feedback committente — Incasso rapido Stripe Connect (in arrivo)
  // Campi previsti secondo docs/STRIPE_CONNECT_ROADMAP.md: account Express/Custom,
  // aspettiamo l'attivazione del provider prima di esporli.
  `
  CREATE TABLE IF NOT EXISTS "StripeConnectProfile" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "companyId" TEXT NOT NULL UNIQUE,
    "stripeAccountId" TEXT,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "featureActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS "StripeConnectLead" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INTERESSATA',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE ("companyId")
  );
  CREATE INDEX IF NOT EXISTS "StripeConnectLead_status_idx" ON "StripeConnectLead"("status");
  `,

  // Entità T10.3 — Manutenzione programmata veicoli (tagliandi/interventi, km/date)
  `
  CREATE TABLE IF NOT EXISTS "VehicleMaintenance" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "vehicleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descrizione" TEXT,
    "kmProssimo" DOUBLE PRECISION,
    "dataProssima" TIMESTAMPTZ,
    "kmEseguito" DOUBLE PRECISION,
    "dataEseguito" TIMESTAMPTZ,
    "costo" DOUBLE PRECISION,
    "fornitore" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROGRAMMATO',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS "VehicleMaintenance_vehicleId_idx" ON "VehicleMaintenance"("vehicleId");
  CREATE INDEX IF NOT EXISTS "VehicleMaintenance_companyId_idx" ON "VehicleMaintenance"("companyId");
  CREATE INDEX IF NOT EXISTS "VehicleMaintenance_status_idx" ON "VehicleMaintenance"("status");
  `,

  // Entità T10.5 — Geofence / aree personalizzate per tenant
  `
  CREATE TABLE IF NOT EXISTS "GeofenceArea" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "companyId" TEXT NOT NULL,
    name TEXT NOT NULL,
    "latCenter" DOUBLE PRECISION,
    "lngCenter" DOUBLE PRECISION,
    "raggioM" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    note TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS "GeofenceArea_companyId_idx" ON "GeofenceArea"("companyId");
  `,

  // Entità T10.4 — Checklist ispezione veicolo + esiti compilati (PWA autista)
  `
  CREATE TABLE IF NOT EXISTS "InspectionTemplate" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "companyId" TEXT NOT NULL,
    name TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS "InspectionTemplate_companyId_idx" ON "InspectionTemplate"("companyId");
  CREATE TABLE IF NOT EXISTS "VehicleInspection" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "vehicleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tripId" TEXT,
    "templateId" TEXT,
    "templateName" TEXT,
    "esito" TEXT NOT NULL DEFAULT 'OK',
    "items" JSONB NOT NULL DEFAULT '[]',
    "note" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS "VehicleInspection_vehicleId_idx" ON "VehicleInspection"("vehicleId");
  CREATE INDEX IF NOT EXISTS "VehicleInspection_companyId_idx" ON "VehicleInspection"("companyId");
  CREATE INDEX IF NOT EXISTS "VehicleInspection_tripId_idx" ON "VehicleInspection"("tripId");
  `,
];

async function main() {
  console.log("ensure-raw-tables: avvio");
  let created = 0;
  for (const sql of statements) {
    for (const stmt of sql.split(";").filter((s) => s.trim().length > 0)) {
      try {
        await db.$executeRawUnsafe(stmt);
        created++;
      } catch (err) {
        console.error("ensure-raw-tables: statement fallito\n", stmt, "\n", err);
        process.exitCode = 1;
      }
    }
  }

  // Seed catalogo provider esterni (idempotente)
  const providerSeed: Array<[string, string, string, string]> = [
    ["GPS", "GPS / Telemetria", "GPS", "https://esempiogps.dev/docs"],
    ["TMS", "TMS Aziendale", "TMS", "https://esempiotms.dev/docs"],
    ["ERP", "ERP (fatturazione)", "ERP", "https://esempioerp.dev/docs"],
    ["TACHIGRAFO", "Tachigrafi digitali", "TACHIGRAFO", "https://esempiotach.dev/docs"],
    ["BORSA-CARICHI", "Borsa carichi esterna", "BORSA", "https://esempioborsa.dev/docs"],
    ["CARBURANTE", "Carte carburante", "CARBURANTE", "https://esempiocarburante.dev/docs"],
  ];
  for (const [provider, name, type, docsUrl] of providerSeed) {
    try {
      const rows = await db.$queryRawUnsafe(
        `INSERT INTO "ExternalIntegration" ("provider", "name", "type", "docsUrl", "enabled")
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT ("provider") DO NOTHING`,
        provider,
        name,
        type,
        docsUrl
      );
      void rows;
    } catch (err) {
      console.error("ensure-raw-tables: seed provider fallito", provider, err);
      process.exitCode = 1;
    }
  }
  console.log(`ensure-raw-tables: provider catalogo ok (${providerSeed.length})`);

  // Seed network: seconda azienda VERIFICATA (Vettore Demo SRL) — subappalto, review, borsa carichi cross-azienda
  const vettorePiva = "NETWCL910001";
  try {
    const rows = (await db.$queryRawUnsafe(
      `INSERT INTO "Company" ("id", "ragioneSociale", "partitaIva", "indirizzo", "telefono", "subscriptionStatus", "subscriptionPlan", "updatedAt")
       VALUES (gen_random_uuid(), 'Vettore Demo SRL', $1, 'Via Rete 1, Milano', '02 9999999',
               'ACTIVE'::"SubscriptionStatus", 'PRO'::"SubscriptionPlan", now())
       ON CONFLICT ("partitaIva") DO UPDATE SET "subscriptionStatus" = 'ACTIVE'::"SubscriptionStatus", "updatedAt" = now()
       RETURNING "id"`,
      vettorePiva
    )) as Array<{ id: string }>;
    const vettoreId = rows[0].id;

    await db.$queryRawUnsafe(
      `INSERT INTO "Vehicle" ("id", "companyId", "targa", "categoria", "portataMaxKg", "volumeMaxM3", "status", "updatedAt")
       SELECT gen_random_uuid(), $1, 'VTR99', 'TELONATO'::"VehicleCategory", 24000, 90, 'DISPONIBILE'::"VehicleStatus", now()
       WHERE NOT EXISTS (SELECT 1 FROM "Vehicle" v WHERE v."companyId" = $1 AND v."targa" = 'VTR99')`,
      vettoreId
    );

    await db.$queryRawUnsafe(
      `INSERT INTO "ApiConnection" ("id", "companyId", "integrationId", "name", "baseUrl", "credentialsCipher", "status")
       SELECT gen_random_uuid(), $1, i."id", 'GPS Vettore Demo', 'https://api.gps-demo.example.com', 'network-demo', 'SYNCED'
       FROM "ExternalIntegration" i WHERE i."provider" = 'GPS' AND i.enabled = true
       AND NOT EXISTS (
         SELECT 1 FROM "ApiConnection" a WHERE a."companyId" = $1 AND a."name" = 'GPS Vettore Demo'
       )`,
      vettoreId
    );

    await db.$queryRawUnsafe(
      `INSERT INTO "MarketplaceLoad" ("id", "companyId", "kind", "luogoRitiro", "luogoConsegna", "dataRitiro", "dataConsegna", "tipoMerce", "pesoKg", "volumeM3", "vehicleCategory", "prezzo", "status")
       SELECT gen_random_uuid(), $1, 'CERCO', 'Roma', 'Milano', now() + interval '2 days', now() + interval '3 days', 'Semilavorati', 18000, 68, 'TELONATO', 780, 'ATTIVO'
       WHERE NOT EXISTS (
         SELECT 1 FROM "MarketplaceLoad" m WHERE m."companyId" = $1 AND m."luogoRitiro" = 'Roma' AND m."luogoConsegna" = 'Milano' AND m."status" = 'ATTIVO'
       )`,
      vettoreId
    );

    // Utente di accesso per il Vettore Demo (ruoli network, recensioni, subappalti)
    const vettorePwd = await bcrypt.hash("Demo123!", 10);
    await db.$queryRawUnsafe(
      `INSERT INTO "User" ("id", "email", "passwordHash", "nome", "cognome", "role", "isActive", "companyId", "updatedAt")
       SELECT gen_random_uuid(), 'vettore@demo.com', $2, 'Vettore', 'Demo', 'ADMIN'::"UserRole", true, $1, now()
       WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "email" = 'vettore@demo.com')`,
      vettoreId,
      vettorePwd
    );

    // Recensione blind "matura" (>7gg) che viene pubblicata da publishDueReviews:
    // la controparte demo recensisce il Vettore Demo → reputazione visibile nel network
    await db.$queryRawUnsafe(
      `INSERT INTO "Review" ("id", "tripId", "reviewerCompanyId", "reviewedCompanyId", "role", "rating", "comment", "createdAt")
       SELECT gen_random_uuid(), 'seed-review-network', u."companyId", $1, 'COMMITTENTE', 4, 'Affidabile e puntuale sul network.', now() - interval '10 days'
       FROM "User" u
       WHERE u.email = 'admin@demo.com'
         AND NOT EXISTS (
           SELECT 1 FROM "Review" r WHERE r."tripId" = 'seed-review-network' AND r."reviewerCompanyId" = u."companyId"
         )`,
      vettoreId
    );

    console.log("ensure-raw-tables: seed network Vettore Demo SRL ok");
  } catch (err) {
    console.error("ensure-raw-tables: seed network fallito", err);
    process.exitCode = 1;
  }

  // Seed aree di sosta community (§47)
  try {
    await db.$queryRawUnsafe(
      `INSERT INTO "ParkingArea" ("id", "companyId", name, address, city, security, illuminated, restaurant, showers, wifi)
       SELECT 'seed-parking-01', c.id, 'Sosta Monte Bianco', 'Via Trasportatori 12', 'Courmayeur', true, true, true, true, true
       FROM "Company" c WHERE c."ragioneSociale" = 'Vettore Demo SRL'
         AND NOT EXISTS (SELECT 1 FROM "ParkingArea" WHERE id = 'seed-parking-01')`
    );
    await db.$queryRawUnsafe(
      `INSERT INTO "ParkingArea" ("id", "companyId", name, address, city, security, illuminated, restaurant, showers, wifi)
       SELECT 'seed-parking-02', c.id, 'Truck Radar Logistic Park', 'Via degli Spedizionieri 3', 'Milano', true, true, false, false, true
       FROM "Company" c WHERE c."ragioneSociale" = 'Vettore Demo SRL'
         AND NOT EXISTS (SELECT 1 FROM "ParkingArea" WHERE id = 'seed-parking-02')`
    );
    console.log("ensure-raw-tables: seed aree di sosta ok");
  } catch (err) {
    console.error("ensure-raw-tables: seed aree di sosta fallito", err);
    process.exitCode = 1;
  }

  console.log(`ensure-raw-tables: completato (${created} statement eseguiti)`);
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
  await db.$disconnect();
});
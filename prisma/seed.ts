import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Starting Database Seed for Truck Radar...");

  // Clean existing seed data if any
  await db.auditLog.deleteMany({});
  await db.vehicleDocument.deleteMany({});
  await db.user.deleteMany({});
  await db.vehicle.deleteMany({});
  await db.kycDocument.deleteMany({});
  await db.company.deleteMany({});
  await db.commissionRate.deleteMany({});

  // 1. Create Company "Trasporti Demo Srl"
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

  const company = await db.company.create({
    data: {
      ragioneSociale: "Trasporti Demo Srl",
      partitaIva: "12345678901",
      indirizzo: "Via della Logistica 42, 20100 Milano (MI)",
      telefono: "+39 02 9876543",
      subscriptionStatus: "TRIAL",
      subscriptionPlan: "BASE",
      trialEndsAt,
    },
  });

  console.log(`✅ Created Company: ${company.ragioneSociale} (ID: ${company.id})`);

  // Create initial KYC documents
  await db.kycDocument.createMany({
    data: [
      {
        companyId: company.id,
        tipo: "PARTITA_IVA",
        fileName: "Certificato_Partita_IVA_Demo.pdf",
        fileUrl: "https://storage.logiflow.it/kyc/demo-piva.pdf",
        status: "IN_ATTESA",
      },
      {
        companyId: company.id,
        tipo: "LICENZA_CONTO_TERZI",
        fileName: "Licenza_Conto_Terzi_Demo.pdf",
        fileUrl: "https://storage.logiflow.it/kyc/demo-licenza.pdf",
        status: "IN_ATTESA",
      },
      {
        companyId: company.id,
        tipo: "ALBO_TRASPORTATORI",
        fileName: "Iscrizione_Albo_Autotrasportatori_Demo.pdf",
        fileUrl: "https://storage.logiflow.it/kyc/demo-albo.pdf",
        status: "IN_ATTESA",
      },
    ],
  });

  // 2. Create 2 Vehicles (One AVAILABLE, One IN_MANUTENZIONE with expired inspection)
  const vehicleAvailable = await db.vehicle.create({
    data: {
      companyId: company.id,
      targa: "AB123CD",
      categoria: "FRIGO",
      portataMaxKg: 12000,
      volumeMaxM3: 45,
      status: "DISPONIBILE",
    },
  });

  const vehicleMaintenance = await db.vehicle.create({
    data: {
      companyId: company.id,
      targa: "EF456GH",
      categoria: "TELONATO",
      portataMaxKg: 18000,
      volumeMaxM3: 65,
      status: "IN_MANUTENZIONE",
    },
  });

  // Add vehicle documents (one valid, one expired revision)
  const pastDate = new Date();
  pastDate.setMonth(pastDate.getMonth() - 2); // Expired 2 months ago

  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1); // Valid 1 year

  await db.vehicleDocument.createMany({
    data: [
      {
        vehicleId: vehicleAvailable.id,
        tipo: "REVISIONE",
        dataScadenza: futureDate,
        fileUrl: "https://storage.logiflow.it/docs/revisione-ab123cd.pdf",
      },
      {
        vehicleId: vehicleMaintenance.id,
        tipo: "REVISIONE",
        dataScadenza: pastDate, // Expired inspection document
        fileUrl: "https://storage.logiflow.it/docs/revisione-ef456gh-expired.pdf",
      },
    ],
  });

  console.log(`✅ Created 2 Vehicles: ${vehicleAvailable.targa} (Disponibile), ${vehicleMaintenance.targa} (In Manutenzione / Revisione Scaduta)`);

  // 3. Create Users
  const passwordHash = await bcrypt.hash("Demo123!", 10);

  // Admin User
  const adminUser = await db.user.create({
    data: {
      companyId: company.id,
      email: "admin@demo.com",
      passwordHash,
      nome: "Mario",
      cognome: "Rossi",
      telefono: "+39 333 1112233",
      role: "ADMIN",
      isActive: true,
    },
  });

  // Autista User (Mandatory requirement: LINKED to the AVAILABLE vehicle via vehicleId)
  const autistaUser = await db.user.create({
    data: {
      companyId: company.id,
      email: "autista@demo.com",
      passwordHash,
      nome: "Giuseppe",
      cognome: "Verdi",
      telefono: "+39 333 4445566",
      role: "AUTISTA",
      isActive: true,
      vehicleId: vehicleAvailable.id, // Mandatory driver-vehicle linkage
    },
  });

  console.log(`✅ Created Admin User: ${adminUser.email}`);
  console.log(`✅ Created Autista User: ${autistaUser.email} (Linked to Vehicle ID ${vehicleAvailable.id} / Targa ${vehicleAvailable.targa})`);

  // 4. Create Commission Rate (Marketplace 10%)
  const commissionRate = await db.commissionRate.create({
    data: {
      planType: "marketplace",
      percentage: 10.0,
      description: "Commissione standard su transazioni marketplace (10%)",
      isActive: true,
    },
  });

  console.log(`✅ Created CommissionRate: ${commissionRate.planType} = ${commissionRate.percentage}%`);

  console.log("\n🎉 Seed script finished successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

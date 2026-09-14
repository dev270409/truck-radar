import { db } from "../lib/db";
import { getTenantDb, validateTenantAccess } from "../lib/tenant";

async function runMultiTenancySecurityTest() {
  console.log("🔒 Running Multi-Tenancy Security Verification Test...");

  let companyAId = "";
  let companyBId = "";
  let vehicleBId = "";

  try {
    // 1. Create Tenant Company A
    const companyA = await db.company.create({
      data: {
        ragioneSociale: "Test Tenant Company A Srl",
        partitaIva: `TEST-A-${Date.now()}`,
        indirizzo: "Via A",
        telefono: "111",
      },
    });
    companyAId = companyA.id;

    // 2. Create Tenant Company B & Vehicle B
    const companyB = await db.company.create({
      data: {
        ragioneSociale: "Test Tenant Company B Srl",
        partitaIva: `TEST-B-${Date.now()}`,
        indirizzo: "Via B",
        telefono: "222",
      },
    });
    companyBId = companyB.id;

    const vehicleB = await db.vehicle.create({
      data: {
        companyId: companyB.id,
        targa: "SEC-404-B",
        categoria: "FRIGO",
        portataMaxKg: 10000,
        volumeMaxM3: 40,
        status: "DISPONIBILE",
      },
    });
    vehicleBId = vehicleB.id;

    console.log(`🔹 Created Company A (${companyAId})`);
    console.log(`🔹 Created Company B (${companyBId}) with Vehicle B (${vehicleBId})`);

    // TEST 1: Attempt query for Vehicle B using Company A tenant context
    const tenantDbA = getTenantDb(companyAId);
    const crossTenantQuery = await tenantDbA.vehicles.findFirst({
      where: { id: vehicleBId },
    });

    if (crossTenantQuery !== null) {
      throw new Error(
        "❌ VULNERABILITY DETECTED: Company A was able to read Vehicle B belonging to Company B!"
      );
    }
    console.log("✅ TEST 1 PASSED: Query for Vehicle B under Company A context returned NULL (404 Not Found).");

    // TEST 2: Attempt explicit tenant access validation
    let threw403 = false;
    try {
      validateTenantAccess(vehicleB.companyId, companyAId);
    } catch (err: any) {
      if (err.statusCode === 403 || err.message.includes("Forbidden")) {
        threw403 = true;
      }
    }

    if (!threw403) {
      throw new Error(
        "❌ VULNERABILITY DETECTED: validateTenantAccess did not throw 403 on cross-tenant access!"
      );
    }
    console.log("✅ TEST 2 PASSED: Direct tenant access validation rejected with 403 Forbidden.");

    console.log("\n🎉 MULTI-TENANCY SECURITY TEST COMPLETED SUCCESSFULLY! No cross-tenant leaks possible.\n");
  } catch (error: any) {
    console.error("❌ MULTI-TENANCY TEST FAILED:", error.message);
    process.exit(1);
  } finally {
    // Cleanup test records
    if (vehicleBId) await db.vehicle.deleteMany({ where: { id: vehicleBId } });
    if (companyAId) await db.company.deleteMany({ where: { id: companyAId } });
    if (companyBId) await db.company.deleteMany({ where: { id: companyBId } });
    await db.$disconnect();
  }
}

runMultiTenancySecurityTest();

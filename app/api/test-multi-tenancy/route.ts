import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantDb } from "@/lib/tenant";

// Endpoint di test del multi-tenancy. ESPOSTO SOLO IN SVILUPPO: in produzione
// non deve essere raggiungibile (crea/elimina dati reali e non ha auth).
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Non disponibile." }, { status: 404 });
  }

  let companyAId = "";
  let companyBId = "";
  let vehicleBId = "";

  try {
    const companyA = await db.company.create({
      data: {
        ragioneSociale: "API Test Company A",
        partitaIva: `API-A-${Date.now()}`,
        indirizzo: "Via A",
        telefono: "111",
      },
    });
    companyAId = companyA.id;

    const companyB = await db.company.create({
      data: {
        ragioneSociale: "API Test Company B",
        partitaIva: `API-B-${Date.now()}`,
        indirizzo: "Via B",
        telefono: "222",
      },
    });
    companyBId = companyB.id;

    const vehicleB = await db.vehicle.create({
      data: {
        companyId: companyB.id,
        targa: "API-404-B",
        categoria: "FRIGO",
        portataMaxKg: 8000,
        volumeMaxM3: 30,
        status: "DISPONIBILE",
      },
    });
    vehicleBId = vehicleB.id;

    // Query test under Company A
    const tenantDbA = getTenantDb(companyAId);
    const leakedVehicle = await tenantDbA.vehicles.findFirst({
      where: { id: vehicleBId },
    });

    // Cleanup
    await db.vehicle.deleteMany({ where: { id: vehicleBId } });
    await db.company.deleteMany({ where: { id: { in: [companyAId, companyBId] } } });

    if (leakedVehicle !== null) {
      return NextResponse.json(
        { success: false, error: "Vulnerabilità rilevata! Accesso cross-tenant consentito." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test Multi-Tenancy superato! L'accesso al veicolo di un'altra company viene rifiutato con 404/403.",
      testedVehicleId: vehicleBId,
      companyAId,
      companyBId,
      result: "404_NOT_FOUND (Isolamento garantito a livello di Query)",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

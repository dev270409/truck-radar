import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { db } from "@/lib/db";
import { getTenantDb } from "@/lib/tenant";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireFeature("trips");
  if (guard.error) return guard.error;
  if (guard.session.user.role !== "ADMIN" && guard.session.user.role !== "UFFICIO") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  const { id } = await params;
  const tenantDb = getTenantDb(guard.session.user.companyId);
  const trip = await tenantDb.trips.findFirst({ where: { id } });
  if (!trip) {
    return NextResponse.json({ error: "Viaggio non trovato." }, { status: 404 });
  }

  const windowStart = new Date(trip.dataRitiro.getTime() - 24 * 60 * 60_000);
  const windowEnd = new Date(trip.dataConsegna.getTime() + 24 * 60 * 60_000);
  const [vehicles, drivers, busyTrips] = await Promise.all([
    db.vehicle.findMany({
      where: { companyId: guard.session.user.companyId },
      select: {
        id: true,
        targa: true,
        categoria: true,
        portataMaxKg: true,
        volumeMaxM3: true,
        status: true,
      },
    }),
    db.user.findMany({
      where: {
        companyId: guard.session.user.companyId,
        role: "AUTISTA",
        isActive: true,
      },
      select: { id: true, nome: true, cognome: true, vehicleId: true },
    }),
    db.trip.findMany({
      where: {
        companyId: guard.session.user.companyId,
        id: { not: trip.id },
        status: { in: ["ASSEGNATO", "IN_CORSO"] },
        dataRitiro: { lt: windowEnd },
        dataConsegna: { gt: windowStart },
      },
      select: { vehicleId: true, driverId: true },
    }),
  ]);

  const busyVehicles = new Set(busyTrips.map((row) => row.vehicleId).filter(Boolean));
  const busyDrivers = new Set(busyTrips.map((row) => row.driverId).filter(Boolean));
  const goods = (trip.tipoMerce ?? "").toUpperCase();

  const vehicleSuggestions = vehicles
    .map((vehicle) => {
      const reasons: string[] = [];
      let score = 0;

      if (trip.pesoKg > 0 && vehicle.portataMaxKg < trip.pesoKg) {
        return null;
      }
      if (trip.volumeM3 > 0 && vehicle.volumeMaxM3 < trip.volumeM3) {
        return null;
      }

      if (trip.pesoKg > 0) {
        const spare = 1 - trip.pesoKg / Math.max(vehicle.portataMaxKg, 1);
        score += Math.max(5, 30 - spare * 20);
        reasons.push(`Portata ${vehicle.portataMaxKg.toLocaleString("it-IT")} kg ≥ ${trip.pesoKg.toLocaleString("it-IT")} kg`);
      } else {
        score += 10;
      }
      if (trip.volumeM3 > 0) {
        const spare = 1 - trip.volumeM3 / Math.max(vehicle.volumeMaxM3, 1);
        score += Math.max(3, 15 - spare * 10);
        reasons.push(`Volume ${vehicle.volumeMaxM3} m³ ≥ ${trip.volumeM3} m³`);
      }

      if (vehicle.status === "DISPONIBILE") {
        score += 20;
        reasons.push("Disponibile");
      } else {
        reasons.push(`Stato ${vehicle.status}`);
      }

      if (busyVehicles.has(vehicle.id)) {
        score -= 40;
        reasons.push("Impegnato in un viaggio vicino");
      } else {
        score += 25;
        reasons.push("Libero nella finestra del viaggio");
      }

      if ((goods.includes("FRIGO") || goods.includes("REFRIGER")) && vehicle.categoria === "FRIGO") {
        score += 15;
        reasons.push("Categoria FRIGO adatta alla merce");
      } else if ((goods.includes("ADR") || goods.includes("PERICOL")) && vehicle.categoria === "ADR") {
        score += 15;
        reasons.push("Categoria ADR adatta alla merce");
      } else if ((goods.includes("CISTERNA") || goods.includes("LIQUID")) && vehicle.categoria === "CISTERNA") {
        score += 10;
        reasons.push("Categoria cisterna adatta alla merce");
      } else {
        score += 3;
      }

      return {
        id: vehicle.id,
        targa: vehicle.targa,
        categoria: vehicle.categoria,
        score: Math.round(score),
        reasons: reasons.slice(0, 4),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const driverSuggestions = drivers
    .map((driver) => {
      const reasons: string[] = [];
      let score = 10;
      if (busyDrivers.has(driver.id)) {
        score -= 50;
        reasons.push("Ha già un viaggio nella stessa finestra");
      } else {
        score += 30;
        reasons.push("Libero nella finestra del viaggio");
      }
      if (vehicleSuggestions[0] && driver.vehicleId === vehicleSuggestions[0].id) {
        score += 15;
        reasons.push("È associato al mezzo consigliato");
      }
      return {
        id: driver.id,
        nome: `${driver.nome} ${driver.cognome}`.trim(),
        score: Math.round(score),
        reasons: reasons.slice(0, 3),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return NextResponse.json({
    trip: {
      id: trip.id,
      pesoKg: trip.pesoKg,
      volumeM3: trip.volumeM3,
      tipoMerce: trip.tipoMerce,
      dataRitiro: trip.dataRitiro,
    },
    vehicles: vehicleSuggestions,
    drivers: driverSuggestions,
    note:
      drivers.length === 0
        ? "Nessun autista attivo: crea un utente con ruolo AUTISTA per poter assegnare i viaggi."
        : undefined,
  });
}

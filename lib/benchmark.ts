import { db } from "./db";
import { normalizePlate } from "./geotab";
import { isGeotabMovement } from "./geotab-classify";
import {
  fuelPrice,
  realConsumption,
  STIMA_CONSUMO_MEDIO_KM_PER_LITRO,
  STIMA_PREZZO_GASOLIO_EUR_PER_LITRO,
  type FuelLogRow,
} from "./fuel";
import { getEarningsForecast, type EarningsForecast } from "./trip-forecast";

export interface BenchmarkVehicle {
  vehicleId: string;
  targa: string;
  categoria: string;
  km: number;
  kmSource: "GEOTAB" | "TRIPKM" | "NESSUNO";
  geotabTrips: number;
  paidTrips: number;
  coveragePct: number;
  fuelLiters: number;
  fuelCost: number;
  fuelSource: "RIFORNIMENTI" | "STIMA" | "NESSUNO";
  kmPerLitro: number | null;
  otherCost: number;
  totalCost: number;
  costPerKm: number | null;
  revenue: number;
  revenuePerKm: number | null;
  marginPerKm: number | null;
  avgRevenuePerTrip: number | null;
  vsCompanyCostPct: number | null;
  vsCompanyRevenuePct: number | null;
}

export interface BenchmarkCategory {
  categoria: string;
  vehicles: number;
  km: number;
  geotabTrips: number;
  paidTrips: number;
  coveragePct: number;
  fuelCost: number;
  otherCost: number;
  totalCost: number;
  costPerKm: number | null;
  revenue: number;
  revenuePerKm: number | null;
  marginPerKm: number | null;
  kmPerLitro: number | null;
}

export interface BenchmarkResult {
  periodMonths: number;
  from: string;
  to: string;
  totals: {
    km: number;
    geotabTrips: number;
    paidTrips: number;
    coveragePct: number;
    fuelCost: number;
    otherCost: number;
    totalCost: number;
    costPerKm: number | null;
    revenue: number;
    revenuePerKm: number | null;
    marginPerKm: number | null;
  };
  categories: BenchmarkCategory[];
  vehicles: BenchmarkVehicle[];
  forecast: EarningsForecast;
  warnings: string[];
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function ratio(value: number, divisor: number) {
  return divisor > 0 ? round(value / divisor) : null;
}

interface GeotabRow {
  licensePlate: string | null;
  startAt: Date;
  stopAt: Date | null;
  distanceKm: number | null;
}

export async function getBenchmark(companyId: string, periodMonths = 12): Promise<BenchmarkResult> {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - periodMonths);

  const [vehicles, geotabRows, tripKmRows, fuelRows, costRows, revenueRows, unassignedRevenue, forecast] =
    await Promise.all([
      db.vehicle.findMany({
        where: { companyId },
        select: { id: true, targa: true, categoria: true },
      }),
      db.$queryRawUnsafe(
        `SELECT "licensePlate", "startAt", "stopAt", "distanceKm"
         FROM "GeotabTripSnapshot"
         WHERE "companyId" = $1 AND "startAt" >= $2`,
        companyId,
        from
      ) as Promise<GeotabRow[]>,
      db.$queryRawUnsafe(
        `SELECT t."vehicleId", coalesce(sum(k."km"),0)::float8 AS km
         FROM "TripKm" k
         JOIN "Trip" t ON t.id = k."tripId"
         WHERE k."companyId" = $1 AND t."dataRitiro" >= $2 AND t."vehicleId" IS NOT NULL
         GROUP BY t."vehicleId"`,
        companyId,
        from
      ) as Promise<Array<{ vehicleId: string; km: number }>>,
      db.$queryRawUnsafe(
        `SELECT * FROM "FuelLog"
         WHERE "companyId" = $1 AND "createdAt" >= $2
         ORDER BY "vehicleId", "odometerKm"`,
        companyId,
        from
      ) as Promise<FuelLogRow[]>,
      db.$queryRawUnsafe(
        `SELECT "vehicleId", coalesce(sum(importo),0)::float8 AS total
         FROM "VehicleCost"
         WHERE "companyId" = $1 AND data >= $2
         GROUP BY "vehicleId"`,
        companyId,
        from
      ) as Promise<Array<{ vehicleId: string; total: number }>>,
      db.$queryRawUnsafe(
        `SELECT t."vehicleId", count(l.id)::int AS "paidTrips", coalesce(sum(l.amount),0)::float8 AS revenue
         FROM "TripStatementLine" l
         JOIN "Trip" t ON t.id = l."tripId"
         WHERE l."companyId" = $1 AND l.date >= $2::date AND t."vehicleId" IS NOT NULL
         GROUP BY t."vehicleId"`,
        companyId,
        from
      ) as Promise<Array<{ vehicleId: string; paidTrips: number; revenue: number }>>,
      db.$queryRawUnsafe(
        `SELECT count(l.id)::int AS "paidTrips", coalesce(sum(l.amount),0)::float8 AS revenue
         FROM "TripStatementLine" l
         LEFT JOIN "Trip" t ON t.id = l."tripId"
         WHERE l."companyId" = $1 AND l.date >= $2::date AND (t.id IS NULL OR t."vehicleId" IS NULL)`,
        companyId,
        from
      ) as Promise<Array<{ paidTrips: number; revenue: number }>>,
      getEarningsForecast(companyId),
    ]);

  const vehicleByPlate = new Map(vehicles.map((vehicle) => [normalizePlate(vehicle.targa), vehicle]));
  const kmByVehicle = new Map<string, { km: number; source: "GEOTAB" | "TRIPKM"; trips: number }>();
  for (const row of geotabRows) {
    if (isGeotabMovement({ startAt: row.startAt, stopAt: row.stopAt, distanceKm: row.distanceKm })) {
      continue;
    }
    const vehicle = row.licensePlate ? vehicleByPlate.get(normalizePlate(row.licensePlate)) : undefined;
    if (!vehicle) continue;
    const current = kmByVehicle.get(vehicle.id) ?? { km: 0, source: "GEOTAB" as const, trips: 0 };
    current.km += Number(row.distanceKm ?? 0);
    current.trips += 1;
    kmByVehicle.set(vehicle.id, current);
  }
  for (const row of tripKmRows) {
    if (kmByVehicle.has(row.vehicleId)) continue;
    kmByVehicle.set(row.vehicleId, { km: Number(row.km ?? 0), source: "TRIPKM", trips: 0 });
  }

  const fuelByVehicle = new Map<string, FuelLogRow[]>();
  for (const row of fuelRows) {
    const list = fuelByVehicle.get(row.vehicleId) ?? [];
    list.push(row);
    fuelByVehicle.set(row.vehicleId, list);
  }
  const globalPrice = fuelPrice(fuelRows) ?? STIMA_PREZZO_GASOLIO_EUR_PER_LITRO;
  const costByVehicle = new Map(costRows.map((row) => [row.vehicleId, Number(row.total ?? 0)]));
  const revenueByVehicle = new Map(
    revenueRows.map((row) => [row.vehicleId, { paidTrips: Number(row.paidTrips ?? 0), revenue: Number(row.revenue ?? 0) }])
  );

  const benchmarkVehicles: BenchmarkVehicle[] = vehicles.map((vehicle) => {
    const kmData = kmByVehicle.get(vehicle.id);
    const km = kmData?.km ?? 0;
    const fuel = fuelByVehicle.get(vehicle.id) ?? [];
    const real = realConsumption(fuel);
    const fuelLiters = fuel.reduce((sum, row) => sum + Number(row.litri ?? 0), 0);
    const fuelCostActual = fuel.reduce((sum, row) => sum + Number(row.costo ?? 0), 0);
    const kmPerLitro =
      real?.kmPerLitro ?? STIMA_CONSUMO_MEDIO_KM_PER_LITRO[vehicle.categoria] ?? 3.3;
    const fuelSource: BenchmarkVehicle["fuelSource"] =
      fuelCostActual > 0 ? "RIFORNIMENTI" : km > 0 ? "STIMA" : "NESSUNO";
    const fuelCost =
      fuelCostActual > 0 ? fuelCostActual : km > 0 ? (km / kmPerLitro) * globalPrice : 0;
    const otherCost = costByVehicle.get(vehicle.id) ?? 0;
    const totalCost = fuelCost + otherCost;
    const revenue = revenueByVehicle.get(vehicle.id)?.revenue ?? 0;
    const paidTrips = revenueByVehicle.get(vehicle.id)?.paidTrips ?? 0;
    const geotabTrips = kmData?.trips ?? 0;

    return {
      vehicleId: vehicle.id,
      targa: vehicle.targa,
      categoria: vehicle.categoria,
      km: Math.round(km),
      kmSource: kmData?.source ?? "NESSUNO",
      geotabTrips,
      paidTrips,
      coveragePct: geotabTrips > 0 ? Math.min(100, Math.round((paidTrips / geotabTrips) * 100)) : 0,
      fuelLiters: round(fuelLiters || (km > 0 ? km / kmPerLitro : 0), 1),
      fuelCost: round(fuelCost),
      fuelSource,
      kmPerLitro: km > 0 ? round(kmPerLitro) : null,
      otherCost: round(otherCost),
      totalCost: round(totalCost),
      costPerKm: ratio(totalCost, km),
      revenue: round(revenue),
      revenuePerKm: ratio(revenue, km),
      marginPerKm:
        ratio(revenue, km) != null && ratio(totalCost, km) != null
          ? round((revenue - totalCost) / km)
          : null,
      avgRevenuePerTrip: paidTrips > 0 ? round(revenue / paidTrips) : null,
      vsCompanyCostPct: null,
      vsCompanyRevenuePct: null,
    };
  });

  const totalKm = benchmarkVehicles.reduce((sum, row) => sum + row.km, 0);
  const totalCost = benchmarkVehicles.reduce((sum, row) => sum + row.totalCost, 0);
  const totalRevenue = benchmarkVehicles.reduce((sum, row) => sum + row.revenue, 0);
  const totalPaidTrips = benchmarkVehicles.reduce((sum, row) => sum + row.paidTrips, 0);
  const totalGeotabTrips = benchmarkVehicles.reduce((sum, row) => sum + row.geotabTrips, 0);
  const companyCostPerKm = totalKm > 0 ? totalCost / totalKm : 0;
  const companyRevenuePerKm = totalKm > 0 ? totalRevenue / totalKm : 0;

  for (const row of benchmarkVehicles) {
    row.vsCompanyCostPct =
      row.costPerKm != null && companyCostPerKm > 0
        ? round(((row.costPerKm - companyCostPerKm) / companyCostPerKm) * 100, 1)
        : null;
    row.vsCompanyRevenuePct =
      row.revenuePerKm != null && companyRevenuePerKm > 0
        ? round(((row.revenuePerKm - companyRevenuePerKm) / companyRevenuePerKm) * 100, 1)
        : null;
  }

  const categories = Array.from(
    benchmarkVehicles.reduce((map, row) => {
      const current =
        map.get(row.categoria) ?? {
          categoria: row.categoria,
          vehicles: 0,
          km: 0,
          geotabTrips: 0,
          paidTrips: 0,
          fuelCost: 0,
          otherCost: 0,
          totalCost: 0,
          revenue: 0,
          liters: 0,
        };
      current.vehicles += 1;
      current.km += row.km;
      current.geotabTrips += row.geotabTrips;
      current.paidTrips += row.paidTrips;
      current.fuelCost += row.fuelCost;
      current.otherCost += row.otherCost;
      current.totalCost += row.totalCost;
      current.revenue += row.revenue;
      current.liters += row.fuelLiters;
      map.set(row.categoria, current);
      return map;
    }, new Map<string, {
      categoria: string;
      vehicles: number;
      km: number;
      geotabTrips: number;
      paidTrips: number;
      fuelCost: number;
      otherCost: number;
      totalCost: number;
      revenue: number;
      liters: number;
    }>())
  )
    .map(([, row]) => ({
      categoria: row.categoria,
      vehicles: row.vehicles,
      km: row.km,
      geotabTrips: row.geotabTrips,
      paidTrips: row.paidTrips,
      coveragePct:
        row.geotabTrips > 0 ? Math.min(100, Math.round((row.paidTrips / row.geotabTrips) * 100)) : 0,
      fuelCost: round(row.fuelCost),
      otherCost: round(row.otherCost),
      totalCost: round(row.totalCost),
      costPerKm: ratio(row.totalCost, row.km),
      revenue: round(row.revenue),
      revenuePerKm: ratio(row.revenue, row.km),
      marginPerKm: ratio(row.revenue - row.totalCost, row.km),
      kmPerLitro: row.liters > 0 ? round(row.km / row.liters) : null,
    }))
    .sort((a, b) => (a.costPerKm ?? 0) - (b.costPerKm ?? 0));

  const warnings: string[] = [];
  if (totalKm === 0) {
    warnings.push("Nessun km disponibile: collega Geotab o registra i viaggi.");
  }
  if (fuelRows.length === 0) {
    warnings.push(
      "Nessun rifornimento registrato: il carburante è stimato con consumo di categoria e prezzo di riferimento."
    );
  }
  if (costRows.length === 0) {
    warnings.push("Nessun costo mezzo registrato: il costo/km include solo il carburante.");
  }
  const unassigned = unassignedRevenue[0];
  if (unassigned && Number(unassigned.revenue) > 0) {
    warnings.push(
      `${Math.round(Number(unassigned.revenue)).toLocaleString("it-IT")} € di ricavi non sono collegati a un mezzo: assegna quei viaggi per completare il benchmark.`
    );
  }
  const coverage = totalGeotabTrips > 0 ? Math.round((totalPaidTrips / totalGeotabTrips) * 100) : 0;
  if (totalGeotabTrips > 0 && coverage < 100) {
    warnings.push(
      `I rendiconti coprono ${coverage}% dei viaggi Geotab: importa gli altri mesi/provider per rendere il margine completo.`
    );
  }

  return {
    periodMonths,
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    totals: {
      km: Math.round(totalKm),
      geotabTrips: totalGeotabTrips,
      paidTrips: totalPaidTrips,
      coveragePct: coverage,
      fuelCost: round(benchmarkVehicles.reduce((sum, row) => sum + row.fuelCost, 0)),
      otherCost: round(benchmarkVehicles.reduce((sum, row) => sum + row.otherCost, 0)),
      totalCost: round(totalCost),
      costPerKm: ratio(totalCost, totalKm),
      revenue: round(totalRevenue),
      revenuePerKm: ratio(totalRevenue, totalKm),
      marginPerKm: ratio(totalRevenue - totalCost, totalKm),
    },
    categories,
    vehicles: benchmarkVehicles.sort((a, b) => (a.costPerKm ?? 0) - (b.costPerKm ?? 0)),
    forecast,
    warnings,
  };
}

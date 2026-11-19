export interface GeoStop {
  name: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
}

export function haversineKm(a: GeoStop, b: GeoStop): number {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return 0;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function pathKm(stops: GeoStop[], order: number[], returnToDepot: boolean): number {
  let total = 0;
  for (let i = 1; i < order.length; i++) {
    total += haversineKm(stops[order[i - 1]], stops[order[i]]);
  }
  if (returnToDepot && order.length > 1) {
    total += haversineKm(stops[order[order.length - 1]], stops[order[0]]);
  }
  return total;
}

export function optimizeStopOrder(
  stops: GeoStop[],
  options?: { startIndex?: number; returnToDepot?: boolean }
): { order: number[]; totalKm: number } {
  const n = stops.length;
  if (n === 0) return { order: [], totalKm: 0 };
  if (n === 1) return { order: [0], totalKm: 0 };

  const startIndex = options?.startIndex ?? 0;
  const returnToDepot = options?.returnToDepot ?? true;
  const remaining = new Set<number>(stops.map((_, i) => i));
  remaining.delete(startIndex);

  const order = [startIndex];
  let current = startIndex;
  while (remaining.size > 0) {
    let best = -1;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const idx of remaining) {
      const d = haversineKm(stops[current], stops[idx]);
      if (d < bestDist) {
        bestDist = d;
        best = idx;
      }
    }
    order.push(best);
    remaining.delete(best);
    current = best;
  }

  let improved = true;
  let bestKm = pathKm(stops, order, returnToDepot);
  while (improved) {
    improved = false;
    for (let i = 1; i < order.length - 1; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const candidate = [...order];
        const segment = candidate.slice(i, j + 1).reverse();
        candidate.splice(i, j - i + 1, ...segment);
        const km = pathKm(stops, candidate, returnToDepot);
        if (km + 0.001 < bestKm) {
          bestKm = km;
          order.splice(0, order.length, ...candidate);
          improved = true;
        }
      }
    }
  }

  return { order, totalKm: Math.round(bestKm * 10) / 10 };
}

export interface TripCostInput {
  km: number;
  fuelPricePerL: number;
  kmPerL: number;
  tollEur: number;
  driverHourlyEur: number;
  drivingHours: number;
  breaksHours: number;
  otherCostsEur: number;
  markupPct: number;
}

export interface TripCostResult {
  fuelCost: number;
  driverCost: number;
  totalCost: number;
  suggestedPrice: number;
  margin: number;
}

export function calculateTripCost(input: TripCostInput): TripCostResult {
  const fuelCost = input.kmPerL > 0 ? (input.km / input.kmPerL) * input.fuelPricePerL : 0;
  const driverCost = (input.drivingHours + input.breaksHours) * input.driverHourlyEur;
  const totalCost = fuelCost + input.tollEur + driverCost + input.otherCostsEur;
  const suggestedPrice = totalCost * (1 + input.markupPct / 100);
  return {
    fuelCost: round2(fuelCost),
    driverCost: round2(driverCost),
    totalCost: round2(totalCost),
    suggestedPrice: round2(suggestedPrice),
    margin: round2(suggestedPrice - totalCost),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

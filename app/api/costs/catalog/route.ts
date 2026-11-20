import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { COST_AMBITI, COST_CATEGORIES, COST_TIPI } from "@/lib/cost-catalog";

export async function GET() {
  const guard = await requireFeature("vehicle_costs");
  if (guard.error) return guard.error;
  return NextResponse.json({
    ambiti: COST_AMBITI,
    tipi: COST_TIPI,
    categorie: COST_CATEGORIES,
  });
}

import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { getBenchmark } from "@/lib/benchmark";

export async function GET(req: Request) {
  const guard = await requireFeature("analytics");
  if (guard.error) return guard.error;

  const months = Number(new URL(req.url).searchParams.get("months") ?? 12);
  const periodMonths = Number.isFinite(months) && months >= 1 && months <= 36 ? Math.round(months) : 12;
  const benchmark = await getBenchmark(guard.session.user.companyId, periodMonths);
  return NextResponse.json({ benchmark });
}

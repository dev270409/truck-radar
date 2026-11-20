import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { listTankMovements } from "@/lib/ops";

export async function GET() {
  const guard = await requireFeature("fuel");
  if (guard.error) return guard.error;
  const items = await listTankMovements(guard.session.user.companyId);
  return NextResponse.json({ items });
}

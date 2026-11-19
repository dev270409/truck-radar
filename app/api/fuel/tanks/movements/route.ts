import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { listTankMovements } from "@/lib/ops";

export async function GET() {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const items = await listTankMovements(guard.session.user.companyId);
  return NextResponse.json({ items });
}

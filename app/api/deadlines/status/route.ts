import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { DEADLINE_TYPES } from "@/lib/deadline-catalog";
import { getDeadlineAlertStatus } from "@/lib/deadline-settings";

export async function GET() {
  const guard = await requireFeature("deadlines");
  if (guard.error) return guard.error;
  const status = await getDeadlineAlertStatus(guard.session.user.companyId);
  return NextResponse.json({
    ...status,
    catalog: DEADLINE_TYPES,
    canEdit: guard.session.user.role === "ADMIN",
  });
}

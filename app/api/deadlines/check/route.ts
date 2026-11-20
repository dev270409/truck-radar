import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { getDeadlineAlertStatus } from "@/lib/deadline-settings";
import { runDeadlineAlerts } from "@/lib/deadline-alerts";

export async function POST() {
  const guard = await requireFeature("deadlines");
  if (guard.error) return guard.error;
  if (guard.session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Operazione riservata all'amministratore." }, { status: 403 });
  }
  const result = await runDeadlineAlerts(guard.session.user.companyId);
  const status = await getDeadlineAlertStatus(guard.session.user.companyId);
  return NextResponse.json({ result, status });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeDeadlineSettings } from "@/lib/deadline-settings";
import { runDeadlineAlerts } from "@/lib/deadline-alerts";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = req.headers.get("authorization");
  const querySecret = new URL(req.url).searchParams.get("secret");
  const authorized =
    Boolean(secret) &&
    (authorization === `Bearer ${secret}` || querySecret === secret);
  if (!authorized) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const companies = await db.company.findMany({
    select: { id: true, deadlineSettings: true },
    take: 100,
  });
  const results: Array<{ companyId: string; queued: number; processed: number }> = [];
  for (const company of companies) {
    const settings = normalizeDeadlineSettings(company.deadlineSettings);
    if (!settings.alertsEnabled || settings.alertEmails.length === 0) continue;
    const result = await runDeadlineAlerts(company.id);
    results.push({ companyId: company.id, queued: result.queued, processed: result.processed });
  }
  return NextResponse.json({ ok: true, companies: results });
}

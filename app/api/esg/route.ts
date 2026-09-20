import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEsgReport } from "@/lib/esg";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Area riservata a ufficio/admin." }, { status: 403 });
  }

  const url = new URL(req.url);
  const granularity = url.searchParams.get("granularity") === "anno" ? "anno" : "mese";

  const now = new Date();
  const from = url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : new Date(now.getUTCFullYear(), now.getUTCMonth() - 11, 1);
  const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : now;

  const report = await getEsgReport(session.user.companyId, from, to, granularity);
  return NextResponse.json({ report });
}
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  const companyId = session?.user?.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const rows = await db.$queryRawUnsafe(
      `SELECT
         date_trunc('month', l.date)::date AS month,
         COALESCE(SUM(l.amount), 0)::float8 AS revenue,
         COUNT(l.id)::int AS trips
       FROM "TripStatementLine" l
       WHERE l."companyId" = $1
       GROUP BY date_trunc('month', l.date)
       ORDER BY month`,
      companyId
    );

    const months = (rows as Array<{ month: string; revenue: number; trips: number }>).map((row) => ({
      label: new Date(row.month).toLocaleDateString("it-IT", { month: "short" }),
      value: Math.round(Number(row.revenue)),
      trips: Number(row.trips),
    }));

    return NextResponse.json({ months });
  } catch {
    return NextResponse.json({ months: [] });
  }
}

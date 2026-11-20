import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { db } from "@/lib/db";

interface FuelRow {
  id: string;
  vehicleId: string;
  litri: number;
  costo: number;
  odometerKm: number;
  createdAt: Date;
  targa?: string;
}

export async function GET(req: Request) {
  const guard = await requireFeature("fuel");
  if (guard.error) return guard.error;
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year + 1, 0, 1));

  const rows = (await db.$queryRawUnsafe(
    `SELECT f.*, v.targa
     FROM "FuelLog" f
     LEFT JOIN "Vehicle" v ON v.id = f."vehicleId"
     WHERE f."companyId" = $1 AND f."createdAt" >= $2 AND f."createdAt" < $3
     ORDER BY f."createdAt" ASC`,
    guard.session.user.companyId,
    from,
    to
  )) as FuelRow[];

  const quarters = [1, 2, 3, 4].map((q) => {
    const startMonth = (q - 1) * 3;
    const qStart = new Date(Date.UTC(year, startMonth, 1));
    const qEnd = new Date(Date.UTC(year, startMonth + 3, 1));
    const qRows = rows.filter((r) => {
      const d = new Date(r.createdAt);
      return d >= qStart && d < qEnd;
    });
    const litri = qRows.reduce((s, r) => s + Number(r.litri), 0);
    const costo = qRows.reduce((s, r) => s + Number(r.costo), 0);
    return {
      trimestre: `T${q}`,
      litri: round2(litri),
      costo: round2(costo),
      prezzoMedio: litri > 0 ? round2(costo / litri) : null,
      rifornimenti: qRows.length,
    };
  });

  return NextResponse.json({
    year,
    totaleLitri: round2(quarters.reduce((s, q) => s + q.litri, 0)),
    totaleCosto: round2(quarters.reduce((s, q) => s + q.costo, 0)),
    quarters,
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

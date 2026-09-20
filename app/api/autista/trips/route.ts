import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role !== "AUTISTA") {
    return NextResponse.json(
      { error: "Portale riservato agli autisti." },
      { status: 403 }
    );
  }

  const tenantDb = getTenantDb(session.user.companyId);
  const trips = await tenantDb.trips.findMany({
    where: { driverId: session.user.id },
    include: {
      vehicle: { select: { id: true, targa: true, categoria: true } },
    },
    orderBy: { dataRitiro: "asc" },
  });

  return NextResponse.json({ trips });
}
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const tenantDb = getTenantDb(session.user.companyId);
  const vehicles = await tenantDb.vehicles.findMany({
    include: {
      documents: true,
      drivers: { select: { id: true, nome: true, cognome: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ vehicles });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { targa, categoria, portataMaxKg, volumeMaxM3, status } = body;

    if (!targa || !categoria || !portataMaxKg || !volumeMaxM3) {
      return NextResponse.json(
        { error: "Tutti i campi del veicolo sono obbligatori." },
        { status: 400 }
      );
    }

    const tenantDb = getTenantDb(session.user.companyId);
    const vehicle = await tenantDb.vehicles.create({
      data: {
        targa: targa.toUpperCase().trim(),
        categoria,
        portataMaxKg: parseFloat(portataMaxKg),
        volumeMaxM3: parseFloat(volumeMaxM3),
        status: status || "DISPONIBILE",
      },
    });

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

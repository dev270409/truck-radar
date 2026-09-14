import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = params;
  const tenantDb = getTenantDb(session.user.companyId);

  // STRICT MULTI-TENANCY FILTER: where clause incorporates both vehicle id AND companyId
  const vehicle = await tenantDb.vehicles.findFirst({
    where: {
      id,
      companyId: session.user.companyId,
    },
    include: {
      documents: true,
      drivers: { select: { id: true, nome: true, cognome: true, email: true } },
    },
  });

  if (!vehicle) {
    return NextResponse.json(
      { error: "Veicolo non trovato o non appartenente alla tua azienda (404/403)." },
      { status: 404 }
    );
  }

  return NextResponse.json({ vehicle });
}

import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/tenant";
import { getPlanLimits } from "@/lib/plans";
import { requireFeature } from "@/lib/api-guard";

export async function GET() {
  const guard = await requireFeature("vehicles");
  if (guard.error) return guard.error;
  const session = guard.session;

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
  const guard = await requireFeature("vehicles");
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const body = await req.json();
    const { targa, categoria, portataMaxKg, volumeMaxM3, status } = body;

    if (typeof targa !== "string" || !targa.trim() || !categoria || !portataMaxKg || !volumeMaxM3) {
      return NextResponse.json(
        { error: "Tutti i campi del veicolo sono obbligatori." },
        { status: 400 }
      );
    }

    const portata = Number(portataMaxKg);
    const volume = Number(volumeMaxM3);
    const validCategory = ["FRIGO", "TELONATO", "SPONDA_IDRAULICA", "CISTERNA", "ADR"].includes(String(categoria));
    const validStatus = ["DISPONIBILE", "IN_VIAGGIO", "IN_MANUTENZIONE", "NON_IDONEO"].includes(String(status || "DISPONIBILE"));
    if (!validCategory || !validStatus || !Number.isFinite(portata) || portata <= 0 || !Number.isFinite(volume) || volume <= 0) {
      return NextResponse.json({ error: "Categoria, stato, portata o volume non validi." }, { status: 400 });
    }

    const tenantDb = getTenantDb(session.user.companyId);

    const normalizedPlate = String(targa).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const samePlate = await tenantDb.vehicles.findMany({ select: { id: true, targa: true } });
    if (samePlate.some((vehicle) => vehicle.targa.toUpperCase().replace(/[^A-Z0-9]/g, "") === normalizedPlate)) {
      return NextResponse.json(
        { error: "Questa targa è già presente nella flotta. Collega il dispositivo Geotab alla targa esistente invece di creare un duplicato." },
        { status: 409 }
      );
    }

    const company = await tenantDb.getCompany();
    const limit = getPlanLimits(company?.subscriptionPlan).vehicleLimit;
    const currentCount = await tenantDb.vehicles.findMany({ select: { id: true } });
    if (currentCount.length >= limit) {
      return NextResponse.json(
        {
          error: `Limite piano raggiunto: il tuo piano consente massimo ${limit} mezzi. Abbonati a un piano superiore per gestire flotte più grandi.`,
        },
        { status: 403 }
      );
    }

    const vehicle = await tenantDb.vehicles.create({
      data: {
        targa: targa.toUpperCase().trim(),
        categoria,
        portataMaxKg: portata,
        volumeMaxM3: volume,
        status: status || "DISPONIBILE",
      },
    });

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore del server" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLicenseState } from "@/lib/license";

/**
 * Stato della licenza self-hosted (solo ADMIN).
 * La licenza è impostata via variabile d'ambiente `TRUCK_RADAR_LICENSE`:
 * questa route è di sola lettura e non espone mai la license key completa.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accesso riservato agli amministratori." }, { status: 403 });
  }

  const state = getLicenseState();

  return NextResponse.json({
    selfHosted: state.selfHosted,
    configured: state.configured,
    valid: state.valid,
    reason: state.reason ?? null,
    licensee: state.payload?.licensee ?? null,
    plan: state.payload?.plan ?? null,
    vehicleLimit: state.payload?.vehicleLimit ?? null,
    driverLimit: state.payload?.driverLimit ?? null,
    issuedAt: state.payload?.issuedAt ?? null,
    expiresAt: state.payload?.expiresAt ?? null,
    features: state.payload?.features ?? [],
  });
}

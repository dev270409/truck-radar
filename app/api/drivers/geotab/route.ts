import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { rateLimit } from "@/lib/rate-limit";
import { confirmGeotabDrivers, listGeotabDrivers } from "@/lib/geotab-drivers";

export async function GET() {
  const guard = await requireFeature("users");
  if (guard.error) return guard.error;
  if (guard.session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Operazione riservata all'amministratore." }, { status: 403 });
  }

  const items = await listGeotabDrivers(guard.session.user.companyId);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const guard = await requireFeature("users");
  if (guard.error) return guard.error;
  if (guard.session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Operazione riservata all'amministratore." }, { status: 403 });
  }

  const limit = rateLimit(`geotab-drivers:${guard.session.user.id}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Troppi tentativi. Riprova tra poco." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const driverIds = Array.isArray(body.driverIds)
    ? body.driverIds.filter((id): id is string => typeof id === "string")
    : [];
  if (driverIds.length === 0) {
    return NextResponse.json({ error: "Seleziona almeno un autista Geotab." }, { status: 400 });
  }

  const result = await confirmGeotabDrivers(
    guard.session.user.companyId,
    guard.session.user.id,
    driverIds
  );
  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { getTenantDb } from "@/lib/tenant";
import { createTripPod, listTripPods } from "@/lib/ops";
import { optionalHttpUrl } from "@/lib/url-safety";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const { id } = await params;
  const tenantDb = getTenantDb(guard.session.user.companyId);
  const trip =
    guard.session.user.role === "AUTISTA"
      ? await tenantDb.trips.findFirst({ where: { id, driverId: guard.session.user.id } })
      : await tenantDb.trips.findFirst({ where: { id } });
  if (!trip) return NextResponse.json({ error: "Viaggio non trovato o non accessibile." }, { status: 404 });
  const items = await listTripPods(guard.session.user.companyId, id);
  return NextResponse.json({ items });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const { id } = await params;
  const tenantDb = getTenantDb(guard.session.user.companyId);
  const trip =
    guard.session.user.role === "AUTISTA"
      ? await tenantDb.trips.findFirst({ where: { id, driverId: guard.session.user.id } })
      : await tenantDb.trips.findFirst({ where: { id } });
  if (!trip) return NextResponse.json({ error: "Viaggio non trovato o non accessibile." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }
  const tipo = String(body.tipo ?? "").toUpperCase();
  if (!["FOTO", "FIRMA", "DOCUMENTO"].includes(tipo)) {
    return NextResponse.json({ error: "Tipo POD non valido (FOTO/FIRMA/DOCUMENTO)." }, { status: 400 });
  }
  const fileUrl = body.fileUrl ? String(body.fileUrl) : null;
  const firmaData = body.firmaData ? String(body.firmaData) : null;
  if (!fileUrl && !firmaData) {
    return NextResponse.json({ error: "Allegare una foto, un file o una firma." }, { status: 400 });
  }
  if (firmaData && !firmaData.startsWith("data:image/")) {
    return NextResponse.json({ error: "Firma non valida." }, { status: 400 });
  }
  if (firmaData && firmaData.length > 2_500_000) {
    return NextResponse.json({ error: "Firma troppo grande." }, { status: 400 });
  }
  if (fileUrl && !optionalHttpUrl(fileUrl)) {
    return NextResponse.json({ error: "Allegato non valido." }, { status: 400 });
  }
  const item = await createTripPod(guard.session.user.companyId, guard.session.user.id, {
    tripId: id,
    tipo,
    fileUrl: optionalHttpUrl(fileUrl),
    firmaData,
    note: body.note ? String(body.note) : null,
  });
  return NextResponse.json({ item }, { status: 201 });
}

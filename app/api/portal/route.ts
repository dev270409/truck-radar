import { NextResponse } from "next/server";
import { requireAdmin, requireSession } from "@/lib/api-guard";
import { ensurePortal, getPortal, updatePortal } from "@/lib/ops";

export async function GET() {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const portal = await getPortal(guard.session.user.companyId);
  return NextResponse.json({ portal });
}

export async function POST(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const adminError = requireAdmin(guard.session.user.role);
  if (adminError) return adminError;
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const portal = await ensurePortal(
    guard.session.user.companyId,
    guard.session.user.id,
    body.brandName ? String(body.brandName) : null,
    body.brandColor ? String(body.brandColor) : null
  );
  return NextResponse.json({ portal }, { status: 201 });
}

export async function PATCH(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const adminError = requireAdmin(guard.session.user.role);
  if (adminError) return adminError;
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const portal = await updatePortal(guard.session.user.companyId, {
    enabled: body.enabled === undefined ? undefined : Boolean(body.enabled),
    brandName: body.brandName === undefined ? undefined : body.brandName ? String(body.brandName) : null,
    brandColor: body.brandColor === undefined ? undefined : body.brandColor ? String(body.brandColor) : null,
  });
  if (!portal) return NextResponse.json({ error: "Portale non trovato. Attivalo prima." }, { status: 404 });
  return NextResponse.json({ portal });
}

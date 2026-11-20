import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireFeature } from "@/lib/api-guard";
import { resolvePermissions, sanitizePermissions } from "@/lib/permissions";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireFeature("users");
  if (guard.error) return guard.error;
  const session = guard.session;
  const { id } = await context.params;

  const user = await db.user.findFirst({
    where: { id, companyId: session.user.companyId },
    select: { id: true, role: true, email: true, permissions: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Utente non trovato." }, { status: 404 });
  }
  if (user.role === "ADMIN") {
    return NextResponse.json(
      { error: "I permessi dell'amministratore sono sempre completi." },
      { status: 400 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const permissions = sanitizePermissions(body.permissions);
  const updated = await db.user.update({
    where: { id: user.id },
    data: { permissions },
    select: { id: true, role: true, permissions: true },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: session.user.companyId,
      action: "USER_PERMISSIONS_UPDATED",
      entity: "User",
      entityId: user.id,
      payload: { email: user.email, permissions },
    },
  });

  return NextResponse.json({
    user: {
      ...updated,
      permissions: resolvePermissions(updated.role, updated.permissions),
    },
  });
}

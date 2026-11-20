import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireAdmin, requireFeature } from "@/lib/api-guard";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/hash";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireFeature("users");
  if (guard.error) return guard.error;
  const adminError = requireAdmin(guard.session.user.role);
  if (adminError) return adminError;

  const { id } = await params;
  const target = await db.user.findFirst({
    where: { id, companyId: guard.session.user.companyId },
    select: { id: true, email: true, nome: true, cognome: true },
  });
  if (!target) return NextResponse.json({ error: "Utente non trovato." }, { status: 404 });

  const tempPassword = `TR-${crypto.randomBytes(9).toString("base64url")}!`;
  const passwordHash = await hashPassword(tempPassword);

  await db.user.update({
    where: { id: target.id },
    data: { passwordHash, isActive: true },
  });

  await db.auditLog.create({
    data: {
      userId: guard.session.user.id,
      companyId: guard.session.user.companyId,
      action: "USER_PASSWORD_RESET",
      entity: "User",
      entityId: target.id,
      payload: { email: target.email, by: guard.session.user.role },
    },
  });

  return NextResponse.json({ email: target.email, nome: target.nome, cognome: target.cognome, tempPassword });
}

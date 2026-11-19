import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { db } from "@/lib/db";
import { comparePassword, hashPassword } from "@/lib/hash";

export async function POST(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Inserisci la password attuale e la nuova password." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "La nuova password deve avere almeno 8 caratteri." }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: "La nuova password deve essere diversa da quella attuale." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: guard.session.user.id },
    select: { id: true, passwordHash: true },
  });
  if (!user) return NextResponse.json({ error: "Utente non trovato." }, { status: 404 });

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "La password attuale non è corretta." }, { status: 400 });

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  await db.auditLog.create({
    data: {
      userId: guard.session.user.id,
      companyId: guard.session.user.companyId,
      action: "USER_PASSWORD_CHANGED",
      entity: "User",
      entityId: user.id,
    },
  });

  return NextResponse.json({ ok: true });
}

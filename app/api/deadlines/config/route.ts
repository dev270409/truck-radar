import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireFeature } from "@/lib/api-guard";
import { DEADLINE_TYPES } from "@/lib/deadline-catalog";
import {
  getDeadlineSettings,
  normalizeDeadlineSettings,
  saveDeadlineSettings,
} from "@/lib/deadline-settings";

export async function GET() {
  const guard = await requireFeature("deadlines");
  if (guard.error) return guard.error;
  const settings = await getDeadlineSettings(guard.session.user.companyId);
  return NextResponse.json({
    settings,
    catalog: DEADLINE_TYPES,
    canEdit: guard.session.user.role === "ADMIN",
  });
}

export async function PUT(req: Request) {
  const guard = await requireFeature("deadlines");
  if (guard.error) return guard.error;
  if (guard.session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo l'amministratore può modificare la configurazione degli avvisi." },
      { status: 403 }
    );
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }
  const settings = normalizeDeadlineSettings(body.settings ?? body);
  const saved = await saveDeadlineSettings(guard.session.user.companyId, settings);
  await db.auditLog.create({
    data: {
      userId: guard.session.user.id,
      companyId: guard.session.user.companyId,
      action: "DEADLINE_SETTINGS_UPDATED",
      entity: "Company",
      entityId: guard.session.user.companyId,
      payload: saved as unknown as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json({ settings: saved });
}

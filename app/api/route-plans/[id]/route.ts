import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { deleteRoutePlan } from "@/lib/ops";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireFeature("routes");
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }
  const { id } = await params;
  const ok = await deleteRoutePlan(guard.session.user.companyId, id);
  if (!ok) return NextResponse.json({ error: "Giro non trovato." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

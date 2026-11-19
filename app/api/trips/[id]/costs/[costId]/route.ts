import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { deleteTripCost } from "@/lib/trip-costs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; costId: string }> }
) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  const { id, costId } = await params;
  const ok = await deleteTripCost(guard.session.user.companyId, id, costId);
  if (!ok) return NextResponse.json({ error: "Costo non trovato." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

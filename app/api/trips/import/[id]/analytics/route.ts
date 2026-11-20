import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { analyzeTripStatement } from "@/lib/trip-analytics";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireFeature("trips");
  if (guard.error) return guard.error;
  if (guard.session.user.role !== "ADMIN" && guard.session.user.role !== "UFFICIO") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  const { id } = await params;
  const analytics = await analyzeTripStatement(guard.session.user.companyId, id);
  if (!analytics) {
    return NextResponse.json({ error: "Rendiconto non trovato." }, { status: 404 });
  }
  return NextResponse.json({ analytics });
}

import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { deleteCustomerAddress } from "@/lib/ops";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  const guard = await requireFeature("clients");
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  const { id, addressId } = await params;
  const deleted = await deleteCustomerAddress(guard.session.user.companyId, id, addressId);
  if (!deleted) {
    return NextResponse.json({ error: "Indirizzo non trovato." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

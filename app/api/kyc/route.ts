import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "UFFICIO") {
    return NextResponse.json(
      { error: "Solo l'Admin (o Ufficio) può gestire i documenti KYC." },
      { status: 403 }
    );
  }

  const tenantDb = getTenantDb(session.user.companyId);
  const documents = await tenantDb.kycDocuments.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ documents });
}
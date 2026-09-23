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

  // KYB Zero-Form: ultima estrazione AI per l'azienda
  const kybRows = (await tenantDb.$queryRawUnsafe(
    `SELECT id, "companyId", provider, mode, extraction, verification, "createdAt"
     FROM "KybExtraction" WHERE "companyId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
    session.user.companyId
  )) as Array<{
    id: string;
    companyId: string;
    provider: string;
    mode: string;
    extraction: any;
    verification: any;
    createdAt: string;
  }>;
  const kyb = kybRows[0] ?? null;

  return NextResponse.json({ documents, kyb });
}
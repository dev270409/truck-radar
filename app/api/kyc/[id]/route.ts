import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getTenantDb } from "@/lib/tenant";
import type { KycStatus } from "@prisma/client";

const VALID_STATUSES: KycStatus[] = ["VERIFICATO", "RIFIUTATO"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Accesso negato: solo l'amministratore può eseguire la verifica KYC." },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const status = String(body.status ?? "").toUpperCase();

    if (!VALID_STATUSES.includes(status as KycStatus)) {
      return NextResponse.json(
        { error: "Stato non valido. Attesi VERIFICATO (approvato) o RIFIUTATO." },
        { status: 400 }
      );
    }

    const tenantDb = getTenantDb(session.user.companyId);
    const document = await tenantDb.kycDocuments.findFirst({
      where: { id, companyId: session.user.companyId },
    });

    if (!document) {
      return NextResponse.json({ error: "Documento KYC non trovato." }, { status: 404 });
    }
    if (document.status !== "IN_ATTESA") {
      return NextResponse.json(
        { error: "Il documento è già stato verificato (o rifiutato)." },
        { status: 400 }
      );
    }

    let subscriptionActivated = false;

    await db.$transaction(
      async (tx) => {
        await tx.kycDocument.update({
          where: { id: document.id },
          data: {
            status: status as KycStatus,
            verifiedBy: session.user.id,
            verifiedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            companyId: session.user.companyId,
            action: `KYC_${status}`,
            entity: "KycDocument",
            entityId: document.id,
            payload: { tipo: document.tipo },
          },
        });

        const remaining = await tx.kycDocument.count({
          where: { companyId: session.user.companyId, status: "IN_ATTESA" },
        });

        if (remaining === 0) {
          const company = await tx.company.findUnique({
            where: { id: session.user.companyId },
            select: { subscriptionStatus: true },
          });
          if (company && company.subscriptionStatus === "TRIAL") {
            await tx.company.update({
              where: { id: session.user.companyId },
              data: { subscriptionStatus: "ACTIVE" },
            });
            await tx.auditLog.create({
              data: {
                userId: session.user.id,
                companyId: session.user.companyId,
                action: "KYC_APPROVED_ALL",
                entity: "Company",
                entityId: session.user.companyId,
                payload: { note: "Tutti i documenti KYC verificati: piano attivato" },
              },
            });
            subscriptionActivated = true;
          }
        }
      },
      { timeout: 30000 }
    );

    return NextResponse.json({
      document: { id: document.id, status, verifiedAt: new Date() },
      subscriptionActivated,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
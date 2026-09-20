import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getTenantDb } from "@/lib/tenant";

export async function POST() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Accesso negato: solo l'amministratore può riconciliare il pool." },
      { status: 403 }
    );
  }

  const companyId = session.user.companyId;

  try {
    let commissionRate = await db.commissionRate.findFirst({ where: { isActive: true } });
    if (!commissionRate) {
      commissionRate = await db.commissionRate.create({
        data: { planType: "BASE", percentage: 2.5, description: "Commissione standard piattaforma" },
      });
    }

    const tenantDb = getTenantDb(companyId);
    const completed = await tenantDb.trips.findMany({
      where: { status: "COMPLETATO", prezzo: { gt: 0 } },
      select: { id: true, luogoRitiro: true, luogoConsegna: true, prezzo: true },
    });

    const existing = await db.transaction.findMany({
      where: { companyId, type: "ESCROW" },
      select: { tripId: true },
    });
    const existingTripIds = new Set(
      existing.map((t) => t.tripId).filter((id): id is string => Boolean(id))
    );

    const toReconcile = completed.filter((t) => !existingTripIds.has(t.id));

    let escrowCount = 0;
    let escrowAmount = 0;

    for (const trip of toReconcile) {
      const prezzo = trip.prezzo ?? 0;
      const commission = (prezzo * commissionRate.percentage) / 100;
      await db.$transaction(
        async (tx) => {
          await tx.transaction.create({
            data: {
              companyId,
              tripId: trip.id,
              amount: prezzo,
              currency: "eur",
              type: "ESCROW",
              status: "COMPLETED",
            },
          });
          await tx.transaction.create({
            data: {
              companyId,
              tripId: trip.id,
              amount: commission,
              currency: "eur",
              type: "COMMISSION",
              status: "COMPLETED",
            },
          });
          await tx.escrowPayment.create({
            data: {
              tripId: trip.id,
              payerCompanyId: companyId,
              payeeCompanyId: companyId,
              amount: prezzo,
              platformFee: commission,
              netAmount: prezzo - commission,
              status: "RELEASED",
              releasedAt: new Date(),
            },
          });
        },
        { timeout: 30000 }
      );
      escrowCount += 1;
      escrowAmount += prezzo;
    }

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        companyId,
        action: "POOL_RECONCILED",
        entity: "EscrowPayment",
        entityId: String(escrowCount),
        payload: { trips: escrowCount, amount: escrowAmount, rate: commissionRate.percentage },
      },
    });

    return NextResponse.json({
      reconciled: escrowCount,
      amount: escrowAmount,
      rate: commissionRate.percentage,
      skipped: completed.length - escrowCount,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
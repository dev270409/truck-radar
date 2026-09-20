import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { PayoutStatus } from "@prisma/client";

const TRANSITIONS: Record<PayoutStatus, PayoutStatus[]> = {
  PENDING: ["PROCESSING", "FAILED"],
  PROCESSING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
};

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
      { error: "Accesso negato: solo l'amministratore può aggiornare un prelievo." },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const status = String(body.status ?? "").toUpperCase() as PayoutStatus;

    if (!["PENDING", "PROCESSING", "COMPLETED", "FAILED"].includes(status)) {
      return NextResponse.json({ error: "Stato prelievo non valido." }, { status: 400 });
    }

    const payout = await db.payoutRequest.findFirst({
      where: { id, companyId: session.user.companyId },
    });
    if (!payout) {
      return NextResponse.json({ error: "Richiesta di prelievo non trovata." }, { status: 404 });
    }
    if (!TRANSITIONS[payout.status].includes(status)) {
      return NextResponse.json(
        { error: `Transizione non consentita: ${payout.status} → ${status}.` },
        { status: 400 }
      );
    }

    await db.$transaction(
      async (tx) => {
        await tx.payoutRequest.update({
          where: { id: payout.id },
          data: { status },
        });
        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            companyId: session.user.companyId,
            action: `PAYOUT_${status}`,
            entity: "PayoutRequest",
            entityId: payout.id,
            payload: { amount: payout.amount },
          },
        });
      },
      { timeout: 30000 }
    );

    return NextResponse.json({ payout: { id: payout.id, status } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
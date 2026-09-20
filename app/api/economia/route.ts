import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Transaction, PayoutRequest } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "UFFICIO") {
    return NextResponse.json(
      { error: "Solo l'Admin (o Ufficio) può consultare la gestione economica." },
      { status: 403 }
    );
  }

  const companyId = session.user.companyId;

  const [transactions, payoutRequests, commissionRate] = await Promise.all([
    db.transaction.findMany({
      where: { companyId },
      include: {
        trip: { select: { luogoRitiro: true, luogoConsegna: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.payoutRequest.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
    db.commissionRate.findFirst({ where: { isActive: true } }),
  ]);

  const rate = commissionRate?.percentage ?? 2.5;

  const incassato = transactions
    .filter((t: Transaction) => t.type === "ESCROW")
    .reduce((s, t) => s + t.amount, 0);
  const commissioni = transactions
    .filter((t: Transaction) => t.type === "COMMISSION")
    .reduce((s, t) => s + t.amount, 0);
  const richieste = payoutRequests.reduce((s, p: PayoutRequest) => s + p.amount, 0);
  const prelevato = payoutRequests
    .filter((p: PayoutRequest) => p.status === "COMPLETED")
    .reduce((s, p) => s + p.amount, 0);

  const saldo = incassato - richieste;
  const inElaborazione = payoutRequests
    .filter((p: PayoutRequest) => p.status === "PENDING" || p.status === "PROCESSING")
    .reduce((s, p) => s + p.amount, 0);

  return NextResponse.json({
    rate,
    saldo,
    incassato,
    commissioni,
    prelevato,
    inElaborazione,
    transactions,
    payoutRequests,
    companyId,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Accesso negato: solo l'amministratore può richiedere un prelievo." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const amountRaw = parseFloat(body.amount);

    if (!amountRaw || isNaN(amountRaw) || amountRaw <= 0) {
      return NextResponse.json(
        { error: "Importo del prelievo non valido." },
        { status: 400 }
      );
    }

    const companyId = session.user.companyId;

    const [transactions, payoutRequests] = await Promise.all([
      db.transaction.findMany({
        where: { companyId, type: "ESCROW" },
        select: { amount: true },
      }),
      db.payoutRequest.findMany({
        where: { companyId },
        select: { amount: true },
      }),
    ]);

    const incassato = transactions.reduce((s, t) => s + t.amount, 0);
    const richieste = payoutRequests.reduce((s, p) => s + p.amount, 0);
    const saldo = incassato - richieste;

    if (amountRaw > saldo + 0.001) {
      return NextResponse.json(
        { error: `Il saldo disponibile è di ${saldo.toFixed(2)} €: richiedi un importo inferiore.` },
        { status: 400 }
      );
    }

    const payout = await db.payoutRequest.create({
      data: {
        companyId,
        amount: amountRaw,
        status: "PENDING",
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        companyId,
        action: "PAYOUT_REQUESTED",
        entity: "PayoutRequest",
        entityId: payout.id,
        payload: { amount: amountRaw },
      },
    });

    return NextResponse.json({ payout }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
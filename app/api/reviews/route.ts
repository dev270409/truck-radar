import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  publishDueReviews,
  listReviews,
  getTripParticipants,
  createReview,
  reputationOf,
  type ReviewRow,
} from "@/lib/reviews";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const url = new URL(req.url);
  const tripId = String(url.searchParams.get("tripId") ?? "").trim() || null;
  const companyId = String(url.searchParams.get("companyId") ?? "").trim() || null;

  await publishDueReviews();

  // Reputazione su un'azienda specifica (profilo network T17)
  if (companyId) {
    const about = await listReviews({ reviewedCompanyId: companyId, onlyPublished: true });
    const names = await companyNames(new Set(about.map((r) => r.reviewerCompanyId)));
    const rep = await reputationOf(companyId);
    return NextResponse.json({
      reputazione: rep,
      recensioni: about.map((r) => annotate(r, names)),
    });
  }

  if (tripId) {
    const visible = await listReviews({ tripId, onlyPublished: true });
    const names = await companyNames(new Set(visible.map((r) => r.reviewerCompanyId)));
    return NextResponse.json({ recensioni: visible.map((r) => annotate(r, names)) });
  }

  // Dashboard: reputazione mia + recensioni su di me + viaggi da valutare (subappaltati confermati)
  await publishDueReviews();
  const about = await listReviews({ reviewedCompanyId: session.user.companyId, onlyPublished: true });
  const names = await companyNames(new Set(about.map((r) => r.reviewerCompanyId)));
  const rep = await reputationOf(session.user.companyId);

  const confirmedSubs = await db.$queryRawUnsafe(
    `SELECT s."tripId", s."carrierCompanyId" FROM "Subcontract" s
     WHERE s."parentCompanyId" = $1 AND s."status" = 'CONFERMATO'
     UNION
     SELECT s."tripId", s."parentCompanyId" FROM "Subcontract" s
     WHERE s."carrierCompanyId" = $1 AND s."status" = 'CONFERMATO'`,
    session.user.companyId
  );

  const pending: Array<{ tripId: string; counterCompanyId: string; role: string; done: boolean }> = [];
  const tripIds = (confirmedSubs as Array<{ tripId: string; carrierCompanyId: string }>).map((r) => r.tripId);
  const trips = await db.trip.findMany({
    where: { id: { in: tripIds } },
    select: { id: true, luogoRitiro: true, luogoConsegna: true, dataRitiro: true },
  });
  const tripMap = new Map(trips.map((t) => [t.id, t]));

  for (const sub of confirmedSubs as Array<{ tripId: string; carrierCompanyId: string }>) {
    const participants = await getTripParticipants(sub.tripId);
    if (!participants) continue;
    let counterCompanyId: string;
    let role: string;
    if (participants.parentCompanyId === session.user.companyId) {
      counterCompanyId = participants.carrierCompanyId;
      role = "COMMITTENTE";
    } else if (participants.carrierCompanyId === session.user.companyId) {
      counterCompanyId = participants.parentCompanyId;
      role = "VETTORE";
    } else {
      continue;
    }
    const existing = await listReviews({ tripId: sub.tripId });
    const done = existing.some((r) => r.reviewerCompanyId === session.user.companyId);
    const t = tripMap.get(sub.tripId);
    pending.push({
      tripId: sub.tripId,
      counterCompanyId,
      role,
      done,
      ...(t
        ? { route: `${t.luogoRitiro} → ${t.luogoConsegna}`, dataRitiro: t.dataRitiro.toISOString() }
        : {}),
    } as never);
  }

  return NextResponse.json({
    reputazione: rep,
    recensioni: about.map((r) => annotate(r, names)),
    daValutare: pending.filter((p) => !(p as { done: boolean }).done),
    precedentementeValutate: pending.filter((p) => (p as { done: boolean }).done),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  let body: { tripId?: unknown; rating?: unknown; comment?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo non valido." }, { status: 400 });
  }

  const tripId = String(body.tripId ?? "");
  const rating = Number(body.rating);
  const comment = body.comment ? String(body.comment).trim() : null;

  if (!tripId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({
      error: "tripId e rating (1-5) obbligatori.",
    }, { status: 400 });
  }

  const participants = await getTripParticipants(tripId);
  if (!participants) {
    return NextResponse.json({ error: "Recensione possibile solo dopo un subappalto confermato." }, { status: 400 });
  }

  let role: string;
  let reviewedCompanyId: string;
  if (participants.parentCompanyId === session.user.companyId) {
    role = "COMMITTENTE";
    reviewedCompanyId = participants.carrierCompanyId;
  } else if (participants.carrierCompanyId === session.user.companyId) {
    role = "VETTORE";
    reviewedCompanyId = participants.parentCompanyId;
  } else {
    return NextResponse.json({ error: "Non sei parte di questo trasporto." }, { status: 403 });
  }

  const review = await createReview({
    tripId,
    reviewerCompanyId: session.user.companyId,
    reviewedCompanyId,
    role,
    rating,
    comment,
  });

  if (!review) {
    return NextResponse.json({ error: "Hai già recensito questo trasporto." }, { status: 409 });
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: session.user.companyId,
      action: "REVIEW_CREATA",
      entity: "Review",
      entityId: review.id,
      payload: { tripId, role, rating, blindUntil: "+7d" },
    },
  });

  return NextResponse.json({ review: { ...review, blind: true } }, { status: 201 });
}

async function companyNames(ids: Set<string>): Promise<Map<string, string>> {
  if (ids.size === 0) return new Map();
  const companies = await db.company.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, ragioneSociale: true },
  });
  return new Map(companies.map((c) => [c.id, c.ragioneSociale]));
}

function annotate(r: ReviewRow, names: Map<string, string>) {
  return {
    id: r.id,
    tripId: r.tripId,
    role: r.role,
    rating: r.rating,
    comment: r.comment,
    publishedAt: r.publishedAt,
    createdAt: r.createdAt,
    reviewerName: names.get(r.reviewerCompanyId) ?? "Azienda",
  };
}
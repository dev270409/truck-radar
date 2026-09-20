import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await params;
  const rows = (await db.$queryRawUnsafe(
    `DELETE FROM "Review"
     WHERE "id" = $1 AND "reviewerCompanyId" = $2 AND "publishedAt" IS NULL
     RETURNING "id"`,
    id,
    session.user.companyId
  )) as Array<{ id: string }>;

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Recensione non trovata, non tua o già pubblicata (blind scaduta)." },
      { status: 404 }
    );
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: session.user.companyId,
      action: "REVIEW_RITIRATA",
      entity: "Review",
      entityId: id,
    },
  });

  return NextResponse.json({ ok: true });
}
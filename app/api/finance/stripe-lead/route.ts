import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { safeLog } from "@/lib/safe-log";
import { rateLimit, rateLimitKeyFromRequest } from "@/lib/rate-limit";

/**
 * Segnala l'interesse di una company verificata verso l'incasso rapido
 * (embedded finance via Stripe Connect, roadmap futura). Non tocca fondi
 * e non eroga credito: raccoglie solo lead per l'attivazione graduale.
 */
export async function POST(req: Request) {
  const rl = rateLimit(rateLimitKeyFromRequest(req, "stripe-lead"), 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Troppe richieste." }, { status: 429 });
  }

  const session = await auth();
  const companyId = session?.user?.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "UFFICIO") {
    return NextResponse.json({ error: "Solo l'Admin (o Ufficio) può attivare l'interesse." }, { status: 403 });
  }

  try {
    const rows = (await db.$queryRawUnsafe(
      `INSERT INTO "StripeConnectLead" ("id", "companyId", "email", "status")
       SELECT gen_random_uuid(), $1, $2, 'INTERESSATA'
       WHERE NOT EXISTS (SELECT 1 FROM "StripeConnectLead" WHERE "companyId" = $1)
       RETURNING "id"`,
      companyId,
      session.user.email ?? ""
    )) as Array<{ id: string }>;

    if (rows.length === 0) {
      return NextResponse.json({ registered: false, already: true });
    }

    safeLog("info", "Lead incasso rapido registrata", { companyId });
    return NextResponse.json({ registered: true });
  } catch (err: any) {
    safeLog("error", "Registrazione lead incasso rapido fallita", { message: err.message });
    return NextResponse.json({ error: "Errore nella registrazione dell'interesse." }, { status: 500 });
  }
}
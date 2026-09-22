import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFleetMap } from "@/lib/fleet";
import { rateLimit, rateLimitKeyFromRequest } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const rl = rateLimit(rateLimitKeyFromRequest(req, "fleet-map"), 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra poco." }, { status: 429 });
  }

  try {
    const vehicles = await getFleetMap(session.user.companyId);
    return NextResponse.json({ vehicles });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
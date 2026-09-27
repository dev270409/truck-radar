import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeLog } from "@/lib/safe-log";
import { rateLimit, rateLimitKeyFromRequest } from "@/lib/rate-limit";

/**
 * POST /api/demo-request
 * Lead pubblica dal sito (pagina /contatti). Non richiede autenticazione:
 * raccoglie la richiesta di demo di un potenziale cliente e la persiste in
 * "DemoRequest" così nessun contatto va perso. Rate-limit stretto anti-spam.
 */
export async function POST(req: Request) {
  const rl = rateLimit(rateLimitKeyFromRequest(req, "demo-request"), 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Troppe richieste. Riprova tra qualche istante." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const nome = typeof body?.nome === "string" ? body.nome.trim().slice(0, 120) : "";
    const email = typeof body?.email === "string" ? body.email.trim().slice(0, 160) : "";
    const azienda = typeof body?.azienda === "string" ? body.azienda.trim().slice(0, 160) : null;
    const telefono = typeof body?.telefono === "string" ? body.telefono.trim().slice(0, 40) : null;
    const mezzi = typeof body?.mezzi === "string" ? body.mezzi.trim().slice(0, 40) : null;
    const messaggio = typeof body?.messaggio === "string" ? body.messaggio.trim().slice(0, 2000) : null;

    if (!nome || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Nome ed email valida sono obbligatori." }, { status: 400 });
    }

    await db.$executeRawUnsafe(
      `INSERT INTO "DemoRequest" ("id", "nome", "email", "azienda", "telefono", "mezzi", "messaggio", "status")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'NUOVA')`,
      nome,
      email,
      azienda,
      telefono,
      mezzi,
      messaggio
    );

    safeLog("info", "Richiesta demo ricevuta", { email });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    safeLog("error", "Richiesta demo fallita", { message: err?.message });
    return NextResponse.json({ error: "Errore nell'invio della richiesta. Riprova." }, { status: 500 });
  }
}
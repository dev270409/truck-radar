import { NextResponse } from "next/server";
import { analyzeKyb } from "@/lib/kyb";
import type { KybInputFile } from "@/lib/kyb/types";
import { rateLimit, rateLimitKeyFromRequest } from "@/lib/rate-limit";

const ALLOWED_TIPI = new Set([
  "VISURA",
  "DOCUMENTO_IDENTITA",
  "ALBO_AUTOTRASPORTATORI",
  "REN",
  "PARTITA_IVA",
  "DOCUMENTO_IDENTITA_LEGALE_RAPPRESENTANTE",
]);

/**
 * POST /api/kyb/analyze
 * Estrae i dati aziendali dai documenti caricati (KYB Zero-Form).
 * Body: { files: [{ tipo, fileUrl, fileName }], hints?: { ragioneSociale, partitaIva, nome, cognome } }
 * Ritorna: { provider, mode, extraction, verification }
 */
export async function POST(req: Request) {
  const rl = rateLimit(rateLimitKeyFromRequest(req, "kyb-analyze"), 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Troppe richieste. Riprova tra qualche istante." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const files = Array.isArray(body?.files) ? (body.files as KybInputFile[]) : [];
    if (files.length === 0) {
      return NextResponse.json({ error: "Nessun documento fornito per l'estrazione KYB." }, { status: 400 });
    }
    if (files.some((f) => !ALLOWED_TIPI.has(f.tipo) || !f.fileUrl)) {
      return NextResponse.json({ error: "Tipi documento non validi o URL mancante." }, { status: 400 });
    }
    if (body.files.some((f: KybInputFile) => !(f.fileUrl as string).startsWith("https://"))) {
      return NextResponse.json({ error: "URL documento non valido." }, { status: 400 });
    }

    const analysis = await analyzeKyb(files, {
      ragioneSociale: body?.hints?.ragioneSociale ?? null,
      partitaIva: body?.hints?.partitaIva ?? null,
      nome: body?.hints?.nome ?? null,
      cognome: body?.hints?.cognome ?? null,
    });

    return NextResponse.json({
      provider: analysis.provider,
      mode: analysis.mode,
      extraction: analysis.extraction,
      verification: analysis.verification,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Errore durante l'analisi KYB: " + (error?.message ?? "Errore del server") },
      { status: 500 }
    );
  }
}
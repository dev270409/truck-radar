import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { db } from "@/lib/db";
import { extractWithOcr, ocrConfigured, type OcrKind } from "@/lib/ocr";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  if (guard.session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }
  const rl = rateLimit(`ocr:${guard.session.user.companyId}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Troppe richieste OCR. Riprova tra un minuto." }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const kind = String(body.kind ?? "") as OcrKind;
  const file = String(body.file ?? "");
  if (kind !== "packing" && kind !== "libretto") {
    return NextResponse.json({ error: "Tipo OCR non valido (packing/libretto)." }, { status: 400 });
  }
  if (!file.startsWith("data:")) {
    return NextResponse.json({ error: "File non valido: atteso data URL base64." }, { status: 400 });
  }
  if (!ocrConfigured()) {
    return NextResponse.json(
      { error: "OCR non configurato: imposta GOOGLE_GENERATIVE_AI_API_KEY o OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  try {
    const result = await extractWithOcr(kind, file);
    if (!result) {
      return NextResponse.json({ error: "OCR non disponibile." }, { status: 503 });
    }
    let match: { id: string; targa: string } | null = null;
    if (kind === "libretto") {
      const targa = (result.data as { targa?: string | null }).targa;
      if (targa) {
        const rows = (await db.$queryRawUnsafe(
          `SELECT id, targa FROM "Vehicle" WHERE "companyId" = $1 AND upper(regexp_replace(targa, '[^A-Za-z0-9]', '', 'g')) = $2 LIMIT 1`,
          guard.session.user.companyId,
          targa
        )) as Array<{ id: string; targa: string }>;
        match = rows[0] ?? null;
      }
    }
    return NextResponse.json({ provider: result.provider, kind, data: result.data, match });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore OCR";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { isAllowedUploadUrl } from "@/lib/url-safety";
import { createTripStatement, listExistingStatementCodes } from "@/lib/trip-statements";
import { extractTripStatementText, parseTripStatement } from "@/lib/trip-statement";

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(req: Request) {
  const guard = await requireFeature("trips");
  if (guard.error) return guard.error;
  const session = guard.session;
  if (session.user.role !== "ADMIN" && session.user.role !== "UFFICIO") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  const limit = rateLimit(`trip-import:${session.user.id}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Troppi import ravvicinati. Attendi qualche minuto." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl : "";
  const fileName = typeof body.fileName === "string" ? body.fileName.slice(0, 255) : "rendiconto.pdf";
  if (!isAllowedUploadUrl(fileUrl)) {
    return NextResponse.json({ error: "File non valido: caricarlo di nuovo." }, { status: 400 });
  }
  if (!fileName.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Carica un PDF." }, { status: 400 });
  }

  let buffer: Uint8Array;
  try {
    const res = await fetch(fileUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("pdf") && !contentType.includes("octet-stream")) {
      throw new Error("Il file non sembra un PDF.");
    }
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "PDF troppo grande (max 15 MB)." }, { status: 400 });
    }
    buffer = new Uint8Array(arrayBuffer);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.includes("PDF")
            ? error.message
            : "Impossibile scaricare il PDF. Caricalo di nuovo.",
      },
      { status: 400 }
    );
  }

  let parsed;
  try {
    const text = await extractTripStatementText(buffer);
    parsed = parseTripStatement(text);
  } catch {
    return NextResponse.json(
      { error: "PDF non leggibile: verificare che non sia una scansione senza testo." },
      { status: 422 }
    );
  }

  if (parsed.lines.length === 0) {
    return NextResponse.json(
      { error: "Nessun viaggio riconosciuto. Il layout del rendiconto non è supportato." },
      { status: 422 }
    );
  }

  const statement = await createTripStatement(
    session.user.companyId,
    session.user.id,
    { fileName, fileUrl },
    parsed
  );
  const existing = await listExistingStatementCodes(
    session.user.companyId,
    parsed.lines.map((line) => line.code)
  );

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: session.user.companyId,
      action: "TRIP_STATEMENT_PARSED",
      entity: "TripStatement",
      entityId: statement.id,
      payload: {
        fileName,
        provider: parsed.provider,
        lines: parsed.lines.length,
        warnings: parsed.warnings.length,
      },
    },
  });

  return NextResponse.json({
    statement: {
      id: statement.id,
      fileName: statement.fileName,
      provider: statement.provider,
      periodStart: statement.periodStart,
      periodEnd: statement.periodEnd,
      declaredTrips: statement.declaredTrips,
      declaredDays: statement.declaredDays,
      declaredTotal: statement.declaredTotal,
      parsedTrips: statement.parsedTrips,
      parsedTotal: statement.parsedTotal,
    },
    lines: parsed.lines,
    duplicates: [...existing],
    warnings: parsed.warnings,
  });
}

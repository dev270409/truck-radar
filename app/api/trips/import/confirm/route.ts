import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { db } from "@/lib/db";
import {
  getTripStatement,
  importTripStatement,
  markTripStatementImported,
} from "@/lib/trip-statements";
import { autoMatchStatement } from "@/lib/trip-auto-match";

export async function POST(req: Request) {
  const guard = await requireFeature("trips");
  if (guard.error) return guard.error;
  const session = guard.session;
  if (session.user.role !== "ADMIN" && session.user.role !== "UFFICIO") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const statementId = typeof body.statementId === "string" ? body.statementId : "";
  if (!statementId) {
    return NextResponse.json({ error: "Rendiconto non indicato." }, { status: 400 });
  }

  const statement = await getTripStatement(session.user.companyId, statementId);
  if (!statement) {
    return NextResponse.json({ error: "Rendiconto non trovato." }, { status: 404 });
  }

  const allCodes = statement.payload.lines.map((line) => line.code);
  const requested = Array.isArray(body.codes)
    ? body.codes.filter((code): code is string => typeof code === "string")
    : allCodes;
  const codes = [...new Set(requested)].filter((code) => allCodes.includes(code));
  if (codes.length === 0) {
    return NextResponse.json({ error: "Nessun viaggio selezionato." }, { status: 400 });
  }

  const result = await importTripStatement(
    session.user.companyId,
    session.user.id,
    statement,
    codes
  );
  if (result.imported.length > 0) {
    await markTripStatementImported(
      session.user.companyId,
      statement.id,
      statement.importedTrips + result.imported.length
    );
  }

  let autoMatch = null;
  try {
    autoMatch = await autoMatchStatement(session.user.companyId, statement.id);
  } catch {
    autoMatch = null;
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: session.user.companyId,
      action: "TRIP_STATEMENT_IMPORTED",
      entity: "TripStatement",
      entityId: statement.id,
      payload: {
        requested: codes.length,
        imported: result.imported.length,
        skipped: result.skipped.length,
        autoMatched: autoMatch?.matchedVehicles ?? 0,
        autoMatchedDrivers: autoMatch?.matchedDrivers ?? 0,
      },
    },
  });

  return NextResponse.json({
    imported: result.imported.length,
    skipped: result.skipped,
    trips: result.imported,
    autoMatch,
  });
}

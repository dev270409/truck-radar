import fs from "node:fs";
import { UTApi } from "uploadthing/server";
import { db } from "../lib/db";
import { autoMatchStatement } from "../lib/trip-auto-match";
import { analyzeTripStatement } from "../lib/trip-analytics";
import { extractTripStatementText, parseTripStatement } from "../lib/trip-statement";
import {
  createTripStatement,
  importTripStatement,
  listExistingStatementCodes,
  markTripStatementImported,
} from "../lib/trip-statements";

const DEFAULT_EMAIL = "tapesolegto@gmail.com";
const DEFAULT_PDF = "C:/Users/Asus/Downloads/TAROS.pdf";

function loadLocalEnv() {
  if (!fs.existsSync(".env.local")) return;
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

async function main() {
  loadLocalEnv();
  const email = process.argv[2] ?? DEFAULT_EMAIL;
  const pdfPath = process.argv[3] ?? DEFAULT_PDF;
  if (!fs.existsSync(pdfPath)) throw new Error(`PDF non trovato: ${pdfPath}`);
  if (!process.env.UPLOADTHING_TOKEN) throw new Error("UPLOADTHING_TOKEN mancante");

  const user = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { company: true },
  });
  if (!user) throw new Error(`Utente non trovato: ${email}`);
  if (user.role !== "ADMIN") {
    await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  }

  const buffer = fs.readFileSync(pdfPath);
  const text = await extractTripStatementText(new Uint8Array(buffer));
  const parsed = parseTripStatement(text);
  if (parsed.lines.length === 0) throw new Error("Nessun viaggio riconosciuto nel PDF");

  const codes = parsed.lines.map((line) => line.code);
  const existing = await listExistingStatementCodes(user.companyId, codes);
  if (existing.size === codes.length) {
    console.log("Tutti i codici sono già importati:", existing.size);
    return;
  }

  const utapi = new UTApi();
  const upload = await utapi.uploadFiles(
    new File([new Uint8Array(buffer)], "rendiconto-taros.pdf", {
      type: "application/pdf",
    })
  );
  if (!upload.data) throw new Error(`Upload fallito: ${upload.error?.message ?? "errore"}`);

  const statement = await createTripStatement(
    user.companyId,
    user.id,
    { fileName: `Rendiconto ${parsed.provider ?? "viaggi"} ${parsed.periodStart ?? ""}.pdf`, fileUrl: upload.data.url },
    parsed
  );

  const result = await importTripStatement(user.companyId, user.id, statement, codes);
  if (result.imported.length > 0) {
    await markTripStatementImported(user.companyId, statement.id, result.imported.length);
  }

  const autoMatch = await autoMatchStatement(user.companyId, statement.id);
  const analytics = await analyzeTripStatement(user.companyId, statement.id);

  console.log(
    JSON.stringify(
      {
        company: user.company.ragioneSociale,
        period: `${parsed.periodStart} / ${parsed.periodEnd}`,
        provider: parsed.provider,
        parsedTrips: parsed.lines.length,
        parsedTotal: parsed.declaredTotal,
        imported: result.imported.length,
        skipped: result.skipped.length,
        statementId: statement.id,
        autoMatch: autoMatch
          ? {
              matchedVehicles: autoMatch.matchedVehicles,
              matchedDrivers: autoMatch.matchedDrivers,
              emptyTrips: autoMatch.emptyTrips,
              emptyKm: autoMatch.emptyKm,
            }
          : null,
        analytics: analytics
          ? {
              totalEarnings: analytics.totalEarnings,
              avgPerTrip: analytics.avgPerTrip,
              projectedYear: analytics.forecast.projected12m,
              forecastConfidence: analytics.forecast.confidence,
              topTrip: analytics.topTrips[0] ?? null,
              bottomTrip: analytics.bottomTrips[0] ?? null,
              emptyKm: analytics.geotab.emptyKm,
              emptyTrips: analytics.geotab.emptyTrips,
              matchedTrips: analytics.geotab.matchedTrips,
              coveragePct: analytics.geotab.coveragePct,
            }
          : null,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

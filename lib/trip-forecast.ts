import { db } from "./db";

export interface EarningsForecast {
  monthsUsed: number;
  statementsUsed: number;
  totalImported: number;
  avgMonthly: number;
  projected12m: number;
  confidence: "BASSA" | "MEDIA" | "ALTA";
  note: string;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Previsione calcolata sui viaggi realmente importati, mese per mese.
 * Più rendiconti vengono caricati, più la media (e quindi la stima)
 * si aggiusta automaticamente.
 */
export async function getEarningsForecast(companyId: string): Promise<EarningsForecast> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT to_char(date_trunc('month', l.date), 'YYYY-MM') AS month,
            SUM(l.amount)::float8 AS total,
            COUNT(DISTINCT l.date)::int AS days,
            COUNT(DISTINCT l."statementId")::int AS statements
     FROM "TripStatementLine" l
     WHERE l."companyId" = $1
     GROUP BY 1
     ORDER BY 1`,
    companyId
  )) as Array<{ month: string; total: number; days: number; statements: number }>;

  const monthsUsed = rows.length;
  const statementsUsed = rows.reduce((sum, row) => sum + Number(row.statements ?? 0), 0);
  const totalImported = round2(rows.reduce((sum, row) => sum + Number(row.total ?? 0), 0));
  const avgMonthly = monthsUsed > 0 ? round2(totalImported / monthsUsed) : 0;
  const projected12m = round2(avgMonthly * 12);
  const confidence: EarningsForecast["confidence"] =
    monthsUsed >= 6 ? "ALTA" : monthsUsed >= 3 ? "MEDIA" : "BASSA";

  return {
    monthsUsed,
    statementsUsed,
    totalImported,
    avgMonthly,
    projected12m,
    confidence,
    note:
      monthsUsed === 0
        ? "Nessun rendiconto importato: la stima parte dal primo PDF."
        : `Stima su ${monthsUsed} mes${monthsUsed === 1 ? "e" : "i"} e ${statementsUsed} rendicont${
            statementsUsed === 1 ? "o" : "i"
          } importati. Si aggiorna automaticamente a ogni nuovo rendiconto. Affidabilità ${confidence.toLowerCase()}.`,
  };
}

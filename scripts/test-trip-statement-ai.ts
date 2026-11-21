import fs from "node:fs";
import { parseTripStatementWithAi } from "../lib/trip-statement-ai";

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
  const path =
    process.argv[2] ?? "C:/Users/Asus/AppData/Local/Temp/opencode/TAROS_scanned.pdf";
  const buffer = fs.readFileSync(path);
  const parsed = await parseTripStatementWithAi(new Uint8Array(buffer));
  if (!parsed) {
    console.log("AI_NULL");
    return;
  }
  console.log(
    JSON.stringify(
      {
        provider: parsed.provider,
        period: `${parsed.periodStart} / ${parsed.periodEnd}`,
        declaredTrips: parsed.declaredTrips,
        declaredTotal: parsed.declaredTotal,
        lines: parsed.lines.length,
        total: parsed.lines.reduce((sum, line) => sum + line.amount, 0),
        warnings: parsed.warnings,
        first: parsed.lines[0],
        last: parsed.lines[parsed.lines.length - 1],
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

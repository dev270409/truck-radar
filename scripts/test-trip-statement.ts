import fs from "node:fs";
import { extractTripStatementText, parseTripStatement } from "../lib/trip-statement";

async function main() {
  const file = process.argv[2] ?? "C:/Users/Asus/Downloads/TAROS.pdf";
  const buffer = fs.readFileSync(file);
  const text = await extractTripStatementText(new Uint8Array(buffer));
  const parsed = parseTripStatement(text);
  console.log(JSON.stringify(parsed, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

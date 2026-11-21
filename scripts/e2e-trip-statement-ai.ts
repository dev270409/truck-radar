import fs from "node:fs";
import { UTApi } from "uploadthing/server";
import { db } from "../lib/db";
import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const SCANNED = "C:/Users/Asus/AppData/Local/Temp/opencode/TAROS_scanned.pdf";

function loadLocalEnv() {
  if (!fs.existsSync(".env.local")) return;
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  loadLocalEnv();
  if (!fs.existsSync(SCANNED)) {
    console.log("SKIP: PDF scansionato non trovato in", SCANNED);
    return;
  }
  console.log("RENDICONTO AI e2e: avvio dev server...");
  const child = await startDev(3000);
  const utapi = new UTApi();
  let uploadedKey = "";
  let statementId = "";

  try {
    const admin = makeClient(3000, await login(3000, ADMIN.email, ADMIN.password));
    const buffer = fs.readFileSync(SCANNED);
    let uploadedUrl = "";
    for (let attempt = 1; attempt <= 3 && !uploadedUrl; attempt++) {
      const upload = await utapi.uploadFiles(
        new File([new Uint8Array(buffer)], `TAROS-scanned-${Date.now()}-${attempt}.pdf`, {
          type: "application/pdf",
        })
      );
      if (upload.data) {
        uploadedUrl = upload.data.url;
        uploadedKey = upload.data.key;
      } else if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      }
    }
    if (!uploadedUrl) throw new Error("Upload PDF scansionato fallito dopo 3 tentativi");

    const parsed = await admin.req("/api/trips/import/parse", {
      method: "POST",
      body: JSON.stringify({ fileUrl: uploadedUrl, fileName: "TAROS-scanned.pdf" }),
    });
    assert(
      parsed.status === 200,
      `POST parse AI 200 (${parsed.status}) ${JSON.stringify(parsed.body).slice(0, 800)}`
    );
    statementId = parsed.body.statement.id;
    assert(parsed.body.statement.parserMode === "AI", "parserMode AI");
    assert(parsed.body.lines.length === 24, `24 righe lette dall'AI (${parsed.body.lines.length})`);
    assert(
      Math.abs(parsed.body.statement.parsedTotal - 7790) < 0.01,
      "totale AI 7.790 €"
    );
    assert(
      parsed.body.warnings.some((warning: string) => warning.includes("AI")),
      "warning di verifica AI presente"
    );

    console.log("RENDICONTO AI e2e: TUTTI I CHECK PASSATI");
  } finally {
    try {
      if (statementId) {
        await db.$executeRawUnsafe(`DELETE FROM "TripStatementLine" WHERE "statementId" = $1`, statementId);
        await db.$executeRawUnsafe(`DELETE FROM "TripStatement" WHERE id = $1`, statementId);
      }
      if (uploadedKey) await utapi.deleteFiles(uploadedKey);
    } catch {
      /* pulizia best-effort */
    }
    await stopDev(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

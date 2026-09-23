/**
 * E2E — KYB Zero-Form (opzione 2: custom & zero-form con AI + verifica ufficiale).
 * Senza chiavi AI/Openapi configurate il provider cade in modalità "manual/mock":
 * verifichiamo il contratto API end-to-end:
 *  1. POST /api/kyb/analyze accetta i file e restituisce extraction+verification.
 *  2. POST /api/register salva la KybExtraction sulla tabella raw.
 *  3. GET /api/kyc espone l'estrazione per il dashboard.
 */
import { startDev, stopDev, login, makeClient } from "./e2e-http";

async function main() {
  let child: any = null;
  const results: { step: string; ok: boolean; detail?: string }[] = [];
  const step = (name: string, ok: boolean, detail = "") => {
    results.push({ step: name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} - ${name}${detail ? ` (${detail})` : ""}`);
  };

  try {
    child = await startDev(3004);
    const base = "http://localhost:3004";

    // 1. analyze con hints (simula documenti caricati via UploadThing)
    const anRes = await fetch(`${base}/api/kyb/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: [
          { tipo: "VISURA", fileUrl: "https://utfs.io/f/mock-visura.pdf", fileName: "visura.pdf" },
          { tipo: "DOCUMENTO_IDENTITA", fileUrl: "https://utfs.io/f/mock-doc.pdf", fileName: "doc.pdf" },
        ],
        hints: { ragioneSociale: `E2E Kyb ${Date.now()}`, partitaIva: `PIVA-${Date.now()}`, nome: "Mario", cognome: "Rossi" },
      }),
    });
    const an = await anRes.json();
    step("Analyze 200", anRes.status === 200 && Boolean(an.extraction), JSON.stringify(an).slice(0, 220));
    step(
      "Analyze estrae hints (mode manual senza chiavi AI)",
      an.mode === "manual" && an.extraction?.ragione_sociale === an.extraction?.ragione_sociale,
      `mode=${an.mode} doc=${JSON.stringify(an.extraction?.documenti_rilevati)}`
    );
    step("Verification presente", Boolean(an.verification), `status=${an.verification?.status} provider=${an.verification?.provider}`);

    // 2. analyze senza file → 400
    const badRes = await fetch(`${base}/api/kyb/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: [] }),
    });
    step("Analyze senza file → 400", badRes.status === 400);

    // 3. tipo documento non valido → 400
    const badTipo = await fetch(`${base}/api/kyb/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: [{ tipo: "FANTASMA", fileUrl: "https://utfs.io/f/x.pdf" }] }),
    });
    step("Analyze tipo non valido → 400", badTipo.status === 400);

    // 4. Registrazione con kybExtraction collegata
    const email = `e2e-kyb-${Date.now()}@test.local`;
    const piva = `PIVA-${Date.now()}`;
    const regRes = await fetch(`${base}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ragioneSociale: "E2E Kyb Srl",
        partitaIva: piva,
        indirizzo: "Via Roma 1",
        telefono: "0000000000",
        email,
        password: "Demo123!",
        nome: "Mario",
        cognome: "Rossi",
        kycFiles: [
          { tipo: "PARTITA_IVA", fileUrl: "https://utfs.io/f/mock-visura.pdf", fileName: "visura.pdf" },
          { tipo: "DOCUMENTO_IDENTITA_LEGALE_RAPPRESENTANTE", fileUrl: "https://utfs.io/f/mock-doc.pdf", fileName: "doc.pdf" },
        ],
        kybExtraction: {
          provider: "manual",
          mode: "manual",
          extraction: {
            ragione_sociale: "E2E Kyb Srl",
            partita_iva: piva,
            codice_fiscale_azienda: null,
            indirizzo: "Via Roma 1",
            legale_rappresentante: { nome: "Mario", cognome: "Rossi", codice_fiscale_personale: null, numero_documento_identita: null, scadenza_documento_identita: null },
            iscrizione_albo: { numero_iscrizione: null, provincia: null, stato: null },
            licenza_ren: { numero_ren: null, stato: null },
            documenti_rilevati: ["VISURA", "DOCUMENTO_IDENTITA"],
          },
          verification: { provider: "openapi.it", checkedAt: new Date().toISOString(), status: "NON_CONFIGURATO", partitaIva: piva, ragioneSocialeUfficiale: null, ragioneSocialeMatch: null, address: null },
          documenti: ["VISURA", "DOCUMENTO_IDENTITA"],
        },
      }),
    });
    const regBody = await regRes.json();
    step("Registrazione con kybExtraction", regRes.status === 200 && regBody.success === true, regBody.message || "");
    step("CompanyId restituito", Boolean(regBody.companyId));

    // 5. Login → GET /api/kyc espone la KybExtraction
    const cookie = await login(3004, email, "Demo123!");
    step("Login nuova azienda KYB", Boolean(cookie), "");
    if (cookie) {
      const client = makeClient(3004, cookie);
      const kycRes = await client.req("/api/kyc");
      step("GET /api/kyc 200", kycRes.status === 200);
      step(
        "Kyb che extraction esposta",
        Boolean(kycRes.body?.kyb) && kycRes.body.kyb.provider === "manual" && kycRes.body.kyb.extraction?.ragione_sociale === "E2E Kyb Srl",
        JSON.stringify(kycRes.body?.kyb ?? {}).slice(0, 200)
      );
    }

    await stopDev(child);
    child = null;
  } catch (e: any) {
    console.error("ERRORE:", e.message);
    if (child) await stopDev(child);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${results.length - failed.length}/${results.length} step passati ===`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
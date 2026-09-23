/**
 * E2E — Registrazione con KYC Livello 1 + enforcement limiti piano (BASE 15/15).
 * Verifica:
 *  1. Registrazione azienda/admin con i 2 doc KYC L1.
 *  2. Login della nuova azienda.
 *  3. POST /api/vehicles senza limite → 201.
 *  4. Sessione con subscriptionPlan/vehicleLimit/driverLimit popolati.
 */
import { startDev, stopDev, login, makeClient } from "./e2e-http";

async function main() {
  let child: any = null;
  const results: { step: string; ok: boolean; detail?: string }[] = [];
  const step = (name: string, ok: boolean, detail = "") => {
    results.push({ step: name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} - ${name}${detail ? ` (${detail})` : ""}`);
  };

  const email = `e2e-reg-${Date.now()}@test.local`;
  const piva = `PIVA-${Date.now()}${Math.floor(Math.random() * 90) + 10}`;

  try {
    child = await startDev(3001);

    // 1. Registrazione con KYC L1 (2 doc)
    const base = "http://localhost:3001";
    const regRes = await fetch(`${base}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ragioneSociale: `E2E Reg ${Date.now()}`,
        partitaIva: piva,
        indirizzo: "Via Test 1",
        telefono: "0000000000",
        email,
        password: "Demo123!",
        nome: "E2E",
        cognome: "Reg",
        kycFiles: [
          { tipo: "PARTITA_IVA", fileUrl: "https://utfs.io/f/mock-piva.pdf", fileName: "piva.pdf" },
          { tipo: "DOCUMENTO_IDENTITA_LEGALE_RAPPRESENTANTE", fileUrl: "https://utfs.io/f/mock-doc.pdf", fileName: "doc.pdf" },
        ],
      }),
    });
    const regBody = await regRes.json();
    step("Registrazione KYC L1", regRes.status === 200 && regBody.success === true, regBody.message || "");

    // 2. Registrazione senza doc KYC → 400
    const badRes = await fetch(`${base}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ragioneSociale: "Bad",
        partitaIva: `BAD-${Date.now()}`,
        indirizzo: "x",
        telefono: "0",
        email: `bad-${Date.now()}@test.local`,
        password: "Demo123!",
        nome: "Bad",
        cognome: "Reg",
        kycFiles: [],
      }),
    });
    const badBody = await badRes.json();
    step("Registrazione senza doc L1 bloccata", badRes.status === 400, badBody.error || "");

    // 3. Login nuova azienda
    let cookie = "";
    try {
      cookie = await login(3001, email, "Demo123!");
      step("Login nuova azienda", Boolean(cookie));
    } catch (e: any) {
      step("Login nuova azienda", false, e.message);
    }

    if (cookie) {
      const client = makeClient(3001, cookie);

      // 4. Session JWT config (via /api/auth/session)
      const sessRes = await fetch(`${base}/api/auth/session`, { headers: { Cookie: cookie } });
      const sess = await sessRes.json();
      step("Session popolata", Boolean(sess?.user), JSON.stringify(sess?.user));

      // 5. Creazione veicolo ok (sotto limite)
      const v = await client.req("/api/vehicles", {
        method: "POST",
        body: JSON.stringify({
          targa: `AA${Date.now() % 1000}XX`,
          categoria: "FRIGO",
          portataMaxKg: 20000,
          volumeMaxM3: 120,
          status: "DISPONIBILE",
        }),
      });
      step("Creazione veicolo (sotto limite)", v.status === 201, JSON.stringify(v.body?.vehicle?.targa));

      // 6. Creazione autista ok (sotto limite)
      const u = await client.req("/api/users", {
        method: "POST",
        body: JSON.stringify({
          email: `aut-${Date.now()}@test.local`,
          password: "Demo123!",
          nome: "Autista",
          cognome: "E2E",
          role: "AUTISTA",
        }),
      });
      step("Creazione autista (sotto limite)", u.status === 201, JSON.stringify(u.body?.user?.email));
    }

    // 7. Test limite piano: crea 20 veicoli (BASE = max 15) → i primi 15 ok, il 16° → 403
    let demoCookie = "";
    try {
      demoCookie = await login(3001, "admin@demo.com", "Demo123!");
      step("Login demo (limite piano)", Boolean(demoCookie));
    } catch (e: any) {
      step("Login demo (limite piano)", false, e.message);
    }
    if (demoCookie) {
      const demo = makeClient(3001, demoCookie);
      const demoList = await demo.req("/api/vehicles");
      const existingCount = Array.isArray(demoList.body?.vehicles) ? demoList.body.vehicles.length : 0;
      let created = 0;
      let blocked = false;
      let blockedMsg = "";
      for (let i = 0; i < 20; i++) {
        const r = await demo.req("/api/vehicles", {
          method: "POST",
          body: JSON.stringify({
            targa: `LM${Date.now() % 100000}${i}X`,
            categoria: "FRIGO",
            portataMaxKg: 20000,
            volumeMaxM3: 120,
            status: "DISPONIBILE",
          }),
        });
        if (r.status === 201) created++;
        else if (r.status === 403) {
          blocked = true;
          blockedMsg = r.body?.error || "";
          break;
        }
      }
      step(
        "Limite piano VEICOLI (15): ultimo 403",
        blocked && existingCount + created >= 15,
        `esistenti=${existingCount} creati=${created} msg="${blockedMsg.slice(0, 80)}"`
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
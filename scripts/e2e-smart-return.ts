import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("SMART RETURN e2e: avvio dev server...");
  const child = await startDev(3000);

  try {
    const adminCookie = await login(3000, ADMIN.email, ADMIN.password);
    const admin = makeClient(3000, adminCookie);

    console.log("1) Lista viaggi...");
    const lst = await admin.req("/api/smart-return");
    assert(lst.status === 200, `GET /api/smart-return 200 (${lst.status})`);
    assert(Array.isArray(lst.body.trips), "trips array");

    console.log("2) Creo viaggio Milano→Roma (TELONATO, 20t)...");
    const t = await admin.req("/api/trips", {
      method: "POST",
      body: JSON.stringify({
        luogoRitiro: "Milano",
        luogoConsegna: "Roma",
        dataRitiro: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
        dataConsegna: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
        tipoMerce: "Semilavorati",
        pesoKg: 20000,
        volumeM3: 60,
        prezzo: 1200,
      }),
    });
    assert(t.status === 201, `POST /api/trips 201 (${t.status})`);
    const tripId = t.body.trip.id;

    console.log("3) Analisi smart return...");
    const a1 = await admin.req(`/api/smart-return?tripId=${tripId}`);
    assert(a1.status === 200, `GET analisi 200 (${a1.status})`);
    const an = a1.body.analysis;
    assert(an.kmOneWay > 0, `kmOneWay stimati > 0 (${an.kmOneWay})`);
    assert(an.kmVuotiPrima === an.kmOneWay, "PRIMA = km one-way (ritorno vuoto)");
    assert(an.ricavoPrima === 0, "ricavo PRIMA = 0");
    assert(an.matches.length >= 1, "almeno un carico di ritorno trovato");

    const best = an.matches[0];
    assert(best.luogoRitiro.toLowerCase().includes("roma") && best.luogoConsegna.toLowerCase().includes("milano"), "match inverso Roma→Milano");
    assert(best.companyVerified === true || best.score >= 3, "match da azienda verificata / score alto");
    assert(an.kmVuotiDopo === 0, `DOPO = 0 km a vuoto (${an.kmVuotiDopo})`);
    assert(an.ricavoAggiuntivo === best.prezzo, "ricavo aggiuntivo = prezzo carico di ritorno");

    console.log("5) Applico smart return...");
    const apply = await admin.req("/api/smart-return", {
      method: "POST",
      body: JSON.stringify({ tripId, matchLoadId: best.id }),
    });
    assert(apply.status === 201, `POST applica 201 (${apply.status})`);
    assert(apply.body.smart.candidato === false, "non candidato (abbinato)");
    assert(apply.body.smart.kmVuotiDopo === 0, "kmVuotiDopo 0");
    assert(apply.body.smart.ricavoAggiuntivo === best.prezzo, "ricavo registrato");

    console.log("6) Analisi post-applicazione → applicati presenti...");
    const a2 = await admin.req(`/api/smart-return?tripId=${tripId}`);
    assert(a2.body.analysis.applicati.length >= 1, "applicato registrato");
    assert(a2.body.analysis.applicati.some((r: any) => r.matchLoadId === best.id && !r.candidato), "record abbinato coerente");

    console.log("7) Pagina UI...");
    const page = await admin.req("/dashboard/smart-return");
    assert(page.status === 200, `smart-return page 200 (${page.status})`);

    console.log("SMART RETURN e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const VETTORE = { email: "vettore@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("REVIEWS e2e: avvio dev server...");
  const child = await startDev(3000);

  try {
    const adminCookie = await login(3000, ADMIN.email, ADMIN.password);
    const vettoreCookie = await login(3000, VETTORE.email, VETTORE.password);
    const admin = makeClient(3000, adminCookie);
    const vettore = makeClient(3000, vettoreCookie);

    console.log("1) Setup subappalto: creo trip, propongo, confermo...");
    const t = await admin.req("/api/trips", {
      method: "POST",
      body: JSON.stringify({
        luogoRitiro: "Bologna",
        luogoConsegna: "Roma",
        dataRitiro: new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10),
        dataConsegna: new Date(Date.now() - 4 * 86_400_000).toISOString().slice(0, 10),
        tipoMerce: "Merci varie",
        pesoKg: 10000,
        volumeM3: 40,
        prezzo: 800,
        costo: 500,
      }),
    });
    assert(t.status === 201, `trip 201 (${t.status})`);
    const tripId = t.body.trip.id;

    const sug = await admin.req(`/api/subcontract?tripId=${tripId}`);
    const vettoreSug = sug.body.suggerimenti.find((s: any) => s.name.includes("Vettore Demo"));
    assert(!!vettoreSug, "Vettore Demo suggerito");
    const prop = await admin.req("/api/subcontract", {
      method: "POST",
      body: JSON.stringify({ tripId, carrierCompanyId: vettoreSug.companyId, price: 700 }),
    });
    assert(prop.status === 201, `proposta 201 (${prop.status})`);
    const confirm = await admin.req(`/api/subcontract/${prop.body.prop.id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "CONFERMA" }),
    });
    assert(confirm.status === 200 && confirm.body.trip.status === "SUBAPPALTATO", "subappalto confermato");

    console.log("3) Admin (COMMITTENTE) recensisce → blind...");
    const rev1 = await admin.req("/api/reviews", {
      method: "POST",
      body: JSON.stringify({ tripId, rating: 5, comment: "Ottimo vettore, puntuale." }),
    });
    console.log(`   -> body: ${JSON.stringify(rev1.body)}`);
    assert(rev1.status === 201, `review admin 201 (${rev1.status})`);
    assert(rev1.body.review.blind === true, "review blind iniziale");
    assert(rev1.body.review.role === "COMMITTENTE", "ruolo COMMITTENTE");

    console.log("4) Duplicato admin → 409...");
    const dup = await admin.req("/api/reviews", {
      method: "POST",
      body: JSON.stringify({ tripId, rating: 3 }),
    });
    assert(dup.status === 409, `review duplicata 409 (${dup.status})`);

    console.log("5) Vettore (VETTORE) recensisce -> vedi Admin...");
    const rev2 = await vettore.req("/api/reviews", {
      method: "POST",
      body: JSON.stringify({ tripId, rating: 4, comment: "Buona comunicazione." }),
    });
    assert(rev2.status === 201 && rev2.body.review.role === "VETTORE", "review vettore role VETTORE");

    console.log("6) Blind: GET trip → nessuna visibile finché non pubblicate...");
    const vis = await admin.req(`/api/reviews?tripId=${tripId}`);
    assert(vis.status === 200, `GET trip reviews 200 (${vis.status})`);
    assert(vis.body.recensioni.length === 0, "0 recensioni visibili (finestra blind 7gg)");

    console.log("7) Ritiro blind review (admin) → 200...");
    const del = await admin.req(`/api/reviews/${rev1.body.review.id}`, { method: "DELETE" });
    assert(del.status === 200, `DELETE review blind 200 (${del.status})`);

    console.log("8) Ritiro di nuovo → 404...");
    const del2 = await admin.req(`/api/reviews/${rev1.body.review.id}`, { method: "DELETE" });
    assert(del2.status === 404, `seconda delete 404 (${del2.status})`);

    console.log("9) Recensione pubblicata dal seed (>7gg): ora è visibile per il Vettore Demo...");
    const vetRep = await vettore.req("/api/reviews"); // la mia azienda (vettore): reputazione + recensioni pubblicate
    assert(vetRep.status === 200, `GET reviews vettore 200 (${vetRep.status})`);
    const published = (vetRep.body.recensioni ?? []).filter((r: any) => r.publishedAt);
    assert(published.length >= 1, `almeno 1 recensione pubblicata per il vettore (${published.length})`);
    assert(vetRep.body.reputazione.count >= 1, "reputazione vettore >= 1");

    console.log("10) Viaggio confermato appare in 'da recensire'...");
    const adminReview = await admin.req("/api/reviews");
    assert(adminReview.status === 200, `GET dashboard reviews 200 (${adminReview.status})`);
    assert(
      adminReview.body.daValutare.some((p: any) => p.tripId === tripId),
      "trip presente in daValutare (dopo il ritiro)"
    );

    console.log("11) Pagina UI reviews...");
    const page = await admin.req("/dashboard/reviews");
    assert(page.status === 200, `reviews page 200 (${page.status})`);

    console.log("REVIEWS e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
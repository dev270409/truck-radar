import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const AUTISTA = { email: "autista@demo.com", password: "Demo123!" };
const VETTORE = { email: "vettore@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("PARKING e2e: avvio dev server...");
  const child = await startDev(3000);

  try {
    const adminCookie = await login(3000, ADMIN.email, ADMIN.password);
    const autistaCookie = await login(3000, AUTISTA.email, AUTISTA.password);
    const vettoreCookie = await login(3000, VETTORE.email, VETTORE.password);
    const admin = makeClient(3000, adminCookie);
    const autista = makeClient(3000, autistaCookie);
    const vettore = makeClient(3000, vettoreCookie);

    console.log("0) Lista iniziale: seed presenti...");
    const base = await admin.req("/api/parking");
    assert(base.status === 200, `GET /api/parking 200 (${base.status})`);
    assert((base.body.areas ?? []).length >= 2, `seed aree presenti (${base.body.areas?.length})`);
    const baseCount = (base.body.areas ?? []).length;

    console.log("1) Creo un'area (admin)...");
    const create = await admin.req("/api/parking", {
      method: "POST",
      body: JSON.stringify({
        name: "Area E2E",
        address: "Via Test 1",
        city: "Bologna",
        security: true,
        illuminated: true,
        showers: true,
        restaurant: false,
        wifi: true,
      }),
    });
    assert(create.status === 201 as any, `POST area 201 (${create.status})`);
    const areaId = create.body.area.id;

    console.log("2) Autista non può creare (403)...");
    const forz = await autista.req("/api/parking", {
      method: "POST",
      body: JSON.stringify({ name: "X", address: "Y" }),
    });
    assert(forz.status === 403, `AUTISTA POST 403 (${forz.status})`);

    console.log("3) Valido 5 stelle (admin)...");
    const fb1 = await admin.req(`/api/parking/${areaId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ rating: 5, comment: "Ottima area." }),
    });
    assert(fb1.status === 201, `feedback 201 (${fb1.status})`);

    console.log("4) Duplicato → 409...");
    const dup = await admin.req(`/api/parking/${areaId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ rating: 4 }),
    });
    assert(dup.status === 409, `duplicato 409 (${dup.status})`);

    console.log("5) Altra azienda valuta (vettore network) → 201 e media aggiornata...");
    const fb2 = await vettore.req(`/api/parking/${areaId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ rating: 4 }),
    });
    assert(fb2.status === 201, `feedback altra azienda 201 (${fb2.status})`);
    const list = await admin.req("/api/parking");
    const updated = (list.body.areas ?? []).find((a: any) => a.id === areaId);
    assert(updated.ratingAvg === 4.5, `ratingAvg 4.5 (${updated.ratingAvg})`);
    assert(updated.feedbackCount === 2, `feedbackCount 2 (${updated.feedbackCount})`);

    console.log("6) PATCH area (creator) → 200, riga aggiornata...");
    const patch = await admin.req(`/api/parking/${areaId}`, {
      method: "PATCH",
      body: JSON.stringify({ city: "Parma" }),
    });
    assert(patch.status === 200 && patch.body.area.city === "Parma", "PATCH city ok");

    console.log("7) DELETE area altrui → 404...");
    const delForeign = await vettore.req(`/api/parking/${areaId}`, { method: "DELETE" });
    assert(delForeign.status === 404, `DELETE altrui 404 (${delForeign.status})`);

    console.log("8) DELETE area propria → 200...");
    const del = await admin.req(`/api/parking/${areaId}`, { method: "DELETE" });
    assert(del.status === 200, `DELETE area 200 (${del.status})`);
    const after = await admin.req("/api/parking");
    assert((after.body.areas ?? []).length === baseCount, `count di ritorno al base (${after.body.areas?.length})`);
    assert(!(after.body.areas ?? []).some((a: any) => a.id === areaId), "area e2e rimossa");

    console.log("9) UI...");
    const page = await admin.req("/dashboard/parking");
    assert(page.status === 200, `parking page 200 (${page.status})`);

    console.log("PARKING e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
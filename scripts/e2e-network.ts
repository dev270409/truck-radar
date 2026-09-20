import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const AUTISTA = { email: "autista@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("NETWORK+BADGES e2e: avvio dev server...");
  const child = await startDev(3000);

  try {
    const adminCookie = await login(3000, ADMIN.email, ADMIN.password);
    const autistaCookie = await login(3000, AUTISTA.email, AUTISTA.password);
    const admin = makeClient(3000, adminCookie);
    const autista = makeClient(3000, autistaCookie);

    console.log("1) Directory network (admin)...");
    const net = await admin.req("/api/network");
    assert(net.status === 200, `GET /api/network 200 (${net.status})`);
    const dir = net.body.directory ?? [];
    assert(dir.length >= 2, `almeno 2 aziende verificate (${dir.length})`);
    assert(dir.some((c: any) => c.name.includes("Vettore Demo")), "Vettore Demo presente");
    assert(dir.some((c: any) => c.isMine), "mia azienda contrassegnata isMine");
    const d = dir.find((c: any) => c.name.includes("Vettore Demo"));
    assert(typeof d.reputation === "number" && d.reviewsCount >= 0, "reputazione esposta");

    console.log("2) Badge (admin)...");
    const bg = await admin.req("/api/badges");
    assert(bg.status === 200, `GET /api/badges 200 (${bg.status})`);
    assert((bg.body.badges ?? []).length === 8, `8 badge definiti (${bg.body.badges?.length})`);
    assert(bg.body.earned >= 1, `almeno 1 badge ottenuto (${bg.body.earned})`);
    assert(
      bg.body.badges.find((b: any) => b.code === "ACCOUNT_VERIFICATO")?.earnedAt,
      "badge ACCOUNT_VERIFICATO ottenuto"
    );

    console.log("3) Badges idempotenti (seconda chiamata)...");
    const bg2 = await admin.req("/api/badges");
    assert(bg2.body.earned === bg.body.earned, "earned stabile tra chiamate");

    console.log("4) Gate ruolo: autista 403 sulla directory...");
    const aut = await autista.req("/api/network");
    assert(aut.status === 403, `AUTISTA 403 (${aut.status})`);

    console.log("5) UI Network e Badge...");
    const pnet = await admin.req("/dashboard/network");
    assert(pnet.status === 200, `network page 200 (${pnet.status})`);
    const pbad = await admin.req("/dashboard/badges");
    assert(pbad.status === 200, `badges page 200 (${pbad.status})`);

    console.log("NETWORK+BADGES e2e: TUTTI I CHECK PASSATI");
  } finally {
    await stopDev(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
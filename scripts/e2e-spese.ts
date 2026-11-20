import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const DRIVER = { email: "autista@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

function near(actual: unknown, expected: number) {
  return Math.abs(Number(actual) - expected) < 0.005;
}

async function main() {
  console.log("SPESE e2e: avvio dev server...");
  const child = await startDev(3000);
  const suffix = Date.now().toString(36);
  const today = new Date().toISOString().slice(0, 10);
  let expenseId = "";

  try {
    const admin = makeClient(3000, await login(3000, ADMIN.email, ADMIN.password));
    const driver = makeClient(3000, await login(3000, DRIVER.email, DRIVER.password));

    console.log("1) Permessi e validazione...");
    const driverList = await driver.req("/api/expenses");
    assert(driverList.status === 403, `AUTISTA senza permesso expenses 403 (${driverList.status})`);

    const noDescription = await admin.req("/api/expenses", {
      method: "POST",
      body: JSON.stringify({ date: today, category: "CARBURANTE", amount: 100, vatRate: 22 }),
    });
    assert(noDescription.status === 400, `POST senza descrizione 400 (${noDescription.status})`);

    const zeroAmount = await admin.req("/api/expenses", {
      method: "POST",
      body: JSON.stringify({ date: today, category: "CARBURANTE", description: "Zero", amount: 0, vatRate: 22 }),
    });
    assert(zeroAmount.status === 400, `POST importo zero 400 (${zeroAmount.status})`);

    const badCategory = await admin.req("/api/expenses", {
      method: "POST",
      body: JSON.stringify({ date: today, category: "INESISTENTE", description: "Test", amount: 10, vatRate: 22 }),
    });
    assert(badCategory.status === 400, `POST categoria invalida 400 (${badCategory.status})`);

    const badReceipt = await admin.req("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        date: today,
        category: "CARBURANTE",
        description: "Test ricevuta",
        amount: 10,
        vatRate: 22,
        receiptUrl: "https://example.com/falso.pdf",
      }),
    });
    assert(badReceipt.status === 400, `POST ricevuta fuori dominio 400 (${badReceipt.status})`);

    console.log("2) Creazione e calcolo IVA...");
    const created = await admin.req("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        date: today,
        category: "CARBURANTE",
        supplier: `Fornitore ${suffix}`,
        description: `TestSpesa ${suffix}`,
        amount: 122,
        vatRate: 22,
        paymentMethod: "CARTA",
        receiptUrl: "https://utfs.io/f/test-ricevuta.pdf",
        receiptName: "ricevuta.pdf",
        notes: "Creato da e2e-spese",
      }),
    });
    assert(created.status === 201, `POST spesa 201 (${created.status})`);
    expenseId = created.body.item.id;
    assert(near(created.body.item.amount, 122), "totale 122");
    assert(near(created.body.item.vatAmount, 22), "IVA calcolata 22");
    assert(near(created.body.item.netAmount, 100), "imponibile calcolato 100");
    assert(created.body.item.paymentMethod === "CARTA", "metodo di pagamento salvato");

    console.log("3) Filtri ed export...");
    const list = await admin.req(`/api/expenses?from=${today}&to=${today}&category=CARBURANTE`);
    assert(list.status === 200, `GET filtrato 200 (${list.status})`);
    assert(
      list.body.items.some((item: { id: string }) => item.id === expenseId),
      "la spesa compare nel filtro data+categoria"
    );

    const search = await admin.req(`/api/expenses?q=${encodeURIComponent(suffix)}`);
    assert(search.status === 200, `GET ricerca 200 (${search.status})`);
    assert(
      search.body.items.some((item: { id: string }) => item.id === expenseId),
      "la ricerca per testo trova la spesa"
    );

    const csv = await admin.req(`/api/expenses/export?from=${today}&to=${today}`);
    assert(csv.status === 200, `GET export CSV 200 (${csv.status})`);
    assert(typeof csv.body === "string" && csv.body.includes("imponibile"), "export con intestazioni");
    assert(csv.body.includes(`TestSpesa ${suffix}`), "export contiene la spesa");
    assert(csv.body.includes("100.00"), "export imponibile 100.00");
    assert(csv.body.includes("22.00"), "export IVA 22.00");
    assert(csv.body.includes("122.00"), "export totale 122.00");

    console.log("4) Modifica e ricalcolo...");
    const patched = await admin.req(`/api/expenses/${expenseId}`, {
      method: "PATCH",
      body: JSON.stringify({ amount: 61, vatRate: 22 }),
    });
    assert(patched.status === 200, `PATCH importo 200 (${patched.status})`);
    assert(near(patched.body.item.amount, 61), "totale aggiornato 61");
    assert(near(patched.body.item.netAmount, 50), "imponibile ricalcolato 50");
    assert(near(patched.body.item.vatAmount, 11), "IVA ricalcolata 11");

    const patchedCategory = await admin.req(`/api/expenses/${expenseId}`, {
      method: "PATCH",
      body: JSON.stringify({ category: "PEDAGGI" }),
    });
    assert(patchedCategory.status === 200, `PATCH categoria 200 (${patchedCategory.status})`);
    assert(near(patchedCategory.body.item.amount, 61), "la modifica categoria non altera il totale");
    assert(patchedCategory.body.item.category === "PEDAGGI", "categoria aggiornata");

    console.log("5) Pagina e cancellazione...");
    const page = await admin.req("/dashboard/spese");
    assert(page.status === 200, `pagina /dashboard/spese 200 (${page.status})`);
    assert(typeof page.body === "string" && page.body.includes("Spese aziendali"), "la pagina renderizza il titolo");

    const deleted = await admin.req(`/api/expenses/${expenseId}`, { method: "DELETE" });
    assert(deleted.status === 200, `DELETE spesa 200 (${deleted.status})`);
    expenseId = "";

    const after = await admin.req(`/api/expenses?q=${encodeURIComponent(suffix)}`);
    assert(
      after.status === 200 && !after.body.items.some((item: { id: string }) => item.id === expenseId),
      "la spesa eliminata non compare più"
    );

    console.log("SPESE e2e: TUTTI I CHECK PASSATI");
  } finally {
    if (expenseId) {
      try {
        const admin = makeClient(3000, await login(3000, ADMIN.email, ADMIN.password));
        await admin.req(`/api/expenses/${expenseId}`, { method: "DELETE" });
      } catch {
        /* pulizia best-effort */
      }
    }
    await stopDev(child);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

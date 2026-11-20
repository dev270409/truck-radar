import { startDev, stopDev, login, makeClient } from "./e2e-http";

const ADMIN = { email: "admin@demo.com", password: "Demo123!" };
const DRIVER = { email: "autista@demo.com", password: "Demo123!" };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ok: ${msg}`);
}

async function main() {
  console.log("ANAGRAFICA e2e: avvio dev server...");
  const child = await startDev(3000);
  const suffix = Date.now().toString(36);
  let customerId = "";
  let supplierId = "";
  let quoteId = "";

  try {
    const admin = makeClient(3000, await login(3000, ADMIN.email, ADMIN.password));
    const driver = makeClient(3000, await login(3000, DRIVER.email, DRIVER.password));

    console.log("1) Validazione e permessi...");
    const noName = await admin.req("/api/customers", { method: "POST", body: JSON.stringify({}) });
    assert(noName.status === 400, `POST senza nome 400 (${noName.status})`);

    const badType = await admin.req("/api/customers", {
      method: "POST",
      body: JSON.stringify({ name: "Test tipo", type: "ALTRO" }),
    });
    assert(badType.status === 400, `POST tipo non valido 400 (${badType.status})`);

    const badEmail = await admin.req("/api/customers", {
      method: "POST",
      body: JSON.stringify({ name: "Test email", email: "non-valida" }),
    });
    assert(badEmail.status === 400, `POST email non valida 400 (${badEmail.status})`);

    const driverList = await driver.req("/api/customers");
    assert(driverList.status === 403, `AUTISTA senza permesso clients 403 (${driverList.status})`);

    console.log("2) Creazione cliente completo...");
    const created = await admin.req("/api/customers", {
      method: "POST",
      body: JSON.stringify({
        type: "CLIENTE",
        name: `Cliente E2E ${suffix}`,
        contactName: "Referente Test",
        email: `cliente-${suffix}@example.com`,
        phone: "+39 051 000000",
        address: "Via Test 1",
        city: "Bologna",
        province: "bo",
        postalCode: "40100",
        country: "it",
        vat: "01234567890",
        sdi: "abc1234",
        pec: `pec-${suffix}@example.com`,
        paymentTerms: "30 gg d.f.",
        notes: "Creato da e2e-anagrafica",
      }),
    });
    assert(created.status === 201, `POST cliente 201 (${created.status})`);
    customerId = created.body.item.id;
    assert(created.body.item.type === "CLIENTE", "tipo CLIENTE salvato");
    assert(created.body.item.city === "Bologna", "città salvata");
    assert(created.body.item.province === "BO", "provincia normalizzata maiuscola");
    assert(created.body.item.country === "IT", "stato normalizzato IT");
    assert(created.body.item.sdi === "ABC1234", "SDI normalizzato maiuscolo");
    assert(created.body.item.vat === "01234567890", "P.IVA salvata");

    console.log("3) Creazione fornitore e ricerca...");
    const supplier = await admin.req("/api/customers", {
      method: "POST",
      body: JSON.stringify({ type: "FORNITORE", name: `Fornitore E2E ${suffix}`, city: "Ferrara" }),
    });
    assert(supplier.status === 201, `POST fornitore 201 (${supplier.status})`);
    supplierId = supplier.body.item.id;

    const filtered = await admin.req(`/api/customers?type=FORNITORE&q=${encodeURIComponent(suffix)}`);
    assert(filtered.status === 200, `GET filtrato 200 (${filtered.status})`);
    assert(
      filtered.body.items.some((item: { id: string }) => item.id === supplierId),
      "ricerca per tipo e testo trova il fornitore"
    );
    assert(
      filtered.body.items.every((item: { type: string }) => item.type === "FORNITORE"),
      "il filtro tipo esclude i clienti"
    );

    console.log("4) Modifica e indirizzi secondari...");
    const patched = await admin.req(`/api/customers/${customerId}`, {
      method: "PATCH",
      body: JSON.stringify({ city: "Modena", paymentTerms: "60 gg" }),
    });
    assert(patched.status === 200, `PATCH cliente 200 (${patched.status})`);
    assert(patched.body.item.city === "Modena", "città aggiornata");
    assert(patched.body.item.paymentTerms === "60 gg", "condizioni aggiornate");

    const emptyAddress = await admin.req(`/api/customers/${customerId}/addresses`, {
      method: "POST",
      body: JSON.stringify({ label: "Senza indirizzo" }),
    });
    assert(emptyAddress.status === 400, `POST indirizzo vuoto 400 (${emptyAddress.status})`);

    const address = await admin.req(`/api/customers/${customerId}/addresses`, {
      method: "POST",
      body: JSON.stringify({
        label: "Magazzino",
        address: "Via Deposito 7",
        city: "Modena",
        province: "mo",
        postalCode: "41100",
      }),
    });
    assert(address.status === 201, `POST indirizzo 201 (${address.status})`);
    const addressId = address.body.item.id;
    assert(address.body.item.province === "MO", "provincia indirizzo normalizzata");

    const detail = await admin.req(`/api/customers/${customerId}`);
    assert(detail.status === 200, `GET scheda 200 (${detail.status})`);
    assert(detail.body.addresses.length === 1, "la scheda espone 1 indirizzo");
    assert(detail.body.item.addressCount === 1, "addressCount aggiornato");

    console.log("5) Collegamento a preventivo e blocco eliminazione...");
    const quote = await admin.req("/api/quotes", {
      method: "POST",
      body: JSON.stringify({
        customerId,
        customerName: `Cliente E2E ${suffix}`,
        pickup: "Bologna",
        delivery: "Milano",
        price: 100,
      }),
    });
    assert(quote.status === 201, `POST preventivo 201 (${quote.status})`);
    quoteId = quote.body.item.id;
    assert(quote.body.item.customerId === customerId, "preventivo collegato al customerId");

    const blocked = await admin.req(`/api/customers/${customerId}`, { method: "DELETE" });
    assert(blocked.status === 409, `DELETE cliente collegato 409 (${blocked.status})`);
    assert(String(blocked.body.error).includes("preventiv"), "il 409 spiega il collegamento");

    console.log("6) Pulizia e cancellazione...");
    const quoteDeleted = await admin.req(`/api/quotes/${quoteId}`, { method: "DELETE" });
    assert(quoteDeleted.status === 200, `DELETE preventivo 200 (${quoteDeleted.status})`);
    quoteId = "";

    const addressDeleted = await admin.req(`/api/customers/${customerId}/addresses/${addressId}`, {
      method: "DELETE",
    });
    assert(addressDeleted.status === 200, `DELETE indirizzo 200 (${addressDeleted.status})`);

    const customerDeleted = await admin.req(`/api/customers/${customerId}`, { method: "DELETE" });
    assert(customerDeleted.status === 200, `DELETE cliente 200 (${customerDeleted.status})`);
    customerId = "";

    const gone = await admin.req(`/api/customers/${supplierId}`);
    assert(gone.status === 200, "la scheda fornitore risponde");
    const supplierDeleted = await admin.req(`/api/customers/${supplierId}`, { method: "DELETE" });
    assert(supplierDeleted.status === 200, `DELETE fornitore 200 (${supplierDeleted.status})`);
    supplierId = "";

    console.log("7) Pagina e export...");
    const page = await admin.req("/dashboard/anagrafica");
    assert(page.status === 200, `pagina /dashboard/anagrafica 200 (${page.status})`);
    assert(typeof page.body === "string" && page.body.includes("Anagrafica"), "la pagina renderizza il titolo");

    const exported = await admin.req("/api/export?type=customers");
    assert(exported.status === 200, `export clienti 200 (${exported.status})`);
    assert(typeof exported.body === "string" && exported.body.includes("tipo"), "export include la colonna tipo");

    console.log("ANAGRAFICA e2e: TUTTI I CHECK PASSATI");
  } finally {
    try {
      if (quoteId) {
        const admin = makeClient(3000, await login(3000, ADMIN.email, ADMIN.password));
        await admin.req(`/api/quotes/${quoteId}`, { method: "DELETE" });
      }
      if (customerId || supplierId) {
        const admin = makeClient(3000, await login(3000, ADMIN.email, ADMIN.password));
        if (customerId) await admin.req(`/api/customers/${customerId}`, { method: "DELETE" });
        if (supplierId) await admin.req(`/api/customers/${supplierId}`, { method: "DELETE" });
      }
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

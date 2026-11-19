import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { getTenantDb } from "@/lib/tenant";
import { listCustomers, listOrders, listQuotes, listVehicleCosts } from "@/lib/ops";
import { toCsv } from "@/lib/csv";

function csvResponse(filename: string, csv: string) {
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const session = guard.session;
  const type = new URL(req.url).searchParams.get("type") ?? "vehicles";
  const tenantDb = getTenantDb(session.user.companyId);

  if (type === "vehicles") {
    const vehicles = await tenantDb.vehicles.findMany({ orderBy: { createdAt: "desc" } });
    const csv = toCsv(
      ["targa", "categoria", "portataMaxKg", "volumeMaxM3", "status"],
      vehicles.map((v) => [v.targa, v.categoria, v.portataMaxKg, v.volumeMaxM3, v.status])
    );
    return csvResponse("mezzi.csv", csv);
  }

  if (type === "trips") {
    const trips = await tenantDb.trips.findMany({ orderBy: { createdAt: "desc" } });
    const csv = toCsv(
      ["luogoRitiro", "luogoConsegna", "dataRitiro", "dataConsegna", "tipoMerce", "pesoKg", "volumeM3", "cliente", "prezzo", "costo", "status"],
      trips.map((t) => [
        t.luogoRitiro,
        t.luogoConsegna,
        t.dataRitiro?.toISOString().slice(0, 10) ?? "",
        t.dataConsegna?.toISOString().slice(0, 10) ?? "",
        t.tipoMerce,
        t.pesoKg,
        t.volumeM3,
        t.cliente ?? "",
        t.prezzo ?? "",
        t.costo ?? "",
        t.status,
      ])
    );
    return csvResponse("viaggi.csv", csv);
  }

  if (type === "quotes") {
    const quotes = await listQuotes(session.user.companyId);
    const csv = toCsv(
      ["cliente", "email", "ritiro", "consegna", "merce", "pesoKg", "volumeM3", "metriLineari", "prezzo", "costo", "margine", "status", "validoFino", "note"],
      quotes.map((q) => [
        q.customerName,
        q.customerEmail ?? "",
        q.pickup,
        q.delivery,
        q.goods ?? "",
        q.weightKg,
        q.volumeM3,
        q.linearM,
        q.price,
        q.cost,
        Math.round((q.price - q.cost) * 100) / 100,
        q.status,
        q.validUntil ? new Date(q.validUntil).toISOString().slice(0, 10) : "",
        q.notes ?? "",
      ])
    );
    return csvResponse("preventivi.csv", csv);
  }

  if (type === "orders") {
    const orders = await listOrders(session.user.companyId);
    const csv = toCsv(
      ["cliente", "email", "ritiro", "consegna", "merce", "pesoKg", "volumeM3", "prezzo", "status", "note", "data"],
      orders.map((o) => [
        o.customerName,
        o.customerEmail ?? "",
        o.pickup,
        o.delivery,
        o.goods ?? "",
        o.weightKg,
        o.volumeM3,
        o.price,
        o.status,
        o.notes ?? "",
        new Date(o.createdAt).toISOString().slice(0, 10),
      ])
    );
    return csvResponse("ordini.csv", csv);
  }

  if (type === "customers") {
    const customers = await listCustomers(session.user.companyId);
    const csv = toCsv(
      ["nome", "email", "telefono", "indirizzo", "piva", "note"],
      customers.map((c) => [c.name, c.email ?? "", c.phone ?? "", c.address ?? "", c.vat ?? "", c.notes ?? ""])
    );
    return csvResponse("clienti.csv", csv);
  }

  if (type === "costs") {
    const costs = await listVehicleCosts(session.user.companyId);
    const csv = toCsv(
      ["vehicleId", "tipo", "descrizione", "importo", "data", "fornitore", "note"],
      costs.map((c) => [c.vehicleId, c.tipo, c.descrizione ?? "", c.importo, new Date(c.data).toISOString().slice(0, 10), c.fornitore ?? "", c.note ?? ""])
    );
    return csvResponse("costi-mezzi.csv", csv);
  }

  return NextResponse.json({ error: "Tipo export non supportato." }, { status: 400 });
}

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { getTenantDb } from "@/lib/tenant";
import { getPlanLimits } from "@/lib/plans";
import { createCustomer } from "@/lib/ops";
import { csvToObjects, parseDate, parseNumber, pick } from "@/lib/csv";

const CATEGORIES = ["FRIGO", "TELONATO", "SPONDA_IDRAULICA", "CISTERNA", "ADR"];

export async function POST(req: Request) {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  const session = guard.session;
  if (session.user.role === "AUTISTA") {
    return NextResponse.json({ error: "Operazione riservata alla sede." }, { status: 403 });
  }

  let body: { type?: string; csv?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }
  const type = String(body.type ?? "");
  const csv = String(body.csv ?? "");
  if (!csv.trim()) return NextResponse.json({ error: "CSV vuoto." }, { status: 400 });

  const { rows } = csvToObjects(csv);
  if (rows.length === 0) return NextResponse.json({ error: "Nessuna riga valida nel CSV." }, { status: 400 });
  if (rows.length > 2000) return NextResponse.json({ error: "Massimo 2000 righe per import." }, { status: 400 });

  const tenantDb = getTenantDb(session.user.companyId);
  let imported = 0;
  const errors: string[] = [];

  if (type === "vehicles") {
    const company = await tenantDb.getCompany();
    const limit = getPlanLimits(company?.subscriptionPlan).vehicleLimit;
    const existing = await tenantDb.vehicles.findMany({ select: { id: true, targa: true } });
    const plates = new Set(existing.map((v) => v.targa.toUpperCase().replace(/[^A-Z0-9]/g, "")));
    for (let i = 0; i < rows.length; i++) {
      if (existing.length + imported >= limit) {
        errors.push(`Riga ${i + 2}: limite piano ${limit} mezzi raggiunto.`);
        break;
      }
      const row = rows[i];
      const targa = pick(row, ["targa", "plate", "targa_mezzo"]).toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!targa) {
        errors.push(`Riga ${i + 2}: targa mancante.`);
        continue;
      }
      if (plates.has(targa)) {
        errors.push(`Riga ${i + 2}: targa ${targa} già presente.`);
        continue;
      }
      const catRaw = pick(row, ["categoria", "category", "tipo"]).toUpperCase();
      const categoria = CATEGORIES.includes(catRaw) ? catRaw : "TELONATO";
      const portata = parseNumber(pick(row, ["portataMaxKg", "portata", "portata_kg"]));
      const volume = parseNumber(pick(row, ["volumeMaxM3", "volume", "volume_m3"]));
      if (portata <= 0 || volume <= 0) {
        errors.push(`Riga ${i + 2}: portata/volume non validi.`);
        continue;
      }
      await tenantDb.vehicles.create({
        data: {
          targa,
          categoria: categoria as never,
          portataMaxKg: portata,
          volumeMaxM3: volume,
          status: "DISPONIBILE",
        },
      });
      plates.add(targa);
      imported++;
    }
    return NextResponse.json({ imported, errors });
  }

  if (type === "customers") {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = pick(row, ["nome", "cliente", "ragioneSociale", "name"]);
      if (!name) {
        errors.push(`Riga ${i + 2}: nome mancante.`);
        continue;
      }
      await createCustomer(session.user.companyId, {
        name,
        email: pick(row, ["email", "mail"]) || null,
        phone: pick(row, ["telefono", "phone", "cellulare"]) || null,
        address: pick(row, ["indirizzo", "address", "sede"]) || null,
        vat: pick(row, ["piva", "partitaIva", "vat"]) || null,
        notes: pick(row, ["note", "notes"]) || null,
      });
      imported++;
    }
    return NextResponse.json({ imported, errors });
  }

  if (type === "trips") {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const ritiro = pick(row, ["luogoRitiro", "ritiro", "pickup", "origine"]);
      const consegna = pick(row, ["luogoConsegna", "consegna", "delivery", "destinazione"]);
      const dataRitiro = parseDate(pick(row, ["dataRitiro", "data_ritiro", "pickupDate"]));
      const dataConsegna = parseDate(pick(row, ["dataConsegna", "data_consegna", "deliveryDate"]));
      if (!ritiro || !consegna || !dataRitiro || !dataConsegna) {
        errors.push(`Riga ${i + 2}: ritiro/consegna/date mancanti.`);
        continue;
      }
      await tenantDb.trips.create({
        data: {
          luogoRitiro: ritiro,
          luogoConsegna: consegna,
          dataRitiro,
          dataConsegna,
          tipoMerce: pick(row, ["tipoMerce", "merce", "goods"]) || "Merce",
          pesoKg: parseNumber(pick(row, ["pesoKg", "peso", "weight"])),
          volumeM3: parseNumber(pick(row, ["volumeM3", "volume"])),
          cliente: pick(row, ["cliente", "customer"]) || null,
          prezzo: parseNumber(pick(row, ["prezzo", "price"])) || null,
          costo: parseNumber(pick(row, ["costo", "cost"])) || null,
          status: "DA_ASSEGNARE",
          createdBy: session.user.id,
        },
      });
      imported++;
    }
    return NextResponse.json({ imported, errors });
  }

  return NextResponse.json({ error: "Tipo import non supportato (vehicles/customers/trips)." }, { status: 400 });
}

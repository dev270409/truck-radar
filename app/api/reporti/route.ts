import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { Prisma } from "@prisma/client";
import type { TripStatus } from "@prisma/client";

const VALID_STATUSES = [
  "DA_ASSEGNARE",
  "ASSEGNATO",
  "IN_CORSO",
  "COMPLETATO",
  "ANNULLATO",
  "SUBAPPALTATO",
] as const;

const tripPayload = Prisma.validator<Prisma.TripDefaultArgs>()({
  include: {
    driver: { select: { id: true, nome: true, cognome: true } },
    vehicle: { select: { id: true, targa: true } },
  },
});

type TripRow = Prisma.TripGetPayload<typeof tripPayload>;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "UFFICIO") {
    return NextResponse.json(
      { error: "Solo l'Admin (o Ufficio) può consultare il centro dati." },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const da = url.searchParams.get("da");
  const a = url.searchParams.get("a");
  const statusParam = url.searchParams.get("status");

  const where: Prisma.TripWhereInput = {};

  if (statusParam && (VALID_STATUSES as readonly string[]).includes(statusParam)) {
    where.status = statusParam as TripStatus;
  }
  if (da && !isNaN(new Date(da).getTime())) {
    where.dataRitiro = {
      ...(where.dataRitiro as { gte?: Date; lte?: Date }),
      gte: new Date(da),
    };
  }
  if (a && !isNaN(new Date(a).getTime())) {
    where.dataRitiro = {
      ...(where.dataRitiro as { gte?: Date; lte?: Date }),
      lte: new Date(a),
    };
  }

  const tenantDb = getTenantDb(session.user.companyId);
  const trips = (await tenantDb.trips.findMany({
    where,
    include: tripPayload.include,
    orderBy: { dataRitiro: "asc" },
  })) as unknown as TripRow[];

  const fatturato = trips.reduce((s, t) => s + (t.prezzo ?? 0), 0);
  const costi = trips.reduce((s, t) => s + (t.costo ?? 0), 0);
  const margine = fatturato - costi;
  const conPrezzo = trips.filter((t) => t.prezzo != null).length;
  const prezzoMedio = conPrezzo > 0 ? fatturato / conPrezzo : 0;

  const byStatus = VALID_STATUSES.map((s) => ({
    status: s,
    count: trips.filter((t) => t.status === s).length,
  })).filter((x) => x.count > 0);

  const byMese: Record<string, { viaggi: number; fatturato: number; costo: number }> = {};
  for (const t of trips) {
    const key = t.dataRitiro.toISOString().slice(0, 7);
    byMese[key] = byMese[key] ?? { viaggi: 0, fatturato: 0, costo: 0 };
    byMese[key].viaggi += 1;
    byMese[key].fatturato += t.prezzo ?? 0;
    byMese[key].costo += t.costo ?? 0;
  }
  const serieMensile = Object.entries(byMese)
    .map(([mese, v]) => ({ mese, ...v }))
    .sort((x, y) => x.mese.localeCompare(y.mese));

  const byCliente: Record<string, { viaggi: number; fatturato: number }> = {};
  for (const t of trips) {
    const key = t.cliente ?? "–";
    byCliente[key] = byCliente[key] ?? { viaggi: 0, fatturato: 0 };
    byCliente[key].viaggi += 1;
    byCliente[key].fatturato += t.prezzo ?? 0;
  }
  const topClienti = Object.entries(byCliente)
    .map(([cliente, v]) => ({ cliente, ...v }))
    .sort((x, y) => y.fatturato - x.fatturato)
    .slice(0, 6);

  const byAutista: Record<string, { autista: string; viaggi: number; fatturato: number }> = {};
  for (const t of trips) {
    const key = t.driverId ?? "non_assegnato";
    byAutista[key] = byAutista[key] ?? {
      autista: t.driver
        ? `${t.driver.nome} ${t.driver.cognome}`
        : "Non assegnato",
      viaggi: 0,
      fatturato: 0,
    };
    byAutista[key].viaggi += 1;
    byAutista[key].fatturato += t.prezzo ?? 0;
  }
  const topAutisti = Object.values(byAutista)
    .sort((x, y) => y.viaggi - x.viaggi)
    .slice(0, 6);

  return NextResponse.json({
    totali: {
      viaggi: trips.length,
      fatturato,
      costi,
      margine,
      prezzoMedio,
    },
    byStatus,
    serieMensile,
    topClienti,
    topAutisti,
  });
}
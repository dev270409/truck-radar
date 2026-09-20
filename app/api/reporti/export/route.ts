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
    driver: { select: { nome: true, cognome: true } },
    vehicle: { select: { targa: true } },
  },
});

type TripRow = Prisma.TripGetPayload<typeof tripPayload>;

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "UFFICIO") {
    return NextResponse.json(
      { error: "Solo l'Admin (o Ufficio) può esportare i dati." },
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

  const header = [
    "ID",
    "Data Ritiro",
    "Data Consegna",
    "Ritiro",
    "Consegna",
    "Merce",
    "Peso (kg)",
    "Cliente",
    "Autista",
    "Targa",
    "Prezzo (EUR)",
    "Costo (EUR)",
    "Stato",
  ].join(";");

  const rows = trips.map((t) =>
    [
      t.id,
      t.dataRitiro.toISOString().slice(0, 10),
      t.dataConsegna.toISOString().slice(0, 10),
      t.luogoRitiro,
      t.luogoConsegna,
      t.tipoMerce,
      t.pesoKg,
      t.cliente ?? "",
      t.driver ? `${t.driver.nome} ${t.driver.cognome}` : "",
      t.vehicle?.targa ?? "",
      t.prezzo ?? "",
      t.costo ?? "",
      t.status,
    ]
      .map(esc)
      .join(";")
  );

  const csv = `\uFEFF${header}\n${rows.join("\n")}`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="logiflow-report-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
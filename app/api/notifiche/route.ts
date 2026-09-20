import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { db } from "@/lib/db";

const MS_DAY = 86_400_000;

export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const tenantDb = getTenantDb(session.user.companyId);
  const now = new Date();
  const soglia = new Date(now.getTime() + 14 * MS_DAY);
  const notifiche: Array<{
    id: string;
    tipo: string;
    gravita: "alta" | "media";
    titolo: string;
    dettaglio: string;
    link: string;
    data?: string | null;
  }> = [];

  if (session.user.role === "AUTISTA") {
    // Viaggi del driver assegnati o in corso
    const trips = (await tenantDb.trips.findMany({
      where: {
        driverId: session.user.id,
        status: { in: ["DA_ASSEGNARE", "ASSEGNATO", "IN_CORSO"] },
      },
      orderBy: { dataRitiro: "asc" },
    })) as unknown as Array<{ id: string; luogoRitiro: string; luogoConsegna: string; dataRitiro: Date; status: string }>;

    for (const t of trips) {
      if (t.status === "ASSEGNATO") {
        notifiche.push({
          id: `trip-part-${t.id}`,
          tipo: "VIAGGIO",
          gravita: "media",
          titolo: "Partenza da confermare",
          dettaglio: `Il viaggio ${t.luogoRitiro} → ${t.luogoConsegna} ti è stato assegnato.`,
          link: `/dashboard/autista/${t.id}`,
          data: t.dataRitiro.toISOString(),
        });
      } else if (t.status === "IN_CORSO") {
        notifiche.push({
          id: `trip-go-${t.id}`,
          tipo: "VIAGGIO",
          gravita: "alta",
          titolo: "Viaggio in corso",
          dettaglio: `${t.luogoRitiro} → ${t.luogoConsegna}: aggiorna posizione e stato consegna.`,
          link: `/dashboard/autista/${t.id}`,
          data: t.dataRitiro.toISOString(),
        });
      }
    }

    // Documenti del suo mezzo
    const vehicles = (await tenantDb.vehicles.findMany({
      where: { drivers: { some: { id: session.user.id } } },
      include: { documents: true },
    })) as unknown as Array<{
      id: string;
      targa: string;
      documents: Array<{ id: string; tipo: string; dataScadenza: Date }>;
    }>;

    for (const v of vehicles) {
      for (const d of v.documents) {
        const gg = Math.ceil((d.dataScadenza.getTime() - now.getTime()) / MS_DAY);
        if (gg <= 14) {
          notifiche.push({
            id: `vehdoc-${d.id}`,
            tipo: "DOCUMENTO",
            gravita: gg < 0 ? "alta" : "media",
            titolo: gg < 0 ? `Documento ${d.tipo} scaduto` : `Documento ${d.tipo} in scadenza`,
            dettaglio: `Mezzo ${v.targa}: ${d.tipo} ${gg < 0 ? "SCADUTO" : `scade tra ${gg} giorni`}.`,
            link: "/dashboard/vehicles",
            data: d.dataScadenza.toISOString(),
          });
        }
      }
    }
  } else {
    // --- UFFICIO / ADMIN / COMMITTENTE ---

    // 1) Documenti veicoli in scadenza
    const vehicles = (await tenantDb.vehicles.findMany({
      include: { documents: true },
    })) as unknown as Array<{
      id: string;
      targa: string;
      documents: Array<{ id: string; tipo: string; dataScadenza: Date }>;
    }>;
    for (const v of vehicles) {
      for (const d of v.documents) {
        const gg = Math.ceil((d.dataScadenza.getTime() - now.getTime()) / MS_DAY);
        if (gg <= 14) {
          notifiche.push({
            id: `vehdoc-${d.id}`,
            tipo: "DOCUMENTO",
            gravita: gg < 0 ? "alta" : "media",
            titolo: gg < 0 ? `Documento ${d.tipo} scaduto` : `Documento ${d.tipo} in scadenza`,
            dettaglio: `Mezzo ${v.targa}: ${d.tipo} ${gg < 0 ? "SCADUTO" : `scade tra ${gg} giorni`}.`,
            link: "/dashboard/vehicles",
            data: d.dataScadenza.toISOString(),
          });
        }
      }
    }

    // 2) KYC da valutare
    const kyc = await tenantDb.kycDocuments.findMany({ where: { status: "IN_ATTESA" } });
    for (const k of kyc) {
      notifiche.push({
        id: `kyc-${k.id}`,
        tipo: "KYC",
        gravita: "media",
        titolo: "Documento KYC da valutare",
        dettaglio: `${k.tipo} in attesa di verifica.`,
        link: "/dashboard/kyc",
      });
    }

    // 3) Viaggi da assegnare
    const trips = (await tenantDb.trips.findMany({
      where: { status: "DA_ASSEGNARE" },
      orderBy: { dataRitiro: "asc" },
    })) as unknown as Array<{ id: string; luogoRitiro: string; luogoConsegna: string; dataRitiro: Date }>;
    for (const t of trips) {
      notifiche.push({
        id: `trip-assign-${t.id}`,
        tipo: "VIAGGIO",
        gravita: "alta",
        titolo: "Viaggio da assegnare",
        dettaglio: `${t.luogoRitiro} → ${t.luogoConsegna} senza mezzo e autista.`,
        link: `/dashboard/trips/${t.id}`,
        data: t.dataRitiro.toISOString(),
      });
    }

    // 4) Prelievi da processare (admin)
    if (session.user.role === "ADMIN") {
      const payout = (await db.$queryRawUnsafe(
        `SELECT * FROM "PayoutRequest"
         WHERE "companyId" = $1 AND "status" IN ('PENDING','PROCESSING')
         ORDER BY "createdAt" ASC`,
        session.user.companyId
      )) as Array<{ id: string; amount: number; status: string; createdAt: Date }>;
      for (const p of payout) {
        notifiche.push({
          id: `payout-${p.id}`,
          tipo: "PRELEVO",
          gravita: "alta",
          titolo: "Prelevo da processare",
          dettaglio: `Richiesta di € ${p.amount.toFixed(2)} (${p.status}).`,
          link: "/dashboard/economia",
          data: p.createdAt.toISOString(),
        });
      }
    }

    // 5) Viaggi completati senza DDT digitale
    const completed = (await tenantDb.trips.findMany({
      where: { status: "COMPLETATO" },
      select: { id: true, luogoRitiro: true, luogoConsegna: true, createdAt: true },
    })) as unknown as Array<{ id: string; luogoRitiro: string; luogoConsegna: string; createdAt: Date }>;

    if (completed.length > 0) {
      const withDocs = (await db.$queryRawUnsafe(
        `SELECT DISTINCT "tripId" FROM "TripDocument" WHERE "companyId" = $1`,
        session.user.companyId
      )) as Array<{ tripId: string }>;
      const idsWith = new Set(withDocs.map((r) => r.tripId));
      for (const t of completed) {
        if (!idsWith.has(t.id)) {
          notifiche.push({
            id: `ddt-missing-${t.id}`,
            tipo: "DDT",
            gravita: "media",
            titolo: "DDT mancante",
            dettaglio: `Viaggio completato ${t.luogoRitiro} → ${t.luogoConsegna} senza documento DDT.`,
            link: `/dashboard/trips/${t.id}`,
            data: t.createdAt.toISOString(),
          });
        }
      }
    }
  }

  notifiche.sort((a, b) => (a.gravita === b.gravita ? 0 : a.gravita === "alta" ? -1 : 1));

  return NextResponse.json({ notifiche, totale: notifiche.length });
}
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";

/**
 * GET /api/search?q=
 * Ricerca reale (tenant-scoped) su mezzi, viaggi e autisti per la topbar.
 * Restituisce al massimo pochi risultati con il link alla pagina pertinente.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const tenantDb = getTenantDb(session.user.companyId);
  const like = q.toLowerCase();

  const [vehicles, users, trips] = await Promise.all([
    tenantDb.vehicles.findMany({ select: { id: true, targa: true, categoria: true } }),
    tenantDb.users.findMany({ select: { id: true, nome: true, cognome: true, email: true, role: true } }),
    tenantDb.trips.findMany({ select: { id: true, luogoRitiro: true, luogoConsegna: true } }),
  ]);

  const results: Array<{ type: string; label: string; sub: string; href: string }> = [];

  for (const v of vehicles) {
    if (v.targa.toLowerCase().includes(like)) {
      results.push({ type: "Mezzo", label: v.targa, sub: v.categoria, href: `/dashboard/vehicles` });
    }
  }
  for (const u of users) {
    if (`${u.nome} ${u.cognome} ${u.email}`.toLowerCase().includes(like)) {
      results.push({
        type: u.role === "AUTISTA" ? "Autista" : "Utente",
        label: `${u.nome} ${u.cognome}`,
        sub: u.email,
        href: `/dashboard/users`,
      });
    }
  }
  for (const t of trips) {
    if (`${t.luogoRitiro} ${t.luogoConsegna}`.toLowerCase().includes(like)) {
      results.push({ type: "Viaggio", label: `${t.luogoRitiro} → ${t.luogoConsegna}`, sub: "Apri dettaglio", href: `/dashboard/trips/${t.id}` });
    }
  }

  return NextResponse.json({ results: results.slice(0, 8) });
}

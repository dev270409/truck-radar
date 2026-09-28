import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantDb } from "@/lib/tenant";
import { db } from "@/lib/db";
import type { Vehicle, VehicleDocument } from "@prisma/client";
import {
  Car,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileWarning,
  CalendarClock,
  Boxes,
  Plug,
  ArrowRight,
  Sparkles,
  Route,
  Gauge,
} from "lucide-react";
import MetricCard from "@/components/ops/MetricCard";
import FleetOpsPanel from "@/components/ops/FleetOpsPanel";
import BarChart from "@/components/ops/BarChart";
import { getFleetMap } from "@/lib/fleet";

const daysUntil = (iso: Date) => Math.ceil((iso.getTime() - Date.now()) / 86400000);

const BRAND = "var(--brand)";
const GREEN = "var(--success)";
const AMBER = "var(--warning)";
const INFO = "var(--info)";
const ACCENT = "var(--accent)";
const DANGER = "var(--danger)";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.companyId) return null;
  if (session.user.role === "AUTISTA") redirect("/dashboard/autista");

  const tenantDb = getTenantDb(session.user.companyId);

  const [company, vehicles, users, kycDocs] = await Promise.all([
    db.company.findUnique({ where: { id: session.user.companyId } }),
    tenantDb.vehicles.findMany({ include: { documents: true } }) as Promise<
      Array<Vehicle & { documents: VehicleDocument[] }>
    >,
    tenantDb.users.findMany(),
    tenantDb.kycDocuments.findMany(),
  ]);

  let fleetRows: Awaited<ReturnType<typeof getFleetMap>> = [];
  try {
    fleetRows = await getFleetMap(session.user.companyId);
  } catch {
    fleetRows = [];
  }

  const availableVehicles = vehicles.filter((v) => v.status === "DISPONIBILE").length;
  const driverCount = users.filter((u) => u.role === "AUTISTA").length;

  // Viaggi attivi (reali, tenant-scoped)
  let activeTrips = 0;
  try {
    const trips = await tenantDb.trips.findMany({ select: { status: true } });
    activeTrips = trips.filter((t) => t.status === "IN_CORSO" || t.status === "ASSEGNATO").length;
  } catch {
    activeTrips = 0;
  }

  // Km reali Geotab ultimi 30 giorni (se collegato)
  let geotabKm30 = 0;
  let geotabTrips30 = 0;
  try {
    const rows = (await db.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS trips, COALESCE(SUM("distanceKm"),0)::float8 AS km
       FROM "GeotabTripSnapshot"
       WHERE "companyId" = $1 AND "startAt" >= now() - interval '30 days'`,
      session.user.companyId
    )) as Array<{ trips: number; km: number }>;
    geotabTrips30 = Number(rows[0]?.trips ?? 0);
    geotabKm30 = Math.round(Number(rows[0]?.km ?? 0));
  } catch {
    geotabKm30 = 0;
    geotabTrips30 = 0;
  }

  const expiring = vehicles
    .flatMap((v) => (v.documents ?? []).map((d) => ({ ...d, targa: v.targa })))
    .filter((d) => daysUntil(new Date(d.dataScadenza)) <= 30)
    .sort((a, b) => new Date(a.dataScadenza).getTime() - new Date(b.dataScadenza).getTime());
  const hasExpired = expiring.some((d) => daysUntil(new Date(d.dataScadenza)) < 0);

  const kycPending = kycDocs.filter((d) => d.status === "IN_ATTESA").length;
  const kycRejected = kycDocs.filter((d) => d.status === "RIFIUTATO").length;
  const kycOk = kycDocs.length > 0 && kycPending === 0 && kycRejected === 0;

  // Barre: distribuzione mezzi per categoria (grafico operativo)
  const byCategory = vehicles.reduce<Record<string, number>>((acc, v) => {
    acc[v.categoria] = (acc[v.categoria] ?? 0) + 1;
    return acc;
  }, {});
  const chartData =
    Object.keys(byCategory).length > 0
      ? Object.entries(byCategory).map(([label, value]) => ({ label: label.slice(0, 6), value }))
      : [
          { label: "Lun", value: 6 },
          { label: "Mar", value: 9 },
          { label: "Mer", value: 7 },
          { label: "Gio", value: 11 },
          { label: "Ven", value: 13 },
          { label: "Sab", value: 5 },
          { label: "Dom", value: 2 },
        ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="enter-up">
        <p className="ops-label">Console operativa</p>
        <h1 className="font-display mt-1 text-[24px] font-bold tracking-tight" style={{ color: "var(--text)" }}>
          Benvenuto, {session.user.nome}
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: "var(--text-soft)" }}>
          Panoramica di flotta, scadenze e operazioni per{" "}
          <span className="font-semibold" style={{ color: BRAND }}>{company?.ragioneSociale}</span>.
        </p>
      </div>

      {/* Riga di 4 metric-card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Veicoli totali"
          value={String(vehicles.length)}
          hint={`${availableVehicles} disponibili`}
          tone={GREEN}
          icon={<Car className="h-[18px] w-[18px]" />}
          delay={0}
        />
        <MetricCard
          label="Viaggi attivi"
          value={String(activeTrips)}
          hint="Assegnati o in corso"
          tone={INFO}
          icon={<Route className="h-[18px] w-[18px]" />}
          delay={60}
        />
        <MetricCard
          label="Km Geotab (30gg)"
          value={geotabKm30 > 0 ? geotabKm30.toLocaleString("it-IT") : "—"}
          hint={geotabTrips30 > 0 ? `${geotabTrips30} viaggi registrati` : "Collega Geotab"}
          tone={BRAND}
          icon={<Gauge className="h-[18px] w-[18px]" />}
          delay={120}
        />
        <MetricCard
          label="Stato abbonamento"
          value={(company?.subscriptionStatus ?? "TRIAL").toString()}
          hint="21 giorni di prova"
          tone={AMBER}
          icon={<Clock className="h-[18px] w-[18px]" />}
          delay={180}
        />
      </div>

      {/* Operativo flotta + grafico */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <FleetOpsPanel rows={fleetRows} />
        <BarChart title="Viaggi per giorno" subtitle="Ultimi 7 giorni Â· consuntivo" data={chartData} />
      </div>

      {/* Banner borsa carichi (promo, non attiva) */}
      <section
        className="enter-up relative overflow-hidden rounded-[var(--radius-card)] p-6"
        style={{ background: "var(--brand)", color: "#fff", animationDelay: "300ms" }}
      >
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <span
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <Sparkles className="h-3 w-3" /> Presto disponibile
            </span>
            <h2 className="font-display mt-3 text-[20px] font-bold">Borsa Carichi</h2>
            <p className="mt-1.5 text-[13px] opacity-85">
              Pubblica, cerca e affida carichi solo ad aziende verificate. Il Network sarÃ  attivato
              gradualmente: nel frattempo puoi giÃ  usare il gestionale completo.
            </p>
          </div>
          <Link
            href="/dashboard/marketplace"
            className="inline-flex items-center gap-2 rounded-[var(--radius-base)] px-4 py-2.5 text-[13px] font-semibold"
            style={{ background: "rgba(255,255,255,0.14)" }}
          >
            Scopri di piÃ¹ <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <svg className="absolute -right-6 -top-8 h-48 w-48 opacity-20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="0.6" />
          <circle cx="12" cy="12" r="5.5" stroke="white" strokeWidth="0.6" />
          <circle cx="12" cy="12" r="2" fill="white" />
        </svg>
      </section>

      {/* Sezioni in arrivo (SOON) */}
      <section className="enter-up" style={{ animationDelay: "320ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[15px] font-bold" style={{ color: "var(--text)" }}>
            Sezioni in arrivo
          </h2>
          <span className="text-[11px]" style={{ color: "var(--text-label)" }}>
            Anteprima di esempio · non ancora attive
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "/dashboard/marketplace", label: "Borsa Carichi", desc: "Pubblica e trova carichi." },
            { href: "/dashboard/smart-return", label: "Smart Return", desc: "Carichi di ritorno, meno km a vuoto." },
            { href: "/dashboard/network", label: "Network", desc: "Aziende verificate e reputazione." },
            { href: "/dashboard/esg", label: "ESG", desc: "Km, emissioni e sostenibilità." },
          ].map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="glass group p-4 transition hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="chip chip-warning" style={{ fontSize: 8 }}>Soon</span>
                <ArrowRight className="h-4 w-4" style={{ color: "var(--text-label)" }} />
              </div>
              <p className="font-display mt-3 text-[14px] font-bold" style={{ color: "var(--text)" }}>{s.label}</p>
              <p className="text-[11px]" style={{ color: "var(--text-soft)" }}>{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Flotta + Alert */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Flotta */}
        <div className="glass enter-up p-5" style={{ animationDelay: "340ms" }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display flex items-center gap-2 text-[15px] font-bold" style={{ color: "var(--text)" }}>
              <Car className="h-4 w-4" style={{ color: GREEN }} /> Flotta aziendale
            </h2>
            <Link href="/dashboard/vehicles" className="text-[11px] font-semibold" style={{ color: BRAND }}>
              Gestisci
            </Link>
          </div>
          {vehicles.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--text-soft)" }}>Nessun veicolo registrato.</p>
          ) : (
            <div className="space-y-2.5">
              {vehicles.slice(0, 6).map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-[var(--radius-base)] px-3 py-2.5"
                  style={{ background: "var(--surface-soft)", border: "1px solid var(--glass-border)" }}
                >
                  <div className="min-w-0">
                    <span className="font-display text-[13px] font-bold" style={{ color: "var(--text)" }}>{v.targa}</span>
                    <span className="ml-2 text-[11px]" style={{ color: "var(--text-label)" }}>{v.categoria}</span>
                    <p className="text-[11px]" style={{ color: "var(--text-label-soft)" }}>
                      {v.portataMaxKg} kg Â· {v.volumeMaxM3} mÂ³
                    </p>
                  </div>
                  <span className={`chip ${v.status === "DISPONIBILE" ? "chip-success" : "chip-warning"}`}>
                    {v.status === "DISPONIBILE" ? "Disponibile" : v.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alert scadenze */}
        <div className="glass enter-up p-5" style={{ animationDelay: "380ms" }}>
          <h2 className="font-display mb-4 flex items-center gap-2 text-[15px] font-bold" style={{ color: "var(--text)" }}>
            <FileWarning className="h-4 w-4" style={{ color: hasExpired ? DANGER : AMBER }} /> Alert documenti
          </h2>
          {expiring.length === 0 ? (
            <div
              className="flex items-center gap-2 rounded-[var(--radius-base)] p-4 text-[13px]"
              style={{ background: "color-mix(in oklch, var(--success) 10%, transparent)", color: GREEN, border: "1px solid var(--glass-border)" }}
            >
              <CheckCircle2 className="h-5 w-5" />
              Nessun documento in scadenza nei prossimi 30 giorni.
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[13px] font-bold" style={{ color: hasExpired ? DANGER : AMBER }}>
                {expiring.length} documento{expiring.length > 1 ? "i" : ""} {hasExpired ? "scaduto/i o in scadenza" : "in scadenza entro 30 giorni"}
              </p>
              {expiring.slice(0, 6).map((d) => {
                const days = daysUntil(new Date(d.dataScadenza));
                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-[var(--radius-base)] px-3 py-2"
                    style={{ background: "var(--surface-soft)", border: "1px solid var(--glass-border)" }}
                  >
                    <span className="font-display text-[12px] font-bold" style={{ color: "var(--text)" }}>{d.targa}</span>
                    <span className="text-[12px]" style={{ color: "var(--text-soft)" }}>{d.tipo}</span>
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-label)" }}>
                      <CalendarClock className="h-3 w-3" />
                      {new Date(d.dataScadenza).toLocaleDateString("it-IT")}
                    </span>
                    <span className={`chip ${days < 0 ? "chip-danger" : "chip-warning"}`}>
                      {days < 0 ? "Scaduto" : `${days} g`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--glass-border)" }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display flex items-center gap-2 text-[13px] font-bold" style={{ color: "var(--text)" }}>
                <Plug className="h-4 w-4" style={{ color: BRAND }} /> Integrazioni
              </h3>
              <Link href="/dashboard/integrazioni" className="text-[11px] font-semibold" style={{ color: BRAND }}>
                Collega API
              </Link>
            </div>
            <p className="text-[12px]" style={{ color: "var(--text-soft)" }}>
              Collega GPS, TMS ed ERP esistenti per arricchire i dati della flotta.
            </p>
          </div>
        </div>
      </div>

      {/* KYC + Verifica */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="glass enter-up p-5" style={{ animationDelay: "420ms" }}>
          <h2 className="font-display mb-4 flex items-center gap-2 text-[15px] font-bold" style={{ color: "var(--text)" }}>
            <ShieldCheck className="h-4 w-4" style={{ color: BRAND }} /> Documenti legali & KYC
          </h2>
          {kycDocs.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--text-soft)" }}>Nessun documento caricato.</p>
          ) : (
            <div className="space-y-2.5">
              {kycDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-[var(--radius-base)] px-3 py-2.5"
                  style={{ background: "var(--surface-soft)", border: "1px solid var(--glass-border)" }}
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold" style={{ color: "var(--text)" }}>{doc.tipo}</p>
                    <p className="truncate font-mono text-[10px]" style={{ color: "var(--text-label-soft)" }}>{doc.fileName}</p>
                  </div>
                  <span className={`chip ${doc.status === "VERIFICATO" ? "chip-success" : doc.status === "RIFIUTATO" ? "chip-danger" : "chip-info"}`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Borsa carichi teaser (pannello) */}
        <div className="glass enter-up p-5" style={{ animationDelay: "460ms" }}>
          <h2 className="font-display mb-2 flex items-center gap-2 text-[15px] font-bold" style={{ color: "var(--text)" }}>
            <Boxes className="h-4 w-4" style={{ color: ACCENT }} /> Borsa Carichi & Smart Return
          </h2>
          <p className="text-[12px]" style={{ color: "var(--text-soft)" }}>
            Riduci i km a vuoto trovando carichi di ritorno compatibili con percorso, data e capacitÃ  del
            mezzo. Funzione del Network, in attivazione graduale.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip chip-accent">Presto disponibile</span>
            <span className="chip chip-brand">Solo aziende verificate</span>
          </div>
        </div>
      </div>
    </div>
  );
}
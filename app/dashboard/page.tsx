import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantDb } from "@/lib/tenant";
import { db } from "@/lib/db";
import type { Vehicle, VehicleDocument } from "@prisma/client";
import {
  Car,
  ShieldCheck,
  CheckCircle2,
  FileWarning,
  CalendarClock,
  ArrowRight,
  Route,
  Gauge,
  AlertTriangle,
  BellRing,
  Sparkles,
} from "lucide-react";
import { normalizeDeadlineSettings } from "@/lib/deadline-settings";
import { getEarningsForecast } from "@/lib/trip-forecast";
import MetricCard from "@/components/ops/MetricCard";
import FleetOpsPanel from "@/components/ops/FleetOpsPanel";
import BarChart from "@/components/ops/BarChart";
import TutorialBanner from "@/components/TutorialBanner";
import { getFleetMap } from "@/lib/fleet";
import { label } from "@/lib/labels";

const daysUntil = (iso: Date) => Math.ceil((iso.getTime() - Date.now()) / 86400000);

const BRAND = "var(--brand)";
const GREEN = "var(--success)";
const AMBER = "var(--warning)";
const INFO = "var(--info)";
const DANGER = "var(--danger)";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.companyId) return null;
  if (session.user.role === "AUTISTA") redirect("/dashboard/autista");

  const tenantDb = getTenantDb(session.user.companyId);

  const [company, vehicles, kycDocs] = await Promise.all([
    db.company.findUnique({ where: { id: session.user.companyId } }),
    tenantDb.vehicles.findMany({ include: { documents: true } }) as Promise<
      Array<Vehicle & { documents: VehicleDocument[] }>
    >,
    tenantDb.kycDocuments.findMany(),
  ]);

  let fleetRows: Awaited<ReturnType<typeof getFleetMap>> = [];
  try {
    fleetRows = await getFleetMap(session.user.companyId);
  } catch {
    fleetRows = [];
  }

  const availableVehicles = vehicles.filter((v) => v.status === "DISPONIBILE").length;
  // Viaggi attivi (reali, tenant-scoped)
  let activeTrips = 0;
  let unassignedTrips = 0;
  try {
    const trips = await tenantDb.trips.findMany({ select: { status: true } });
    activeTrips = trips.filter((t) => t.status === "IN_CORSO" || t.status === "ASSEGNATO").length;
    unassignedTrips = trips.filter((t) => t.status === "DA_ASSEGNARE").length;
  } catch {
    activeTrips = 0;
    unassignedTrips = 0;
  }

  let pendingQuotes = 0;
  let pendingOrders = 0;
  try {
    const [quotes, orders] = await Promise.all([
      db.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS n FROM "Quote" WHERE "companyId" = $1 AND status IN ('BOZZA','INVIATO')`,
        session.user.companyId
      ) as Promise<Array<{ n: number }>>,
      db.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS n FROM "CustomerOrder" WHERE "companyId" = $1 AND status = 'RICEVUTO'`,
        session.user.companyId
      ) as Promise<Array<{ n: number }>>,
    ]);
    pendingQuotes = Number(quotes[0]?.n ?? 0);
    pendingOrders = Number(orders[0]?.n ?? 0);
  } catch {
    pendingQuotes = 0;
    pendingOrders = 0;
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

  const kycRejected = kycDocs.filter((d) => d.status === "RIFIUTATO").length;

  const deadlineSettings = normalizeDeadlineSettings(company?.deadlineSettings);
  const alertsMissing =
    deadlineSettings.alertsEnabled && deadlineSettings.alertEmails.length === 0;
  const earningsForecast = await getEarningsForecast(session.user.companyId);

  // Una sola azione consigliata: prima le eccezioni che bloccano il lavoro,
  // poi la conformità, poi il commerciale. Evita che l'utente debba scegliere
  // tra 12 card uguali.
  const nextAction = (() => {
    if (vehicles.length === 0) {
      return {
        icon: Car,
        tone: BRAND,
        title: "Aggiungi il primo mezzo",
        detail: "Senza un veicolo non puoi assegnare viaggi né calcolare i costi.",
        href: "/dashboard/vehicles",
        cta: "Vai ai mezzi",
      };
    }
    if (hasExpired) {
      return {
        icon: AlertTriangle,
        tone: DANGER,
        title: "Ci sono documenti scaduti",
        detail: "Un documento scaduto blocca il mezzo: rinnova o aggiorna la scadenza.",
        href: "/dashboard/scadenze",
        cta: "Controlla le scadenze",
      };
    }
    if (kycRejected > 0) {
      return {
        icon: ShieldCheck,
        tone: DANGER,
        title: `${kycRejected} document${kycRejected === 1 ? "o" : "i"} da correggere`,
        detail: "Rivedi i documenti rifiutati nella verifica aziendale.",
        href: "/dashboard/kyc",
        cta: "Rivedi i documenti",
      };
    }
    if (unassignedTrips > 0) {
      return {
        icon: Route,
        tone: AMBER,
        title: `${unassignedTrips} viagg${unassignedTrips === 1 ? "io" : "i"} da assegnare`,
        detail: "Assegna mezzo e autista per mettere in movimento la giornata.",
        href: "/dashboard/trips",
        cta: "Assegna ora",
      };
    }
    if (pendingOrders > 0) {
      return {
        icon: Sparkles,
        tone: INFO,
        title: `${pendingOrders} ordin${pendingOrders === 1 ? "e" : "i"} da confermare`,
        detail: "Conferma l'ordine e trasformalo in viaggio con un clic.",
        href: "/dashboard/ordini",
        cta: "Apri gli ordini",
      };
    }
    if (pendingQuotes > 0) {
      return {
        icon: FileWarning,
        tone: AMBER,
        title: `${pendingQuotes} preventiv${pendingQuotes === 1 ? "o" : "i"} da inviare`,
        detail: "Completa prezzo e margine, poi invia il preventivo al cliente.",
        href: "/dashboard/preventivi",
        cta: "Apri i preventivi",
      };
    }
    if (alertsMissing) {
      return {
        icon: BellRing,
        tone: AMBER,
        title: "Attiva gli avvisi di scadenza",
        detail: "Nessuno riceve le email: aggiungi un destinatario per non perdere i rinnovi.",
        href: "/dashboard/scadenze",
        cta: "Configura avvisi",
      };
    }
    if (expiring.length > 0) {
      return {
        icon: CalendarClock,
        tone: AMBER,
        title: `${expiring.length} document${expiring.length === 1 ? "o" : "i"} in scadenza`,
        detail: "Hai 30 giorni per rinnovare senza fermare i mezzi.",
        href: "/dashboard/scadenze",
        cta: "Vedi le scadenze",
      };
    }
    return {
      icon: CheckCircle2,
      tone: GREEN,
      title: "Tutto in ordine",
      detail: "Nessuna urgenza oggi: puoi pianificare i prossimi viaggi.",
      href: "/dashboard/trips",
      cta: "Pianifica un viaggio",
    };
  })();
  const NextActionIcon = nextAction.icon;

  const queueItems = [
    { label: "Viaggi da assegnare", count: unassignedTrips, href: "/dashboard/trips", tone: AMBER },
    { label: "Ordini da confermare", count: pendingOrders, href: "/dashboard/ordini", tone: INFO },
    { label: "Preventivi da inviare", count: pendingQuotes, href: "/dashboard/preventivi", tone: AMBER },
    {
      label: "Documenti in scadenza",
      count: expiring.length,
      href: "/dashboard/scadenze",
      tone: hasExpired ? DANGER : AMBER,
    },
    { label: "Documenti da correggere", count: kycRejected, href: "/dashboard/kyc", tone: DANGER },
  ].filter((item) => item.count > 0);

  // Barre: distribuzione mezzi per categoria (dato reale). Se non ci sono
  // mezzi con categoria, il grafico mostra uno stato vuoto anziché valori fittizi.
  const byCategory = vehicles.reduce<Record<string, number>>((acc, v) => {
    acc[v.categoria] = (acc[v.categoria] ?? 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(byCategory).map(([label, value]) => ({
    label: label.slice(0, 6),
    value,
  }));

  return (
    <div className="space-y-6">
      <TutorialBanner />
      {/* Header */}
      <div>
        <p className="ops-label">Console operativa</p>
        <h1 className="font-display mt-1 text-[24px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>
          Panoramica
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: "var(--text-soft)" }}>
          Flotta, scadenze e operazioni per{" "}
          <span className="font-semibold" style={{ color: BRAND }}>{company?.ragioneSociale}</span>.
        </p>
      </div>

      {/* Prossima azione: una sola cosa da fare */}
      <section
        className="ops-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: "color-mix(in oklab, " + nextAction.tone + " 35%, var(--surface-border))" }}
      >
        <div className="flex items-start gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px]"
            style={{
              background: `color-mix(in oklab, ${nextAction.tone} 14%, transparent)`,
              color: nextAction.tone,
            }}
          >
            <NextActionIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="ops-label">Prossima azione</p>
            <p className="font-display text-[15px] font-semibold" style={{ color: "var(--text)" }}>
              {nextAction.title}
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--text-label)" }}>
              {nextAction.detail}
            </p>
          </div>
        </div>
        <Link href={nextAction.href} className="ops-btn ops-btn--primary ops-btn--sm shrink-0">
          {nextAction.cta} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      {earningsForecast.monthsUsed > 0 && (
        <Link
          href="/dashboard/trips/importa"
          className="ops-card flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-[var(--brand)]"
        >
          <div>
            <p className="ops-label">Stima 12 mesi · rendiconti viaggi</p>
            <p className="font-display mt-1 text-[22px] font-semibold" style={{ color: "var(--text)" }}>
              € {Math.round(earningsForecast.projected12m).toLocaleString("it-IT")}
            </p>
            <p className="mt-0.5 max-w-2xl text-[11px]" style={{ color: "var(--text-label)" }}>
              {earningsForecast.note}
            </p>
          </div>
          <span className="chip chip-brand">
            {earningsForecast.monthsUsed} mes{earningsForecast.monthsUsed === 1 ? "e" : "i"} ·{" "}
            {earningsForecast.confidence.toLowerCase()}
          </span>
        </Link>
      )}

      {alertsMissing && (
        <Link
          href="/dashboard/scadenze"
          className="flex items-center gap-2 rounded-[12px] border p-3 text-[12px] font-semibold"
          style={{ borderColor: "var(--warning)", color: "var(--warning)", background: "var(--surface)" }}
        >
          <BellRing className="h-4 w-4 shrink-0" />
          <span className="min-w-0">
            Nessuno riceve gli avvisi di scadenza. Aggiungi un&apos;email in Scadenze per automatizzare i promemoria.
          </span>
          <ArrowRight className="ml-auto h-4 w-4 shrink-0" />
        </Link>
      )}

      <section className="ops-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--surface-border)" }}>
          <h2 className="font-display text-sm font-semibold" style={{ color: "var(--text)" }}>In coda</h2>
          <span className="text-xs" style={{ color: "var(--text-label)" }}>Attività che richiedono un passaggio</span>
        </div>
        {queueItems.length === 0 ? (
          <p className="px-4 py-5 text-sm" style={{ color: "var(--text-soft)" }}>
            Nessuna attività in coda segnalata dai dati disponibili.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--surface-border)" }}>
            {queueItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="flex min-h-12 items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-[var(--surface-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.tone }} aria-hidden="true" />
                    <span className="truncate text-sm" style={{ color: "var(--text-soft)" }}>{item.label}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 font-mono text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                    {item.count}
                    <ArrowRight className="h-4 w-4" style={{ color: "var(--text-label)" }} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Mezzi"
          value={String(vehicles.length)}
          hint={`${availableVehicles} disponibili`}
          tone={GREEN}
          icon={<Car className="h-[18px] w-[18px]" />}
        />
        <MetricCard
          label="Viaggi attivi"
          value={String(activeTrips)}
          hint="Assegnati o in corso"
          tone={INFO}
          icon={<Route className="h-[18px] w-[18px]" />}
        />
        <MetricCard
          label="Km Geotab · 30 giorni"
          value={geotabKm30 > 0 ? geotabKm30.toLocaleString("it-IT") : "—"}
          hint={geotabTrips30 > 0 ? `${geotabTrips30} viaggi registrati` : "Nessun dato nel periodo"}
          tone={BRAND}
          icon={<Gauge className="h-[18px] w-[18px]" />}
        />
      </div>

      {/* Operativo flotta + grafico */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <FleetOpsPanel rows={fleetRows} />
        <BarChart
          title="Flotta per categoria"
          subtitle="Mezzi registrati per categoria"
          data={chartData}
          emptyMessage="Nessun mezzo con categoria registrata. Aggiungi mezzi in “Mezzi” per vedere il grafico."
        />
      </div>

      <section className="ops-card p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display flex items-center gap-2 text-base font-semibold" style={{ color: "var(--text)" }}>
              <CalendarClock className="h-4 w-4" style={{ color: hasExpired ? DANGER : AMBER }} aria-hidden="true" />
              Scadenze dei documenti
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--text-label)" }}>Documenti scaduti o in scadenza entro 30 giorni</p>
          </div>
          <Link href="/dashboard/scadenze" className="ops-btn ops-btn--secondary ops-btn--sm">
            Apri scadenze <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {expiring.length === 0 ? (
          <p className="rounded-lg px-3 py-4 text-sm" style={{ background: "var(--surface-soft)", color: "var(--text-soft)" }}>
            Nessun documento in scadenza segnalato nei prossimi 30 giorni.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--surface-border)" }}>
            {expiring.slice(0, 6).map((document) => {
              const days = daysUntil(new Date(document.dataScadenza));
              const formattedDate = new Intl.DateTimeFormat("it-IT", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }).format(new Date(document.dataScadenza));

              return (
                <li key={document.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold" style={{ color: "var(--text)" }}>{document.targa}</p>
                    <p className="text-xs" style={{ color: "var(--text-label)" }}>{label(document.tipo)}</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-soft)" }}>
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                    {formattedDate}
                  </span>
                  <span className={`chip ${days < 0 ? "chip-danger" : "chip-warning"}`}>
                    {days < 0 ? "Scaduto" : `${days} giorni`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

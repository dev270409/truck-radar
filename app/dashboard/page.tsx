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
  Plug,
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
import { getFleetMap } from "@/lib/fleet";
import { label, fileNameLabel } from "@/lib/labels";

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

  const kycPending = kycDocs.filter((d) => d.status === "IN_ATTESA").length;
  const kycRejected = kycDocs.filter((d) => d.status === "RIFIUTATO").length;
  const kycOk = kycDocs.length > 0 && kycPending === 0 && kycRejected === 0;

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

      {/* Prossima azione: una sola cosa da fare */}
      <section
        className="ops-card enter-up flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        style={{ animationDelay: "20ms", borderColor: "color-mix(in oklab, " + nextAction.tone + " 35%, var(--surface-border))" }}
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
            <p className="font-display text-[15px] font-bold" style={{ color: "var(--text)" }}>
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
          className="ops-card enter-up flex flex-wrap items-center justify-between gap-3 p-4 transition hover:-translate-y-0.5"
          style={{ animationDelay: "30ms" }}
        >
          <div>
            <p className="ops-label">Stima 12 mesi · rendiconti viaggi</p>
            <p className="font-display mt-1 text-[22px] font-bold" style={{ color: "var(--text)" }}>
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
          className="enter-up flex items-center gap-2 rounded-[12px] border p-3 text-[12px] font-semibold"
          style={{ borderColor: "var(--warning)", color: "var(--warning)", background: "var(--surface)" }}
        >
          <BellRing className="h-4 w-4 shrink-0" />
          <span className="min-w-0">
            Nessuno riceve gli avvisi di scadenza. Aggiungi un&apos;email in Scadenze per automatizzare i promemoria.
          </span>
          <ArrowRight className="ml-auto h-4 w-4 shrink-0" />
        </Link>
      )}

      {/* Da fare oggi */}
      <section className="enter-up" style={{ animationDelay: "40ms" }}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="ops-label">Da fare oggi</h2>
          <Link href="/dashboard/trips" className="text-[11px] font-semibold" style={{ color: "var(--brand)" }}>
            Apri operatività <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: "Viaggi da assegnare", value: unassignedTrips, href: "/dashboard/trips", tone: unassignedTrips > 0 ? AMBER : GREEN },
            { label: "Preventivi da inviare", value: pendingQuotes, href: "/dashboard/preventivi", tone: pendingQuotes > 0 ? AMBER : GREEN },
            { label: "Ordini da confermare", value: pendingOrders, href: "/dashboard/ordini", tone: pendingOrders > 0 ? AMBER : GREEN },
            { label: "Scadenze entro 30gg", value: expiring.length + kycPending, href: "/dashboard/scadenze", tone: expiring.length + kycPending > 0 ? DANGER : GREEN },
          ].map((item) => (
            <Link key={item.label} href={item.href} className="ops-card flex items-center justify-between gap-3 p-4 transition hover:-translate-y-0.5">
              <div>
                <p className="text-[10px] font-semibold" style={{ color: "var(--text-label)" }}>{item.label}</p>
                <p className="font-display mt-1 text-[24px] font-bold leading-none" style={{ color: item.tone }}>{item.value}</p>
              </div>
              <ArrowRight className="h-4 w-4" style={{ color: "var(--text-label-soft)" }} />
            </Link>
          ))}
        </div>
      </section>

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
          value={label(company?.subscriptionStatus ?? "TRIAL")}
          hint="21 giorni di prova"
          tone={AMBER}
          icon={<Clock className="h-[18px] w-[18px]" />}
          delay={180}
        />
      </div>

      {/* Operativo flotta + grafico */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <FleetOpsPanel rows={fleetRows} />
        <BarChart
          title="Flotta per categoria"
          subtitle="Distribuzione reale dei tuoi mezzi"
          data={chartData}
          emptyMessage="Nessun mezzo con categoria registrata. Aggiungi mezzi in “Mezzi” per vedere il grafico."
        />
      </div>

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
                      {v.portataMaxKg} kg · {v.volumeMaxM3} m³
                    </p>
                  </div>
                  <span className={`chip ${v.status === "DISPONIBILE" ? "chip-success" : "chip-warning"}`}>
                    {label(v.status)}
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
                    <span className="text-[12px]" style={{ color: "var(--text-soft)" }}>{label(d.tipo)}</span>
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
      <div className="grid gap-5">
        <div className="glass enter-up min-w-0 p-5" style={{ animationDelay: "420ms" }}>
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
                    <p className="text-[12px] font-bold" style={{ color: "var(--text)" }}>{label(doc.tipo)}</p>
                    <p className="truncate font-mono text-[10px]" style={{ color: "var(--text-label-soft)" }}>{fileNameLabel(doc.fileName)}</p>
                  </div>
                  <span className={`chip ${doc.status === "VERIFICATO" ? "chip-success" : doc.status === "RIFIUTATO" ? "chip-danger" : "chip-info"}`}>
                    {label(doc.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Fuel,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { label } from "@/lib/labels";
import { RevenueLineChart } from "@/components/ops/RevenueLineChart";

interface BenchmarkVehicle {
  vehicleId: string;
  targa: string;
  categoria: string;
  km: number;
  kmSource: "GEOTAB" | "TRIPKM" | "NESSUNO";
  geotabTrips: number;
  paidTrips: number;
  coveragePct: number;
  fuelLiters: number;
  fuelCost: number;
  fuelSource: "RIFORNIMENTI" | "STIMA" | "NESSUNO";
  kmPerLitro: number | null;
  otherCost: number;
  totalCost: number;
  costPerKm: number | null;
  revenue: number;
  revenuePerKm: number | null;
  marginPerKm: number | null;
  avgRevenuePerTrip: number | null;
  vsCompanyCostPct: number | null;
  vsCompanyRevenuePct: number | null;
}

interface BenchmarkCategory {
  categoria: string;
  vehicles: number;
  km: number;
  geotabTrips: number;
  paidTrips: number;
  coveragePct: number;
  fuelCost: number;
  otherCost: number;
  totalCost: number;
  costPerKm: number | null;
  revenue: number;
  revenuePerKm: number | null;
  marginPerKm: number | null;
  kmPerLitro: number | null;
}

interface Benchmark {
  periodMonths: number;
  from: string;
  to: string;
  totals: {
    km: number;
    geotabTrips: number;
    paidTrips: number;
    coveragePct: number;
    fuelCost: number;
    otherCost: number;
    totalCost: number;
    costPerKm: number | null;
    revenue: number;
    revenuePerKm: number | null;
    marginPerKm: number | null;
  };
  categories: BenchmarkCategory[];
  vehicles: BenchmarkVehicle[];
  forecast: {
    monthsUsed: number;
    projected12m: number;
    confidence: "BASSA" | "MEDIA" | "ALTA";
    note: string;
  };
  warnings: string[];
}

const eur = (value: number | null | undefined) =>
  value == null
    ? "—"
    : `€ ${value.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const kmValue = (value: number) =>
  `${value.toLocaleString("it-IT", { maximumFractionDigits: 0 })} km`;

export default function BenchmarkPage() {
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
  const [monthly, setMonthly] = useState<Array<{ label: string; value: number; trips: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const [res, resMonthly] = await Promise.all([
          fetch("/api/benchmark"),
          fetch("/api/benchmark/monthly"),
        ]);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Errore nel calcolo del benchmark.");
        setBenchmark(data.benchmark);
        if (resMonthly.ok) {
          const monthlyData = await resMonthly.json();
          setMonthly(monthlyData.months ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ops-label">Analisi automatica</p>
          <h1 className="ops-title mt-1 flex items-center gap-2 text-2xl">
            <BarChart3 className="h-6 w-6" style={{ color: "var(--brand)" }} /> Benchmark flotta
          </h1>
          <p className="ops-subtitle mt-1 max-w-3xl text-[13px]">
            Confronta i dati registrati. Copertura, fonti dei chilometri e stime dei costi sono indicate accanto ai valori.
          </p>
        </div>
        <Link href="/dashboard/trips/importa" className="ops-btn ops-btn--secondary ops-btn--sm">
          Importa rendiconto <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {error && (
        <div
          className="rounded-[12px] border p-3 text-[13px]"
          style={{ borderColor: "var(--danger)", color: "var(--danger)", background: "var(--surface)" }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="ops-card flex items-center justify-center gap-2 p-12 text-[13px]" style={{ color: "var(--text-label)" }}>
          <Loader2 className="h-5 w-5 animate-spin" /> Calcolo benchmark…
        </div>
      ) : !benchmark ? (
        <div className="ops-card p-10 text-center text-[13px]" style={{ color: "var(--text-label)" }}>
          Nessun dato disponibile.
        </div>
      ) : (
        <>
          <section className="ops-card p-4 md:p-5" aria-labelledby="coverage-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="coverage-heading" className="font-display text-sm font-semibold" style={{ color: "var(--text)" }}>
                  Copertura dei rendiconti
                </h2>
                <p className="mt-1 text-xs" style={{ color: "var(--text-label)" }}>
                  {benchmark.totals.geotabTrips > 0
                    ? `${benchmark.totals.paidTrips} di ${benchmark.totals.geotabTrips} viaggi Geotab collegati`
                    : "Nessun viaggio Geotab nel periodo"}
                </p>
              </div>
              <p className="font-display text-2xl font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                {benchmark.totals.geotabTrips > 0 ? `${benchmark.totals.coveragePct}%` : "—"}
              </p>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full"
              style={{ background: "var(--surface-soft)" }}
              role="progressbar"
              aria-label="Copertura dei rendiconti sui viaggi Geotab"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={benchmark.totals.geotabTrips > 0 ? benchmark.totals.coveragePct : 0}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${benchmark.totals.geotabTrips > 0 ? benchmark.totals.coveragePct : 0}%`,
                  background: "var(--brand)",
                }}
              />
            </div>
          </section>

          {benchmark.warnings.length > 0 && (
            <div
              className="rounded-[12px] border p-3 text-[12px]"
              style={{ borderColor: "var(--warning)", color: "var(--warning)", background: "var(--surface)" }}
            >
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" /> Come leggere questi numeri
              </p>
              <ul className="mt-1 list-inside list-disc">
                {benchmark.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label={`Km rilevati · ${benchmark.periodMonths} mesi`} value={kmValue(benchmark.totals.km)} tone="var(--info)" />
            <Kpi label="Ricavo/km" value={eur(benchmark.totals.revenuePerKm)} tone="var(--success)" />
            <Kpi label="Costo/km · può includere stime" value={eur(benchmark.totals.costPerKm)} tone="var(--warning)" />
            <Kpi
              label={`Stima 12 mesi · ${benchmark.forecast.monthsUsed} mesi`}
              value={`€ ${Math.round(benchmark.forecast.projected12m).toLocaleString("it-IT")}`}
              tone="var(--brand)"
            />
          </div>

          {monthly.length > 0 && (
            <RevenueLineChart
              data={monthly.map((m) => ({ label: m.label, value: m.value }))}
              title="Ricavi mensili da rendiconti"
              subtitle="Totale importi per mese di competenza. Solo rendiconti importati e confermati."
              height={200}
            />
          )}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="ops-label">Benchmark per categoria</h2>
              <span className="text-[10px]" style={{ color: "var(--text-label-soft)" }}>
                {benchmark.from} → {benchmark.to}
              </span>
            </div>
            {benchmark.categories.length === 0 ? (
              <div className="ops-card p-8 text-center text-[12px]" style={{ color: "var(--text-label)" }}>
                Servono mezzi, km Geotab e almeno un rendiconto importato.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {benchmark.categories.map((category, index) => (
                  <div key={category.categoria} className="ops-card p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-display text-[15px] font-bold" style={{ color: "var(--text)" }}>
                        {label(category.categoria)}
                      </p>
                      {index === 0 ? (
                        <TrendingUp className="h-4 w-4" style={{ color: "var(--success)" }} />
                      ) : index === benchmark.categories.length - 1 ? (
                        <TrendingDown className="h-4 w-4" style={{ color: "var(--danger)" }} />
                      ) : null}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <Metric label="Costo/km" value={eur(category.costPerKm)} />
                      <Metric label="Ricavo/km" value={eur(category.revenuePerKm)} />
                      <Metric
                        label="Margine/km"
                        value={eur(category.marginPerKm)}
                        tone={(category.marginPerKm ?? 0) >= 0 ? "var(--success)" : "var(--danger)"}
                      />
                      <Metric label="Consumo" value={category.kmPerLitro ? `${category.kmPerLitro} km/l` : "—"} />
                      <Metric label="Km" value={kmValue(category.km)} />
                      <Metric label="Mezzi" value={String(category.vehicles)} />
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t pt-2 text-[10px]" style={{ borderColor: "var(--surface-border)" }}>
                      <span style={{ color: "var(--text-label)" }}>
                        {category.paidTrips}/{category.geotabTrips} viaggi collegati
                      </span>
                      <span
                        className="chip chip-info"
                        style={{ fontSize: 8 }}
                      >
                        {category.coveragePct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="ops-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4" style={{ borderColor: "var(--surface-border)" }}>
              <div>
                <h2 className="font-display text-[14px] font-bold" style={{ color: "var(--text)" }}>
                  Dettaglio per mezzo
                </h2>
                <p className="text-[11px]" style={{ color: "var(--text-label)" }}>
                  Valori indicativi: i ricavi dipendono dai viaggi collegati e i costi possono includere stime.
                </p>
              </div>
              <span className="chip chip-brand">{benchmark.vehicles.length} mezzi</span>
            </div>
            <div className="overflow-x-auto">
              <table className="ops-table w-full text-left">
                <thead>
                  <tr>
                    <th>Mezzo</th>
                    <th className="text-right">Km</th>
                    <th className="text-right">Costo/km</th>
                    <th className="text-right">Ricavo/km</th>
                    <th className="text-right">Margine/km</th>
                    <th className="text-right">Consumo</th>
                    <th className="text-right">Copertura</th>
                    <th>Fonti</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmark.vehicles.map((vehicle) => (
                    <tr key={vehicle.vehicleId}>
                      <td>
                        <p className="font-mono text-[12px] font-semibold" style={{ color: "var(--text)" }}>
                          {vehicle.targa}
                        </p>
                        <p className="text-[10px]" style={{ color: "var(--text-label)" }}>{label(vehicle.categoria)}</p>
                      </td>
                      <td className="text-right text-[12px]" style={{ color: "var(--text-soft)" }}>{kmValue(vehicle.km)}</td>
                      <td className="text-right font-mono text-[12px]" style={{ color: "var(--text)" }}>
                        {eur(vehicle.costPerKm)}
                        {vehicle.vsCompanyCostPct != null && (
                          <span className="block text-[9px]" style={{ color: vehicle.vsCompanyCostPct <= 0 ? "var(--success)" : "var(--danger)" }}>
                            {vehicle.vsCompanyCostPct > 0 ? "+" : ""}{vehicle.vsCompanyCostPct}% vs media
                          </span>
                        )}
                      </td>
                      <td className="text-right font-mono text-[12px]" style={{ color: "var(--text)" }}>
                        {eur(vehicle.revenuePerKm)}
                        {vehicle.vsCompanyRevenuePct != null && (
                          <span className="block text-[9px]" style={{ color: vehicle.vsCompanyRevenuePct >= 0 ? "var(--success)" : "var(--danger)" }}>
                            {vehicle.vsCompanyRevenuePct > 0 ? "+" : ""}{vehicle.vsCompanyRevenuePct}% vs media
                          </span>
                        )}
                      </td>
                      <td className="text-right font-mono text-[12px]" style={{ color: (vehicle.marginPerKm ?? 0) >= 0 ? "var(--success)" : "var(--danger)" }}>
                        {eur(vehicle.marginPerKm)}
                      </td>
                      <td className="text-right text-[12px]" style={{ color: "var(--text-soft)" }}>
                        {vehicle.kmPerLitro ? `${vehicle.kmPerLitro} km/l` : "—"}
                      </td>
                      <td className="text-right">
                        <span className="chip chip-info" style={{ fontSize: 8 }}>
                          {vehicle.coveragePct}%
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          <span className="chip chip-info" style={{ fontSize: 8 }} title="Fonte km">
                            {vehicle.kmSource === "GEOTAB" ? "Geotab" : vehicle.kmSource === "TRIPKM" ? "Viaggi" : "No km"}
                          </span>
                          <span className="chip chip-warning" style={{ fontSize: 8 }} title="Fonte carburante">
                            <Fuel className="mr-0.5 inline h-2.5 w-2.5" />
                            {vehicle.fuelSource === "RIFORNIMENTI" ? "Reale" : vehicle.fuelSource === "STIMA" ? "Stima" : "—"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-[11px]" style={{ color: "var(--text-label-soft)" }}>
            Il costo/km include carburante (reale o stimato) e costi mezzi registrati; non include il
            costo autista. Il ricavo/km usa solo i rendiconti importati: più mesi/provider importi,
            più il margine diventa preciso.
          </p>
        </>
      )}
    </div>
  );
}

function Kpi({ label: title, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="ops-card p-4">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: tone }} />
        <p className="ops-label">{title}</p>
      </div>
      <p className="font-display mt-2 text-[17px] font-bold" style={{ color: "var(--text)" }}>{value}</p>
    </div>
  );
}

function Metric({ label: title, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="ops-label" style={{ fontSize: 9 }}>{title}</p>
      <p className="font-mono font-semibold" style={{ color: tone ?? "var(--text)" }}>{value}</p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Clock3, Route, Truck, UserRound, AlertCircle } from "lucide-react";

interface GroupRow {
  name: string;
  trips: number;
  km: number;
}

interface GeotabAnalytics {
  connected: boolean;
  from?: string;
  to?: string;
  historyFetchedAt?: string | null;
  historyWarning?: string | null;
  totalTrips: number;
  totalKm: number;
  byVehicle: GroupRow[];
  byDriver: GroupRow[];
  trips: Array<{ id: string; vehicle: string; driver: string; startAt: string; stopAt: string | null; km: number | null }>;
  truncated?: boolean;
  unladenKmReason?: string;
}

export default function GeotabAnalyticsPanel({ from, to, scope }: { from: string; to: string; scope: "veicolo" | "autista" }) {
  const [data, setData] = useState<GeotabAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59.999`).toISOString());
    setLoading(true);
    setError("");
    fetch(`/api/analytics/geotab?${params.toString()}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Errore nel caricamento dello storico Geotab.");
        if (active) setData(body);
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : String(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to]);

  const rows = scope === "veicolo" ? data?.byVehicle ?? [] : data?.byDriver ?? [];

  return (
    <section className="overflow-hidden rounded-2xl border border-sky-800/50 bg-slate-900/80">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <Route className="h-4 w-4 text-sky-300" /> Storico telematico Geotab
          </h2>
          <p className="mt-1 text-xs text-slate-400">Viaggi e chilometri registrati da Geotab; non sono stime AI.</p>
        </div>
        {data?.historyFetchedAt && (
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <Clock3 className="h-3 w-3" /> Ultima lettura {new Date(data.historyFetchedAt).toLocaleString("it-IT")}
          </span>
        )}
      </div>

      {loading ? (
        <div className="p-6 text-sm text-slate-400">Caricamento storico Geotab…</div>
      ) : error ? (
        <div className="flex items-center gap-2 p-5 text-sm text-red-200"><AlertCircle className="h-4 w-4" />{error}</div>
      ) : !data?.connected ? (
        <div className="p-6 text-sm text-slate-400">
          Collega Geotab in <strong className="text-slate-200">Integrazioni</strong> e usa “Aggiorna da Geotab” per caricare lo storico degli ultimi 90 giorni.
        </div>
      ) : data.totalTrips === 0 ? (
        <div className="p-6 text-sm text-slate-400">
          {data.historyWarning ? <span className="text-amber-200">Lettura storico non completata: {data.historyWarning}</span> : <>Nessun viaggio Geotab salvato nel periodo. Apri <strong className="text-slate-200">Flotta Live</strong> e premi “Aggiorna da Geotab”.</>}
        </div>
      ) : (
        <div className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Viaggi Geotab</p>
              <p className="mt-1 text-xl font-bold text-slate-100">{data.totalTrips.toLocaleString("it-IT")}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Distanza registrata</p>
              <p className="mt-1 text-xl font-bold text-slate-100">{data.totalKm.toLocaleString("it-IT", { maximumFractionDigits: 1 })} km</p>
            </div>
            <div className="col-span-2 rounded-xl border border-amber-800/50 bg-amber-950/20 p-3 md:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200">Km a vuoto</p>
              <p className="mt-1 text-xs leading-5 text-amber-100">Non calcolabili con certezza dai soli dati GPS.</p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300">
              {scope === "veicolo" ? <Truck className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
              {scope === "veicolo" ? "Distanza per veicolo Geotab" : "Distanza per driver Geotab"}
            </h3>
            <div className="space-y-2">
              {rows.slice(0, 12).map((row) => (
                <div key={row.name} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-200">{row.name}</span>
                  <span className="text-slate-400">{row.trips} viaggi · {row.km.toLocaleString("it-IT", { maximumFractionDigits: 1 })} km</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">Ultimi viaggi registrati</h3>
            <div className="max-h-72 overflow-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="sticky top-0 bg-slate-950 text-[10px] uppercase text-slate-400">
                  <tr><th className="px-3 py-2">Inizio</th><th className="px-3 py-2">Veicolo</th><th className="px-3 py-2">Driver</th><th className="px-3 py-2 text-right">Km</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.trips.slice(0, 30).map((trip) => (
                    <tr key={trip.id}>
                      <td className="px-3 py-2">{new Date(trip.startAt).toLocaleString("it-IT")}</td>
                      <td className="px-3 py-2">{trip.vehicle}</td>
                      <td className="px-3 py-2">{trip.driver}</td>
                      <td className="px-3 py-2 text-right">{trip.km?.toLocaleString("it-IT", { maximumFractionDigits: 1 }) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {data.truncated && <p className="text-[11px] text-amber-200">Raggiunto il limite di lettura del periodo; riduci l&apos;intervallo per consultare un sotto-periodo.</p>}
          {data.historyWarning && <p className="text-[11px] text-amber-200">Aggiornamento storico parziale: {data.historyWarning}</p>}
          <p className="text-[10px] leading-4 text-slate-500">Periodo: {data.from ? new Date(data.from).toLocaleDateString("it-IT") : "—"} – {data.to ? new Date(data.to).toLocaleDateString("it-IT") : "—"}. Fonte: MyGeotab API Trip.distance.</p>
        </div>
      )}
    </section>
  );
}

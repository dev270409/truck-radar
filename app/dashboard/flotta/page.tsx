"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Map as MapIcon, Car, Satellite, Navigation, Wrench, PlayCircle } from "lucide-react";
import type { FleetVehicleRow } from "@/lib/fleet";
import FleetMapLazy from "@/components/FleetMapLazy";

type FleetVehicle = FleetVehicleRow;

const STATUS_META: Record<string, { label: string; cls: string; color: string }> = {
  DISPONIBILE: { label: "Disponibili", cls: "text-emerald-300", color: "#22c55e" },
  IN_VIAGGIO: { label: "In viaggio", cls: "text-blue-300", color: "#3b82f6" },
  IN_MANUTENZIONE: { label: "In manutenzione", cls: "text-amber-300", color: "#f59e0b" },
  NON_IDONEO: { label: "Non idonei", cls: "text-red-300", color: "#ef4444" },
};

export default function FlottaPage() {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const fetchFleet = async () => {
    try {
      const res = await fetch("/api/fleet/map");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel caricamento della flotta");
      setVehicles(data.vehicles);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleet();
    const t = setInterval(fetchFleet, 15000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => {
    const out: Record<string, number> = {};
    vehicles.forEach((v) => {
      out[v.status] = (out[v.status] ?? 0) + 1;
    });
    const withPos = vehicles.filter((v) => v.lat != null && v.lng != null).length;
    const active = vehicles.filter((v) => v.tripStatus === "IN_CORSO").length;
    return { byStatus: out, withPos, active };
  }, [vehicles]);

  const sorted = useMemo(
    () =>
      [...vehicles].sort((a, b) => {
        const rank = { NON_IDONEO: 0, IN_MANUTENZIONE: 1, IN_VIAGGIO: 2, DISPONIBILE: 3 } as Record<string, number>;
        return (rank[a.status] ?? 4) - (rank[b.status] ?? 4);
      }),
    [vehicles]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center">
          <MapIcon className="w-6 h-6 mr-2.5 text-blue-400" /> Flotta Live
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Posizione in tempo reale dei veicoli e stato operativo della flotta (aggiornamento automatico).
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(STATUS_META).map(([k, m]) => (
          <div key={k} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className={`text-3xl font-bold ${m.cls}`}>{stats.byStatus[k] ?? 0}</p>
            <p className="text-xs text-slate-400 mt-1 flex items-center">
              <span className="w-2 h-2 rounded-full mr-2" style={{ background: m.color }} />
              {m.label}
            </p>
          </div>
        ))}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:hidden">
          <p className="text-3xl font-bold text-emerald-300">{stats.withPos}</p>
          <p className="text-xs text-slate-400 mt-1 flex items-center">
            <Satellite className="w-3 h-3 mr-1.5 text-emerald-400" /> Con posizione
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-800 text-red-200 text-sm rounded-2xl">{error}</div>
      )}

      {/* Map */}
      {loading ? (
        <div className="h-[420px] flex items-center justify-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400 space-x-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Caricamento flotta...</span>
        </div>
      ) : (
        <FleetMapLazy vehicles={vehicles} onSelect={(id) => setSelected(id)} />
      )}

      {/* Vehicle list */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center">
            <Car className="w-4 h-4 mr-2 text-emerald-400" /> Dettaglio mezzi ({vehicles.length})
          </h2>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400 flex items-center">
              <Navigation className="w-3.5 h-3.5 mr-1 text-blue-400" /> {stats.withPos} con posizione
            </span>
            <span className="text-xs text-slate-400 flex items-center">
              <PlayCircle className="w-3.5 h-3.5 mr-1 text-green-400" /> {stats.active} in corridoio di viaggio
            </span>
          </div>
        </div>
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" /> <span>Caricamento...</span>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Nessun veicolo registrato. Aggiungi un veicolo dalla sezione &quot;Mezzi&quot; della flotta.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Targa</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Stato</th>
                  <th className="px-6 py-4">Posizione</th>
                  <th className="px-6 py-4">Viaggio / Autista</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {sorted.map((v) => {
                  const meta = STATUS_META[v.status] ?? { cls: "text-slate-300" };
                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-slate-800/40 transition ${
                        selected === v.id ? "bg-blue-950/40" : ""
                      }`}
                    >
                      <td className="px-6 py-4 font-mono font-bold text-slate-100">{v.targa}</td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-800 text-slate-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                          {v.categoria}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold ${meta.cls}`}>{meta.label ?? v.status}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {v.lat != null && v.lng != null ? (
                          <span className="flex items-center">
                            <Satellite className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                            {v.posizione || `${v.lat.toFixed(4)}, ${v.lng!.toFixed(4)}`}
                          </span>
                        ) : (
                          <span className="text-slate-500">Nessun segnale GPS</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {v.tripId ? (
                          <div>
                            <span className="text-slate-200 font-semibold">
                              {v.luogoRitiro} → {v.luogoConsegna}
                            </span>
                            {v.driverNome && (
                              <p className="text-slate-400 mt-0.5">
                                <Wrench className="w-3 h-3 inline mr-1" />
                                {v.driverNome} {v.driverCognome}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">Nessun viaggio attivo</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Truck,
  User,
  Loader2,
  Euro,
  Route,
  Fuel,
  TrendingUp,
} from "lucide-react";
import GeotabAnalyticsPanel from "@/components/GeotabAnalyticsPanel";

interface Row {
  id: string;
  name: string;
  category?: string;
  trips: number;
  km: number;
  ricavi: number;
  costi: number;
  margine: number;
  marginePct?: number;
  completati?: number;
  azioni?: number;
  puntualitaPct?: number;
  kmEvitati?: number;
}

interface Data {
  scope: string;
  rows: Row[];
  totali: { km: number; ricavi: number; margine: number; kmEvitati?: number };
}

const fmt = (n: number) => Math.round(n).toLocaleString("it-IT");
const fmtEuro = (n: number) => `€ ${Math.round(n).toLocaleString("it-IT")}`;

const maxBar = (rows: Row[], key: keyof Row): number =>
  Math.max(1, ...rows.map((r) => Number(r[key] ?? 0)));

export default function AnalyticsPage() {
  const [scope, setScope] = useState<"veicolo" | "autista">("veicolo");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (s: "veicolo" | "autista") => {
    setLoading(true);
    const params = new URLSearchParams({ scope: s });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    try {
      const res = await fetch(`/api/analytics?${params.toString()}`);
      if (!res.ok) return;
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)] flex items-center">
            <BarChart3 className="w-6 h-6 mr-2.5 text-indigo-400" /> Analytics
          </h1>
          <p className="text-sm text-[var(--text-label)] mt-1">Performance per mezzo e per autista (base km T13).</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setScope("veicolo")}
          className={`inline-flex items-center space-x-2 text-sm font-semibold px-4 py-2 rounded-xl border ${
            scope === "veicolo"
              ? "bg-emerald-950 text-emerald-200 border-emerald-700"
              : "text-[var(--text-label)] border-[var(--surface-border)]"
          }`}
        >
          <Truck className="w-4 h-4" /> <span>Per mezzo</span>
        </button>
        <button
          onClick={() => setScope("autista")}
          className={`inline-flex items-center space-x-2 text-sm font-semibold px-4 py-2 rounded-xl border ${
            scope === "autista"
              ? "bg-blue-950 text-blue-200 border-blue-700"
              : "text-[var(--text-label)] border-[var(--surface-border)]"
          }`}
        >
          <User className="w-4 h-4" /> <span>Per autista</span>
        </button>
        <div className="ml-auto flex items-center space-x-2">
          <input
            type="date"
            className="bg-[var(--surface-soft)] border border-[var(--surface-border)] rounded-xl px-3 py-2 text-sm text-[var(--text)]"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className="text-[var(--text-label-soft)]">→</span>
          <input
            type="date"
            className="bg-[var(--surface-soft)] border border-[var(--surface-border)] rounded-xl px-3 py-2 text-sm text-[var(--text)]"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <button
            onClick={() => load(scope)}
            className="text-sm font-semibold bg-[var(--surface-strong)] hover:bg-[var(--surface-border)] text-[var(--text)] px-4 py-2 rounded-xl"
          >
            Filtra
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center space-x-2 text-[var(--text-label)] text-sm p-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Calcolo analytics...
        </div>
      )}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
              <p className="text-xs font-semibold text-[var(--text-label)]  flex items-center">
                <Route className="w-3.5 h-3.5 mr-1" /> KM Totali
              </p>
              <h3 className="text-2xl font-semibold text-[var(--text)] mt-1">{fmt(data.totali.km)} km</h3>
            </div>
            <div className="p-5 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
              <p className="text-xs font-semibold text-[var(--text-label)]  flex items-center">
                <Euro className="w-3.5 h-3.5 mr-1" /> Ricavi
              </p>
              <h3 className="text-2xl font-semibold text-[var(--text)] mt-1">{fmtEuro(data.totali.ricavi)}</h3>
            </div>
            <div className="p-5 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
              <p className="text-xs font-semibold text-[var(--text-label)]  flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-1" /> Margine
              </p>
              <h3 className="text-2xl font-semibold text-emerald-300 mt-1">{fmtEuro(data.totali.margine)}</h3>
            </div>
            <div className="p-5 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
              <p className="text-xs font-semibold text-[var(--text-label)]  flex items-center">
                <Fuel className="w-3.5 h-3.5 mr-1" /> km vuoti evitati
              </p>
              <h3 className="text-2xl font-semibold text-emerald-300 mt-1">{fmt(data.totali.kmEvitati ?? 0)} km</h3>
            </div>
          </div>

          {data.rows.length === 0 && (
            <p className="text-sm text-[var(--text-label-soft)] p-6">Nessun dato nel periodo selezionato.</p>
          )}

          <div className="p-6 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
            <h3 className="text-base font-semibold text-[var(--text)] mb-4 flex items-center">
              {scope === "veicolo" ? (
                <Truck className="w-5 h-5 mr-2 text-emerald-400" />
              ) : (
                <User className="w-5 h-5 mr-2 text-blue-400" />
              )}
              {scope === "veicolo" ? "Performance per Mezzo" : "Performance per Autista"}
            </h3>

            {data.rows.map((r) => (
              <div key={r.id} className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-semibold text-[var(--text)]">{r.name}</span>
                  <span className="text-xs text-[var(--text-label)]">
                    {r.trips} viaggi · {fmt(r.km)} km · {fmtEuro(r.ricavi)} · margine {fmtEuro(r.margine)}
                    {scope === "autista" && ` · puntualità ${r.puntualitaPct}%`}
                    {scope === "veicolo" && (r.kmEvitati ?? 0) > 0 && ` · ${fmt(r.kmEvitati ?? 0)} km evitati`}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 h-2.5 bg-[var(--surface-soft)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500/80 rounded-full"
                      style={{ width: `${(r.km / maxBar(data.rows, "km")) * 100}%` }}
                    />
                  </div>
                  <div className="flex-1 h-2.5 bg-[var(--surface-soft)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/80 rounded-full"
                      style={{ width: `${(r.ricavi / maxBar(data.rows, "ricavi")) * 100}%` }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[var(--text-label-soft)] mt-0.5">[blu: km · verde: ricavi]</p>
              </div>
            ))}
          </div>
        </>
      )}

      <GeotabAnalyticsPanel from={from} to={to} scope={scope} />
    </div>
  );
}

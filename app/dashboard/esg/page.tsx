"use client";

import { useEffect, useState } from "react";
import { Leaf, Loader2, Route, StretchHorizontal, Trees, Repeat, TrendingUp, Fuel } from "lucide-react";

interface EsgPeriod {
  label: string;
  trips: number;
  kmTotale: number;
  kmVuoto: number;
  kmEvitati: number;
  co2Carico: number;
  co2Vuoto: number;
  co2Evitato: number;
}

interface EsgReport {
  periods: EsgPeriod[];
  totals: EsgPeriod;
  indicators: {
    kmMediPerViaggio: number;
    pctKmVuoti: number;
    caricoMedioTon: number;
    co2RisparmiatoTon: number;
  };
}

function Card({ icon, label, value, unit, tone }: { icon: any; label: string; value: string; unit: string; tone: string }) {
  return (
    <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}>{icon}</div>
      <p className="mt-3 text-2xl font-bold text-slate-100">
        {value} <span className="text-sm font-normal text-slate-400">{unit}</span>
      </p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

export default function EsgPage() {
  const [report, setReport] = useState<EsgReport | null>(null);
  const [granularity, setGranularity] = useState<"mese" | "anno">("mese");

  useEffect(() => {
    fetch(`/api/esg?granularity=${granularity}`)
      .then((r) => r.json())
      .then((d) => setReport(d.report ?? null))
      .catch(() => undefined);
  }, [granularity]);

  if (!report) {
    return (
      <div className="flex items-center space-x-2 text-slate-400 text-sm p-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Calcolo report ESG...
      </div>
    );
  }

  const t = report.totals;
  const maxKm = Math.max(...report.periods.map((p) => p.kmTotale), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <Leaf className="w-6 h-6 mr-2.5 text-emerald-400" /> ESG Report
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sostenibilità della flotta (§48/§49): km, km a vuoto, km evitati e stima CO₂.
          </p>
        </div>
        <div className="flex border border-slate-700 rounded-xl overflow-hidden text-xs">
          <button
            onClick={() => setGranularity("mese")}
            className={`px-3 py-2 ${granularity === "mese" ? "bg-emerald-600 text-white" : "text-slate-400"}`}
          >
            Mensile
          </button>
          <button
            onClick={() => setGranularity("anno")}
            className={`px-3 py-2 ${granularity === "anno" ? "bg-emerald-600 text-white" : "text-slate-400"}`}
          >
            Annuale
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={<Route className="w-5 h-5 text-emerald-400" />} label="Km totali percorsi" value={t.kmTotale.toLocaleString("it-IT")} unit="km" tone="bg-emerald-950 border border-emerald-800" />
        <Card icon={<StretchHorizontal className="w-5 h-5 text-amber-400" />} label="Km a vuoto" value={t.kmVuoto.toLocaleString("it-IT")} unit="km" tone="bg-amber-950 border border-amber-800" />
        <Card icon={<Repeat className="w-5 h-5 text-blue-400" />} label="Km evitati (Smart Return)" value={t.kmEvitati.toLocaleString("it-IT")} unit="km" tone="bg-blue-950 border border-blue-800" />
        <Card icon={<Trees className="w-5 h-5 text-lime-400" />} label="CO₂ risparmiata" value={t.co2Evitato.toFixed(2)} unit="t" tone="bg-lime-950 border border-lime-800" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200"><TrendingUp className="w-4 h-4 inline mr-1.5 text-emerald-400" /> Indicatori di efficienza</h3>
          {[
            { label: "Km medi per viaggio", value: report.indicators.kmMediPerViaggio, unit: "km", pct: Math.min((report.indicators.kmMediPerViaggio / 1000) * 100, 100) },
            { label: "% km a vuoto", value: report.indicators.pctKmVuoti.toFixed(1), unit: "%", pct: Math.min(report.indicators.pctKmVuoti, 100) },
            { label: "Carico medio per viaggio", value: String(report.indicators.caricoMedioTon), unit: "t", pct: Math.min((report.indicators.caricoMedioTon / 24) * 100, 100) },
            { label: "CO₂ risparmiata totale", value: String(report.indicators.co2RisparmiatoTon), unit: "t", pct: Math.min((report.indicators.co2RisparmiatoTon / 5) * 100, 100) },
          ].map((k) => (
            <div key={k.label}>
              <div className="flex justify-between text-xs text-slate-300">
                <span>{k.label}</span>
                <b>{k.value} {k.unit}</b>
              </div>
              <div className="mt-1.5 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${k.pct}%` }} />
              </div>
            </div>
          ))}
          <p className="text-[11px] text-slate-500 mt-2 flex items-center">
            <Fuel className="w-3.5 h-3.5 mr-1" /> Stima: 0.9 kg CO₂/km carico, 0.75 kg CO₂/km a vuoto.
          </p>
        </div>

        <div className="lg:col-span-2 p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-200 mb-4">Km per periodo</h3>
          <div className="space-y-3">
            {report.periods.map((p) => (
              <div key={p.label}>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{p.label}</span>
                  <span>{p.kmTotale.toLocaleString("it-IT")} km{` · ${p.trips} viaggi`}</span>
                </div>
                <div className="flex h-2.5 gap-0.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 rounded-l-full" style={{ width: `${(p.kmTotale / maxKm) * 100}%` }} />
                  <div className="bg-amber-500" style={{ width: `${Math.min((p.kmVuoto / maxKm) * 100, 30)}%` }} />
                </div>
              </div>
            ))}
            {report.periods.length === 0 && <p className="text-xs text-slate-500">Nessun viaggio nel periodo.</p>}
          </div>
          <div className="mt-4 flex items-center space-x-4 text-[11px] text-slate-500">
            <span className="flex items-center"><span className="w-3 h-3 rounded bg-emerald-500 mr-1.5" /> km carico</span>
            <span className="flex items-center"><span className="w-3 h-3 rounded bg-amber-500 mr-1.5" /> km a vuoto</span>
          </div>
        </div>
      </div>
    </div>
  );
}
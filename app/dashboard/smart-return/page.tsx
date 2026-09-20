"use client";

import { useEffect, useState } from "react";
import {
  Handshake,
  Route,
  Loader2,
  ArrowRightLeft,
  CheckCircle2,
  Fuel,
  Euro,
  TrendingDown,
} from "lucide-react";

interface TripOption {
  id: string;
  luogoRitiro: string;
  luogoConsegna: string;
  dataRitiro: string;
  status: string;
}

interface Match {
  id: string;
  luogoRitiro: string;
  luogoConsegna: string;
  dataRitiro: string;
  tipoMerce: string | null;
  pesoKg: number | null;
  prezzo: number | null;
  companyName: string;
  companyVerified: boolean;
  score: number;
}

interface Analysis {
  tripId: string;
  luogoRitiro: string;
  luogoConsegna: string;
  dataRitiro: string;
  category: string | null;
  kmOneWay: number;
  kmVuotiPrima: number;
  kmVuotiDopo: number;
  ricavoPrima: number;
  ricavoAggiuntivo: number;
  matches: Match[];
  applicati: Array<{ id: string; matchLoadId: string | null; kmVuotiDopo: number; ricavoAggiuntivo: number; candidato: boolean }>;
}

export default function SmartReturnPage() {
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [tripId, setTripId] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetch("/api/smart-return")
      .then((r) => r.json())
      .then((d) => {
        setTrips(d.trips ?? []);
        if (d.trips?.length) setTripId(d.trips[0].id);
      })
      .catch(() => undefined);
  }, []);

  const analyze = async (id: string) => {
    if (!id) return;
    setLoading(true);
    setMsg("");
    setAnalysis(null);
    try {
      const res = await fetch(`/api/smart-return?tripId=${id}`);
      const d = await res.json();
      if (!res.ok) {
        setMsg(d.error ?? "Errore.");
        return;
      }
      setAnalysis(d.analysis);
    } finally {
      setLoading(false);
    }
  };

  const apply = async (matchLoadId: string | null) => {
    setApplying(true);
    setMsg("");
    try {
      const res = await fetch("/api/smart-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, matchLoadId }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg(d.error ?? "Errore.");
        return;
      }
      setMsg(matchLoadId ? "Carico di ritorno abbinato e applicato." : "Registrato come viaggio a vuoto (candidato).");
      await analyze(tripId);
    } finally {
      setApplying(false);
    }
  };

  const saved = analysis?.kmVuotiPrima ?? 0;
  const reduced = analysis ? Math.max(0, analysis.kmVuotiPrima - analysis.kmVuotiDopo) : 0;
  const savedPct = saved > 0 ? Math.round((reduced / saved) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <Handshake className="w-6 h-6 mr-2.5 text-emerald-400" /> Smart Return
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Match inverso deterministico: riempi il rientro riducendo i km a vuoto.
          </p>
        </div>
      </div>

      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
        <label className="text-xs font-semibold text-slate-300 uppercase mb-2 block">
          Seleziona un viaggio
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="flex-1 min-w-60 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
          >
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.luogoRitiro} → {t.luogoConsegna} · {new Date(t.dataRitiro).toLocaleDateString("it-IT")} · {t.status}
              </option>
            ))}
          </select>
          <button
            onClick={() => analyze(tripId)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2 rounded-xl text-sm"
          >
            Analizza ritorno
          </button>
        </div>
        {msg && (
          <p className="mt-3 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded-xl px-3 py-2">
            {msg}
          </p>
        )}
      </div>

      {loading && (
        <div className="flex items-center space-x-2 text-slate-400 text-sm p-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Analisi in corso...
        </div>
      )}

      {analysis && !loading && (
        <>
          {/* Metrica PRIMA vs DOPO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-xs font-semibold text-slate-400 uppercase">KM A VUOTO · PRIMA</p>
              <h3 className="text-3xl font-bold text-red-300 mt-1">{analysis.kmVuotiPrima} km</h3>
              <p className="text-[11px] text-slate-500 mt-1">Ritorno vuoto stimato ({analysis.luogoRitiro} → {analysis.luogoConsegna})</p>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-xs font-semibold text-slate-400 uppercase">RICAVO RITORNO</p>
              <h3 className="text-3xl font-bold text-emerald-300 mt-1">€ {analysis.ricavoAggiuntivo.toLocaleString("it-IT")}</h3>
              <p className="text-[11px] text-slate-500 mt-1">dal carico di ritorno (prezzo offerta)</p>
            </div>
            <div className="p-5 bg-slate-900 border border-emerald-900/60 rounded-2xl">
              <p className="text-xs font-semibold text-slate-400 uppercase">KM A VUOTO · DOPO</p>
              <h3 className="text-3xl font-bold text-emerald-300 mt-1">{analysis.kmVuotiDopo} km</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {analysis.matches.length > 0
                  ? `${savedPct}% di km a vuoto eliminati con lo smart return`
                  : "Nessun abbinamento disponibile al momento"}
              </p>
            </div>
          </div>

          {/* Barra comparativa */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center">
              <TrendingDown className="w-4 h-4 mr-2 text-emerald-400" /> Confronto vuoto
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Prima (vuoto)</span>
                  <span>{analysis.kmVuotiPrima} km</span>
                </div>
                <div className="h-3 bg-red-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500/80 rounded-full"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Dopo (con smart return)</span>
                  <span>{analysis.kmVuotiDopo} km</span>
                </div>
                <div className="h-3 bg-emerald-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400/80 rounded-full"
                    style={{ width: `${saved > 0 ? Math.max(2, (analysis.kmVuotiDopo / saved) * 100) : 2}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
              {reduced} km a vuoto evitati · € {analysis.ricavoAggiuntivo.toLocaleString("it-IT")} di ricavo aggiuntivo
            </p>
          </div>

          {/* Match + applicati */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center">
              <Route className="w-4 h-4 mr-2 text-blue-400" /> Carichi di ritorno ({analysis.matches.length})
            </h3>

            {analysis.applicati.length > 0 && (
              <div className="mb-4 space-y-2">
                {analysis.applicati.map((a) => (
                  <div key={a.id} className="flex items-center justify-between bg-slate-950 border border-emerald-900/60 rounded-xl px-4 py-2.5 text-sm">
                    <span className={a.candidato ? "text-slate-400" : "text-emerald-300 font-semibold"}>
                      {a.candidato ? "Registrato a vuoto (candidato)" : "Smart return applicato"}
                    </span>
                    <span className="text-xs text-slate-400">
                      km vuoti {a.kmVuotiDopo} · € {a.ricavoAggiuntivo.toLocaleString("it-IT")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {analysis.matches.length === 0 ? (
              <div className="flex items-start space-x-3 p-4 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-400">
                <Fuel className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-300">Nessun carico inverso</p>
                  <p className="text-xs mt-0.5">
                    Il ritorno resterebbe per ora a vuoto. Registra il candidato per alimentare le metriche (km evitati e CO₂).
                  </p>
                  <button
                    onClick={() => apply(null)}
                    disabled={applying}
                    className="mt-2.5 text-xs font-semibold bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-50"
                  >
                    {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Registra candidato"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {analysis.matches.map((m) => (
                  <div key={m.id} className="flex items-center justify-between flex-wrap gap-2 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">
                        {m.luogoRitiro} <ArrowRightLeft className="w-3.5 h-3.5 inline text-slate-500" /> {m.luogoConsegna}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {m.companyName} {m.companyVerified && <span className="text-emerald-400">(verificata)</span>} · {new Date(m.dataRitiro).toLocaleDateString("it-IT")}
                        {m.pesoKg ? ` · ${m.pesoKg.toLocaleString("it-IT")} kg` : ""}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {m.prezzo != null && (
                        <span className="flex items-center text-sm font-bold text-emerald-300">
                          <Euro className="w-3.5 h-3.5 mr-0.5" /> {m.prezzo.toLocaleString("it-IT")}
                        </span>
                      )}
                      <button
                        onClick={() => apply(m.id)}
                        disabled={applying}
                        className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                      >
                        {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Riempi il ritorno"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
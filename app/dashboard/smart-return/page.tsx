"use client";

import { soonPage } from "@/components/soon/soon-pages";
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
import { label } from "@/lib/labels";

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

interface ExternalMatch {
  id: string;
  provider: string;
  providerName: string;
  luogoRitiro: string;
  luogoConsegna: string;
  dataRitiro: string;
  tipoMerce: string | null;
  pesoKg: number | null;
  prezzo: number | null;
  score: number;
  source: "ESTERNO";
}

interface AppliedRow {
  id: string;
  matchLoadId: string | null;
  externalLoadId: string | null;
  source: "INTERNO" | "ESTERNO";
  kmVuotiDopo: number;
  ricavoAggiuntivo: number;
  candidato: boolean;
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
  externalMatches: ExternalMatch[];
  applicati: AppliedRow[];
}

function Original_SmartReturnPage() {
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

  const apply = async (matchLoadId: string | null, externalLoadId?: string | null) => {
    setApplying(true);
    setMsg("");
    try {
      const res = await fetch("/api/smart-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, matchLoadId, externalLoadId }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg(d.error ?? "Errore.");
        return;
      }
      setMsg(matchLoadId || externalLoadId ? "Carico di ritorno abbinato e applicato." : "Registrato come viaggio a vuoto (candidato).");
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
          <h1 className="text-2xl font-semibold text-[var(--text)] flex items-center">
            <Handshake className="w-6 h-6 mr-2.5 text-emerald-400" /> Smart Return
          </h1>
          <p className="text-sm text-[var(--text-label)] mt-1">
            Match inverso deterministico: riempi il rientro riducendo i km a vuoto.
          </p>
        </div>
      </div>

      <div className="p-5 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
        <label className="text-xs font-semibold text-[var(--text-soft)]  mb-2 block">
          Seleziona un viaggio
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="flex-1 min-w-60 bg-[var(--surface-soft)] border border-[var(--surface-border)] rounded-xl px-3 py-2 text-sm text-[var(--text)]"
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
          >
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                  {t.luogoRitiro} → {t.luogoConsegna} · {new Date(t.dataRitiro).toLocaleDateString("it-IT")} · {label(t.status)}
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
        <div className="flex items-center space-x-2 text-[var(--text-label)] text-sm p-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Analisi in corso...
        </div>
      )}

      {analysis && !loading && (
        <>
          {/* Metrica PRIMA vs DOPO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
              <p className="text-xs font-semibold text-[var(--text-label)] ">KM A VUOTO · PRIMA</p>
              <h3 className="text-3xl font-semibold text-red-300 mt-1">{analysis.kmVuotiPrima} km</h3>
              <p className="text-[11px] text-[var(--text-label-soft)] mt-1">Ritorno vuoto stimato ({analysis.luogoRitiro} → {analysis.luogoConsegna})</p>
            </div>
            <div className="p-5 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
              <p className="text-xs font-semibold text-[var(--text-label)] ">RICAVO RITORNO</p>
              <h3 className="text-3xl font-semibold text-emerald-300 mt-1">€ {analysis.ricavoAggiuntivo.toLocaleString("it-IT")}</h3>
              <p className="text-[11px] text-[var(--text-label-soft)] mt-1">dal carico di ritorno (prezzo offerta)</p>
            </div>
            <div className="p-5 bg-[var(--surface)] border border-emerald-900/60 rounded-xl">
              <p className="text-xs font-semibold text-[var(--text-label)] ">KM A VUOTO · DOPO</p>
              <h3 className="text-3xl font-semibold text-emerald-300 mt-1">{analysis.kmVuotiDopo} km</h3>
              <p className="text-[11px] text-[var(--text-label-soft)] mt-1">
                {analysis.matches.length + analysis.externalMatches.length > 0
                  ? `${savedPct}% di km a vuoto eliminati con lo smart return`
                  : "Nessun abbinamento disponibile al momento"}
              </p>
            </div>
          </div>

          {/* Barra comparativa */}
          <div className="p-5 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
            <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center">
              <TrendingDown className="w-4 h-4 mr-2 text-emerald-400" /> Confronto vuoto
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-[var(--text-label)] mb-1">
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
                <div className="flex justify-between text-xs text-[var(--text-label)] mb-1">
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
          <div className="p-5 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
            <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center">
              <Route className="w-4 h-4 mr-2 text-blue-400" /> Carichi di ritorno ({analysis.matches.length + analysis.externalMatches.length})
            </h3>

            {analysis.applicati.length > 0 && (
              <div className="mb-4 space-y-2">
                {analysis.applicati.map((a) => (
                  <div key={a.id} className="flex items-center justify-between bg-[var(--surface-soft)] border border-emerald-900/60 rounded-xl px-4 py-2.5 text-sm">
                    <span className={a.candidato ? "text-[var(--text-label)]" : "text-emerald-300 font-semibold"}>
                      {a.candidato ? "Registrato a vuoto (candidato)" : a.source === "ESTERNO" ? "Smart return applicato (piattaforma esterna)" : "Smart return applicato"}
                    </span>
                    <span className="text-xs text-[var(--text-label)]">
                      km vuoti {a.kmVuotiDopo} · € {a.ricavoAggiuntivo.toLocaleString("it-IT")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {analysis.matches.length === 0 && analysis.externalMatches.length === 0 ? (
              <div className="flex items-start space-x-3 p-4 bg-[var(--surface-soft)] border border-[var(--surface-border)] rounded-xl text-sm text-[var(--text-label)]">
                <Fuel className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-[var(--text-soft)]">Nessun carico inverso</p>
                  <p className="text-xs mt-0.5">
                    Il ritorno resterebbe per ora a vuoto. Registra il candidato per alimentare le metriche (km evitati e CO₂).
                  </p>
                  <button
                    onClick={() => apply(null)}
                    disabled={applying}
                    className="mt-2.5 text-xs font-semibold bg-[var(--surface-strong)] border border-[var(--surface-border)] px-3 py-1.5 rounded-lg hover:bg-[var(--surface-border)] disabled:opacity-50"
                  >
                    {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Registra candidato"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {analysis.matches.map((m) => (
                  <div key={m.id} className="flex items-center justify-between flex-wrap gap-2 bg-[var(--surface-soft)] border border-[var(--surface-border)] rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">
                        {m.luogoRitiro} <ArrowRightLeft className="w-3.5 h-3.5 inline text-[var(--text-label-soft)]" /> {m.luogoConsegna}
                      </p>
                      <p className="text-[11px] text-[var(--text-label)]">
                        {m.companyName} {m.companyVerified && <span className="text-emerald-400">(verificata)</span>} · {new Date(m.dataRitiro).toLocaleDateString("it-IT")}
                        {m.pesoKg ? ` · ${m.pesoKg.toLocaleString("it-IT")} kg` : ""}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {m.prezzo != null && (
                        <span className="flex items-center text-sm font-semibold text-emerald-300">
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

                {analysis.externalMatches.map((e) => (
                  <div key={e.id} className="flex items-center justify-between flex-wrap gap-2 bg-[var(--surface-soft)] border border-amber-900/40 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">
                        {e.luogoRitiro} <ArrowRightLeft className="w-3.5 h-3.5 inline text-[var(--text-label-soft)]" /> {e.luogoConsegna}
                      </p>
                      <p className="text-[11px] text-[var(--text-label)]">
                        <span className="text-amber-400">{e.providerName ?? e.provider}</span> · piattaforma esterna · {new Date(e.dataRitiro).toLocaleDateString("it-IT")}
                        {e.pesoKg ? ` · ${e.pesoKg.toLocaleString("it-IT")} kg` : ""}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {e.prezzo != null && (
                        <span className="flex items-center text-sm font-semibold text-emerald-300">
                          <Euro className="w-3.5 h-3.5 mr-0.5" /> {e.prezzo.toLocaleString("it-IT")}
                        </span>
                      )}
                      <button
                        onClick={() => apply(null, e.id)}
                        disabled={applying}
                        className="text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                      >
                        {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Riempi via esterna"}
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

/** Wrapper SOON: mostra l'anteprima "In arrivo"; la pagina originale resta invariata sopra. */
export default function SmartReturnPage() {
  return soonPage("smart-return");
}

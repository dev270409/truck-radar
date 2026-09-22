"use client";

import { useEffect, useState } from "react";
import {
  Wallet,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Truck,
} from "lucide-react";
import IncassoRapidoSoon from "@/components/IncassoRapidoSoon";

interface Tx {
  id: string;
  type: "ESCROW" | "COMMISSION" | "PAYOUT" | "SUBSCRIPTION";
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  tripId?: string | null;
  trip?: { luogoRitiro: string; luogoConsegna: string } | null;
}

interface Payout {
  id: string;
  amount: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
}

interface EconomiaData {
  rate: number;
  saldo: number;
  incassato: number;
  commissioni: number;
  prelevato: number;
  inElaborazione: number;
  transactions: Tx[];
  payoutRequests: Payout[];
}

const eur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

const TYPE_LABELS: Record<Tx["type"], { label: string; cls: string }> = {
  ESCROW: { label: "Escrow Viaggio", cls: "text-emerald-300 bg-emerald-950/60 border-emerald-800/60" },
  COMMISSION: { label: "Commissione", cls: "text-indigo-300 bg-indigo-950/60 border-indigo-800/60" },
  PAYOUT: { label: "Prelievo", cls: "text-amber-300 bg-amber-950/60 border-amber-800/60" },
  SUBSCRIPTION: { label: "Abbonamento", cls: "text-sky-300 bg-sky-950/60 border-sky-800/60" },
};

const PAYOUT_BADGES: Record<Payout["status"], string> = {
  PENDING: "bg-amber-950 text-amber-300 border-amber-800/60",
  PROCESSING: "bg-blue-950 text-blue-300 border-blue-800/60",
  COMPLETED: "bg-emerald-950 text-emerald-300 border-emerald-800/60",
  FAILED: "bg-red-950 text-red-300 border-red-800/60",
};

export default function EconomiaPage() {
  const [data, setData] = useState<EconomiaData | null>(null);
  const [error, setError] = useState("");
  const [syncMsg, setSyncMsg] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [savingPayout, setSavingPayout] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/economia");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore nel caricamento");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const reconcile = async () => {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/economia/reconcile", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore nella riconciliazione");
      setSyncMsg(
        json.reconciled > 0
          ? `Riconciliati ${json.reconciled} viaggio/i per ${eur(json.amount)} (commissione ${json.rate}%).`
          : `Pool già sincronizzato (${json.skipped} viaggi già in contabilità).`
      );
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  };

  const requestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPayout(true);
    setError("");
    try {
      const res = await fetch("/api/economia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: payoutAmount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore nella richiesta prelievo");
      setPayoutAmount("");
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingPayout(false);
    }
  };

  const updatePayout = async (p: Payout, status: Payout["status"]) => {
    setBusyId(p.id);
    setError("");
    try {
      const res = await fetch(`/api/economia/payouts/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore nell'aggiornamento");
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <Wallet className="w-6 h-6 mr-2.5 text-emerald-400" /> Gestione Economica & Pool
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Incassi Escrow dai viaggi completati, commissioni piattaforma e prelievi.
          </p>
        </div>
        <button
          onClick={reconcile}
          disabled={syncing}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition disabled:opacity-50"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          <span>Sincronizza Pool</span>
        </button>
      </div>

      {syncMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-200 text-xs rounded-xl">{syncMsg}</div>
      )}
      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">{error}</div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo Disponibile</p>
          <h3 className="text-2xl font-bold text-emerald-300 mt-1">
            {data ? eur(data.saldo) : "—"}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Importo prelevabile dal pool</p>
        </div>
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Incassato da Viaggi</p>
          <h3 className="text-2xl font-bold text-slate-100 mt-1">{data ? eur(data.incassato) : "—"}</h3>
          <p className="text-xs text-slate-500 mt-1">Escrow dei viaggi completati</p>
        </div>
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Commissioni Piattaforma</p>
          <h3 className="text-2xl font-bold text-indigo-300 mt-1 flex items-center space-x-1.5">
            <span>{data ? eur(data.commissioni) : "—"}</span>
            {data && <span className="text-xs bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded">{data.rate}%</span>}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Fee versata a Truck Radar</p>
        </div>
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prelievi In Elaborazione</p>
          <h3 className="text-2xl font-bold text-amber-300 mt-1">{data ? eur(data.inElaborazione) : "—"}</h3>
          <p className="text-xs text-slate-500 mt-1">
            Richiesti {data ? eur(data.prelevato) : ""} già completati
          </p>
        </div>
      </div>

      <IncassoRapidoSoon />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transactions */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
            <Truck className="w-5 h-5 mr-2 text-emerald-400" /> Movimenti del Pool
          </h3>

          {!data ? (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Caricamento...</span>
            </div>
          ) : data.transactions.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nessun movimento contabile. Completa un viaggio e usa &quot;Sincronizza Pool&quot; per alimentare economia.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {data.transactions.map((tx) => {
                const meta = TYPE_LABELS[tx.type];
                return (
                  <div
                    key={tx.id}
                    className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${meta.cls}`}>
                        {meta.label}
                      </span>
                      {tx.trip && (
                        <p className="text-xs text-slate-400 mt-1.5 truncate">
                          {tx.trip.luogoRitiro} → {tx.trip.luogoConsegna}
                        </p>
                      )}
                      <p className="text-[10px] font-mono text-slate-600 mt-0.5">
                        {new Date(tx.createdAt).toLocaleString("it-IT")}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p
                        className={`font-bold text-sm ${
                          tx.type === "COMMISSION" || tx.type === "PAYOUT"
                            ? "text-slate-400"
                            : "text-emerald-300"
                        }`}
                      >
                        {tx.type === "COMMISSION" || tx.type === "PAYOUT" ? "−" : "+"}
                        {eur(tx.amount)}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase">{tx.status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payouts */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
            <ArrowUpFromLine className="w-5 h-5 mr-2 text-amber-400" /> Richiedi Prelievo
          </h3>

          <form onSubmit={requestPayout} className="flex items-end space-x-3 mb-5">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Importo (max {data ? eur(data.saldo) : "—"})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-slate-100 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={savingPayout || !data || data.saldo <= 0}
              className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center space-x-2 transition disabled:opacity-40"
            >
              {savingPayout ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
              <span>Richiedi</span>
            </button>
          </form>

          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Storico Prelievi</h4>
          {!data ? (
            <div className="p-6 text-center text-slate-400 flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Caricamento...</span>
            </div>
          ) : data.payoutRequests.length === 0 ? (
            <p className="text-sm text-slate-500">Nessun prelievo richiesto finora.</p>
          ) : (
            <div className="space-y-2">
              {data.payoutRequests.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-bold text-slate-100">{eur(p.amount)}</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      {new Date(p.createdAt).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${PAYOUT_BADGES[p.status]}`}>
                      {p.status}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {p.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => updatePayout(p, "PROCESSING")}
                            disabled={busyId === p.id}
                            className="bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/60 text-blue-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                          >
                            In Elaborazione
                          </button>
                          <button
                            onClick={() => updatePayout(p, "FAILED")}
                            disabled={busyId === p.id}
                            className="bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 text-red-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {p.status === "PROCESSING" && (
                        <>
                          <button
                            onClick={() => updatePayout(p, "COMPLETED")}
                            disabled={busyId === p.id}
                            className="bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => updatePayout(p, "FAILED")}
                            disabled={busyId === p.id}
                            className="bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 text-red-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {busyId === p.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
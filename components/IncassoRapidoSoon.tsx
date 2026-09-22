"use client";

import { useState } from "react";
import {
  Zap,
  X,
  Bell,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

/**
 * Annuncio dell'incasso rapido (embedded finance via Stripe Connect).
 * Stato attuale: disabilitato con badge "In arrivo". Il pulsante si attiva
 * quando il provider viene collegato (v. TRUCK_RADAR_DEPLOYMENT_PAPER §9).
 */
export default function IncassoRapidoSoon() {
  const [open, setOpen] = useState(false);
  const [reg, setReg] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  const notify = async () => {
    setReg("busy");
    try {
      const res = await fetch("/api/finance/stripe-lead", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Errore");
      setReg("ok");
      setMsg(
        json.already
          ? "Sei già in lista: ti avviseremo appena l'incasso rapido sarà disponibile."
          : "Perfetto: ti avviseremo appena l'incasso rapido sarà disponibile."
      );
    } catch (err) {
      setReg("err");
      setMsg(err instanceof Error ? err.message : "Errore di connessione.");
    }
  };

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center gap-4">
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <div className="w-10 h-10 bg-indigo-950 border border-indigo-800/60 rounded-xl flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-indigo-300" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-100 flex items-center gap-2">
            Incasso rapido
            <span className="text-[9px] font-extrabold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-full">
              In arrivo
            </span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Incassa le tratte in pochi giorni invece di 60/90. Commissione piatta 1% sulla borsa carichi.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-xl inline-flex items-center space-x-2 transition"
      >
        <Bell className="w-4 h-4" /> <span>Avvisami quando disponibile</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-11 h-11 bg-indigo-950 border border-indigo-800/60 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Incasso rapido via Stripe Connect</h3>
                <p className="text-xs text-slate-400">Servizio in arrivo</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <p>
                Il problema dei pagamenti a <b>60/90 giorni</b> sulla borsa carichi viene risolto con un partner
                finanziario autorizzato (Stripe Connect): i fondi <b>non passano mai dai conti di Truck Radar</b>.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Incasso rapido della tratta, commissione piatta <b>1%</b>.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Split automatico del pagamento: 99% al vettore, 1% a Truck Radar.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>La funzionalità sarà abilitata gradualmente dopo l'attivazione del provider (§9 paper di deploy).</span>
                </li>
              </ul>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800">
              {reg === "ok" ? (
                <div className="flex items-center space-x-2 text-emerald-300 text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{msg}</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={notify}
                    disabled={reg === "busy"}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl inline-flex items-center justify-center space-x-2 transition disabled:opacity-60"
                  >
                    {reg === "busy" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                    <span>{reg === "busy" ? "Registrazione..." : "Avvisami quando disponibile"}</span>
                  </button>
                  {reg === "err" && <p className="text-xs text-red-300 mt-2">{msg}</p>}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
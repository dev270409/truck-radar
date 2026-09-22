"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Loader2,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Building2,
} from "lucide-react";

interface StripeConfig {
  configured: boolean;
  publishableKey: string | null;
  priceBase: string | null;
  pricePro: string | null;
}

/**
 * Card abbonamento: avvia il checkout Stripe se configurato,
 * altrimenti mostra lo stato "In arrivo" (provider non attivo, §9 paper).
 */
export default function StripeCheckoutCard() {
  const [cfg, setCfg] = useState<StripeConfig | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<null | "BASE" | "PRO">(null);

  useEffect(() => {
    let active = true;
    fetch("/api/stripe/config")
      .then((r) => r.json())
      .then((c) => active && setCfg(c))
      .catch(() => active && setCfg(null));
    return () => {
      active = false;
    };
  }, []);

  const start = async (plan: "BASE" | "PRO") => {
    setBusy(plan);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore nell'avvio del checkout");
      if (json.url) {
        window.location.href = json.url;
      } else {
        throw new Error("URL checkout non ricevuto.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  };

  const ready = cfg?.configured === true;
  const missingIds = cfg && cfg.configured && (!cfg.priceBase || !cfg.pricePro);

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center">
          <CreditCard className="w-5 h-5 mr-2 text-sky-400" /> Abbonamento Aziendale
        </h3>
        {!ready && (
          <span className="text-[9px] font-extrabold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-full">
            In arrivo
          </span>
        )}
      </div>

      {cfg === null ? (
        <div className="flex items-center justify-center py-6 text-slate-400 text-sm space-x-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Caricamento...
        </div>
      ) : ready ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <p className="font-bold text-slate-100 text-sm">Piano BASE</p>
              </div>
              <p className="text-xs text-slate-400">Per piccole flotte e avvio del network.</p>
              <button
                onClick={() => start("BASE")}
                disabled={busy !== null}
                className="mt-1 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl inline-flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                {busy === "BASE" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                <span>Attiva BASE</span>
              </button>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-indigo-300" />
                <p className="font-bold text-slate-100 text-sm">Piano PRO</p>
              </div>
              <p className="text-xs text-slate-400">Borsa carichi, subappalto e Smart Return completi.</p>
              <button
                onClick={() => start("PRO")}
                disabled={busy !== null}
                className="mt-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl inline-flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                {busy === "PRO" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Attiva PRO</span>
              </button>
            </div>
          </div>
          {missingIds && (
            <p className="text-xs text-amber-300 flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Configura STRIPE_PRICE_ID_BASE e STRIPE_PRICE_ID_PRO nell'ambiente.</span>
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-slate-300 leading-relaxed">
            La gestione dell'abbonamento a pagamento sarà disponibile quando Stripe verrà attivato in modalità
            live (vedi roadmap di deploy §9). Continuando con l'account in Trial non verrai addebitato.
          </p>
          <p className="text-xs text-slate-500 mt-3 flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Il pagamento avviene su Stripe: i fondi non passano mai dai conti Truck Radar.</span>
          </p>
        </>
      )}

      {error && <p className="text-xs text-red-300 mt-3">{error}</p>}
    </div>
  );
}
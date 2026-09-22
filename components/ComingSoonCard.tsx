"use client";

import { useState, type ReactNode } from "react";
import {
  X,
  Bell,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Radar,
  Video,
  Fuel,
  Network,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  radar: Radar,
  video: Video,
  fuel: Fuel,
  network: Network,
  zap: Zap,
};

interface ComingSoonProps {
  title: string;
  description: string;
  icon: string;
  color?: string;
  badge?: string;
  leadApi?: string;
  details?: ReactNode;
}

/**
 * Card "Soon / In arrivo" per funzionalità future.
 * Senza leadApi mostra solo l'annuncio; con leadApi attiva il flusso
 * "Avvisami quando disponibile" (endpoint idempotente, rate-limited).
 */
export default function ComingSoonCard({
  title,
  description,
  icon,
  color = "slate",
  badge = "In arrivo",
  leadApi,
  details,
}: ComingSoonProps) {
  const [open, setOpen] = useState(false);
  const [reg, setReg] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  const Icon = ICON_MAP[icon] ?? Radar;

  const colors: Record<string, string> = {
    slate: "bg-slate-800 text-slate-300",
    blue: "bg-blue-950 text-blue-300",
    emerald: "bg-emerald-950 text-emerald-300",
    amber: "bg-amber-950 text-amber-300",
    violet: "bg-violet-950 text-violet-300",
    red: "bg-red-950 text-red-300",
  };

  const notify = async () => {
    if (!leadApi) return;
    setReg("busy");
    try {
      const res = await fetch(leadApi, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Errore");
      setReg("ok");
      setMsg(
        json.already
          ? "Sei già in lista: ti avviseremo appena sarà disponibile."
          : "Perfetto: ti avviseremo appena sarà disponibile."
      );
    } catch (err) {
      setReg("err");
      setMsg(err instanceof Error ? err.message : "Errore di connessione.");
    }
  };

  return (
    <div className="p-4 bg-slate-900 border border-dashed border-slate-700 rounded-2xl flex flex-wrap items-center gap-4">
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-100 flex items-center gap-2">
            {title}
            <span className="text-[9px] font-extrabold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>

      {leadApi && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-xl inline-flex items-center space-x-2 transition"
        >
          <Bell className="w-4 h-4" /> <span>Avvisami quando disponibile</span>
        </button>
      )}

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
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${colors[color]}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="text-xs text-slate-400">Servizio in arrivo</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-300">{details}</div>

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
                  <p className="text-[11px] text-slate-500 mt-2 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Disponibile dopo l'attivazione del provider (§9 del paper di deploy).
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
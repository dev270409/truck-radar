"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";

interface Criterio {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
  beneficio?: boolean;
}

export default function VerificationCard() {
  const [data, setData] = useState<{ verified: boolean; criteria: Criterio[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/account/verification");
        if (!res.ok) return;
        const d = await res.json();
        if (active) setData(d);
      } catch {
        /* silenzioso */
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="flex items-center space-x-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Verifica account...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const nextCriterio = data.criteria.find((c) => !c.ok && !c.beneficio);

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center">
          <ShieldCheck className="w-5 h-5 mr-2 text-blue-400" /> Verified Account
        </h3>
        <span
          className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
            data.verified
              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          {data.verified ? "Account verificato" : "Account basic"}
        </span>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        L'account verificato accede al network: borsa carichi, subappalti e smart return.
      </p>

      <ul className="space-y-2.5">
        {data.criteria.map((c) => (
          <li key={c.key} className="flex items-start space-x-2">
            {c.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100">
                {c.label}
                {c.beneficio && (
                  <span className="ml-2 text-[10px] uppercase font-bold text-slate-500">beneficio</span>
                )}
              </p>
              <p className="text-xs text-slate-400">{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      {nextCriterio && (
        <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">
          Prossimo requisito: <span className="font-semibold text-slate-200">{nextCriterio.label}</span>.
          {nextCriterio.key === "api" && (
            <Link
              href="/dashboard/integrazioni"
              className="mt-1.5 flex items-center text-blue-400 hover:underline"
            >
              Gestisci integrazioni <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
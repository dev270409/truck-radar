"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Loader2,
  Download,
  Filter,
  TrendingUp,
  PieChart,
  Users,
  Building2,
  CalendarDays,
} from "lucide-react";

interface ReportData {
  totali: {
    viaggi: number;
    fatturato: number;
    costi: number;
    margine: number;
    prezzoMedio: number;
  };
  byStatus: { status: string; count: number }[];
  serieMensile: { mese: string; viaggi: number; fatturato: number; costo: number }[];
  topClienti: { cliente: string; viaggi: number; fatturato: number }[];
  topAutisti: { autista: string; viaggi: number; fatturato: number }[];
}

const eur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

const STATUS_COLORS: Record<string, string> = {
  DA_ASSEGNARE: "bg-slate-600",
  ASSEGNATO: "bg-blue-500",
  IN_CORSO: "bg-amber-500",
  COMPLETATO: "bg-emerald-500",
  ANNULLATO: "bg-red-500",
  SUBAPPALTATO: "bg-indigo-500",
};

const STATUSES = [
  "DA_ASSEGNARE",
  "ASSEGNATO",
  "IN_CORSO",
  "COMPLETATO",
  "ANNULLATO",
  "SUBAPPALTATO",
];

function buildQuery(da: string, a: string, status: string) {
  const p = new URLSearchParams();
  if (da) p.set("da", da);
  if (a) p.set("a", a);
  if (status) p.set("status", status);
  const q = p.toString();
  return q ? `?${q}` : "";
}

export default function ReportiPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [da, setDa] = useState("");
  const [a, setA] = useState("");
  const [status, setStatus] = useState("");

  const fetchData = async (q: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/reporti${q}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore nel caricamento");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData("");
  }, []);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(buildQuery(da, a, status));
  };

  const exportUrl = `/api/reporti/export${buildQuery(da, a, status)}`;
  const maxStatus = data ? Math.max(...data.byStatus.map((s) => s.count), 1) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <BarChart3 className="w-6 h-6 mr-2.5 text-indigo-400" /> Centro Dati & Report
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            KPI della flotta, distribuzione per stato, top clienti/autisti ed export CSV.
          </p>
        </div>
        <a
          href={exportUrl}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition"
        >
          <Download className="w-4 h-4" />
          <span>Esporta CSV</span>
        </a>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-slate-100">Strumenti di controllo</h2>
        <p className="text-xs text-slate-400 mt-1">Funzioni periodiche raccolte qui per lasciare l&apos;operatività quotidiana più semplice.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["/dashboard/analytics", "Analytics flotta"],
            ["/dashboard/economia", "Economia e payout"],
            ["/dashboard/esg", "Report ESG"],
            ["/dashboard/badges", "Badge aziendali"],
            ["/dashboard/kyc", "Verifica KYC"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-indigo-700 hover:text-white transition">
              {label}
            </Link>
          ))}
        </div>
      </section>

      {/* Filters */}
      <form
        onSubmit={applyFilters}
        className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-end gap-4 text-sm"
      >
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Dal</label>
          <input
            type="date"
            value={da}
            onChange={(e) => setDa(e.target.value)}
            className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Al</label>
          <input
            type="date"
            value={a}
            onChange={(e) => setA(e.target.value)}
            className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Stato</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-100 outline-none"
          >
            <option value="">Tutti</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl flex items-center space-x-2 transition"
        >
          <Filter className="w-4 h-4" />
          <span>Applica</span>
        </button>
      </form>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">{error}</div>
      )}

      {loading && !data ? (
        <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Elaborazione report...</span>
        </div>
      ) : data ? (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Viaggi Totali", value: String(data.totali.viaggi), icon: <BarChart3 className="w-5 h-5" />, cls: "text-slate-100 bg-slate-800/80 border-slate-700" },
              { label: "Fatturato", value: eur(data.totali.fatturato), icon: <TrendingUp className="w-5 h-5" />, cls: "text-emerald-300 bg-emerald-950/80 border-emerald-800/60" },
              { label: "Costi Totale", value: eur(data.totali.costi), icon: <CalendarDays className="w-5 h-5" />, cls: "text-amber-300 bg-amber-950/80 border-amber-800/60" },
              { label: "Margine", value: eur(data.totali.margine), icon: <TrendingUp className="w-5 h-5" />, cls: "text-indigo-300 bg-indigo-950/80 border-indigo-800/60" },
              { label: "Prezzo Medio", value: eur(data.totali.prezzoMedio), icon: <PieChart className="w-5 h-5" />, cls: "text-sky-300 bg-sky-950/80 border-sky-800/60" },
            ].map((k) => (
              <div key={k.label} className={`p-4 bg-slate-900/90 border-slate-800 border rounded-2xl ${k.cls}`}>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{k.label}</p>
                  {k.icon}
                </div>
                <p className={`text-xl font-bold mt-2 ${k.cls.split(" ")[0]}`}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status distribution */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
              <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-indigo-400" /> Distribuzione per Stato
              </h3>
              {data.byStatus.length === 0 ? (
                <p className="text-sm text-slate-500">Nessun viaggio nel periodo selezionato.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.byStatus.map((s) => (
                    <div key={s.status} className="flex items-center space-x-3 text-sm">
                      <span className="w-32 text-xs font-semibold text-slate-300">{s.status}</span>
                      <div className="flex-1 bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full ${STATUS_COLORS[s.status] ?? "bg-slate-500"}`}
                          style={{ width: `${(s.count / maxStatus) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 text-right font-mono text-xs text-slate-400">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monthly series */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
              <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
                <CalendarDays className="w-5 h-5 mr-2 text-emerald-400" /> Andamento Mensile
              </h3>
              {data.serieMensile.length === 0 ? (
                <p className="text-sm text-slate-500">Nessun dato nel periodo selezionato.</p>
              ) : (
                <div className="space-y-2">
                  {data.serieMensile.map((m) => (
                    <div key={m.mese} className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between text-sm">
                      <span className="font-mono font-semibold text-slate-200">
                        {m.mese.replace("-", " / ")}
                      </span>
                      <span className="text-xs text-slate-400">{m.viaggi} viaggi</span>
                      <span className="font-bold text-emerald-300">{eur(m.fatturato)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top clienti */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
              <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-sky-400" /> Top Clienti per Fatturato
              </h3>
              <div className="space-y-2">
                {data.topClienti.map((c, i) => (
                  <div key={c.cliente} className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-sky-950/80 border border-sky-800/60 rounded-md text-[11px] font-bold text-sky-300 flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{c.cliente}</p>
                        <p className="text-[11px] text-slate-500">{c.viaggi} viaggi</p>
                      </div>
                    </div>
                    <span className="font-bold text-sky-300 text-sm">{eur(c.fatturato)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top autisti */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
              <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-amber-400" /> Top Autisti per Viaggi
              </h3>
              <div className="space-y-2">
                {data.topAutisti.map((atu, i) => (
                  <div key={`${atu.autista}-${i}`} className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-amber-950/80 border border-amber-800/60 rounded-md text-[11px] font-bold text-amber-300 flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{atu.autista}</p>
                        <p className="text-[11px] text-slate-500">{eur(atu.fatturato)} fatturato</p>
                      </div>
                    </div>
                    <span className="font-bold text-amber-300 text-sm">
                      {atu.viaggi} {atu.viaggi === 1 ? "viaggio" : "viaggi"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

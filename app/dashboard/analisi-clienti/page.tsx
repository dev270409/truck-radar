"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download, FileSpreadsheet, Loader2, TrendingDown, TrendingUp, Upload, UserX } from "lucide-react";
import { csvToObjects, downloadCsv, parseDate, parseNumber, pick, toCsv } from "@/lib/csv";
import { fileNameLabel } from "@/lib/labels";

interface Shipment {
  customer: string;
  date: Date;
  revenue: number;
  weight: number;
}

interface CustomerAnalysis {
  customer: string;
  lastDate: Date;
  daysSinceLast: number;
  shipments: number;
  revenue: number;
  weight: number;
  currentRevenue: number;
  previousRevenue: number;
  growthPct: number | null;
  status: "FERMO" | "IN CALO" | "IN CRESCITA" | "STABILE" | "NUOVO";
}

const statusStyle: Record<string, string> = {
  FERMO: "border-red-800 bg-red-950 text-red-300",
  "IN CALO": "border-amber-800 bg-amber-950 text-amber-300",
  "IN CRESCITA": "border-emerald-800 bg-emerald-950 text-emerald-300",
  STABILE: "border-slate-700 bg-slate-900 text-slate-300",
  NUOVO: "border-sky-800 bg-sky-950 text-sky-300",
};

const eur = (n: number) => `€ ${Math.round(n).toLocaleString("it-IT")}`;

export default function AnalisiClientiPage() {
  const [rows, setRows] = useState<Shipment[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState<Date | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError("");
    try {
      const text = await file.text();
      const { rows: objects } = csvToObjects(text);
      const parsed: Shipment[] = [];
      for (const row of objects) {
        const customer = pick(row, ["cliente", "customer", "ragioneSociale", "nomeCliente", "destinatario"]);
        const date = parseDate(pick(row, ["data", "date", "dataSpedizione", "dataBolla", "dataDocumento"]));
        const revenue = parseNumber(pick(row, ["fatturato", "importo", "revenue", "totale", "valore"]));
        const weight = parseNumber(pick(row, ["peso", "weight", "pesoKg", "kg"]));
        if (!customer || !date) continue;
        parsed.push({ customer, date, revenue, weight });
      }
      if (parsed.length === 0) {
        throw new Error("Nessuna riga valida. Servono almeno le colonne cliente e data (e meglio fatturato/peso).");
      }
      const maxDate = parsed.reduce((m, r) => (r.date > m ? r.date : m), parsed[0].date);
      setRows(parsed);
      setReference(maxDate);
      setFileName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const analysis = useMemo<CustomerAnalysis[]>(() => {
    if (rows.length === 0 || !reference) return [];
    const byCustomer = new Map<string, Shipment[]>();
    for (const r of rows) {
      const list = byCustomer.get(r.customer) ?? [];
      list.push(r);
      byCustomer.set(r.customer, list);
    }
    const ref = reference.getTime();
    const day = 86_400_000;
    const currentStart = ref - 90 * day;
    const previousStart = ref - 180 * day;

    return [...byCustomer.entries()]
      .map(([customer, list]) => {
        const sorted = [...list].sort((a, b) => a.date.getTime() - b.date.getTime());
        const lastDate = sorted[sorted.length - 1].date;
        const current = sorted.filter((s) => s.date.getTime() >= currentStart);
        const previous = sorted.filter((s) => s.date.getTime() >= previousStart && s.date.getTime() < currentStart);
        const currentRevenue = current.reduce((s, r) => s + r.revenue, 0);
        const previousRevenue = previous.reduce((s, r) => s + r.revenue, 0);
        const growthPct = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : currentRevenue > 0 ? null : 0;
        const daysSinceLast = Math.floor((ref - lastDate.getTime()) / day);
        let status: CustomerAnalysis["status"] = "STABILE";
        if (daysSinceLast > 60) status = "FERMO";
        else if (growthPct == null) status = "NUOVO";
        else if (growthPct <= -30) status = "IN CALO";
        else if (growthPct >= 30) status = "IN CRESCITA";
        return {
          customer,
          lastDate,
          daysSinceLast,
          shipments: sorted.length,
          revenue: sorted.reduce((s, r) => s + r.revenue, 0),
          weight: sorted.reduce((s, r) => s + r.weight, 0),
          currentRevenue,
          previousRevenue,
          growthPct,
          status,
        };
      })
      .sort((a, b) => {
        const order: Record<string, number> = { FERMO: 0, "IN CALO": 1, NUOVO: 2, STABILE: 3, "IN CRESCITA": 4 };
        return order[a.status] - order[b.status] || a.customer.localeCompare(b.customer);
      });
  }, [rows, reference]);

  const summary = useMemo(() => {
    return {
      total: analysis.length,
      fermi: analysis.filter((a) => a.status === "FERMO").length,
      calo: analysis.filter((a) => a.status === "IN CALO").length,
      crescita: analysis.filter((a) => a.status === "IN CRESCITA").length,
      nuovi: analysis.filter((a) => a.status === "NUOVO").length,
      revenue: analysis.reduce((s, a) => s + a.revenue, 0),
    };
  }, [analysis]);

  const exportAnalysis = () => {
    const csv = toCsv(
      ["cliente", "stato", "ultimaSpedizione", "giorniUltimaSpedizione", "spedizioni", "fatturatoTotale", "peso", "fatturato90gg", "fatturato90ggPrecedenti", "variazionePct"],
      analysis.map((a) => [
        a.customer,
        a.status,
        a.lastDate.toISOString().slice(0, 10),
        a.daysSinceLast,
        a.shipments,
        Math.round(a.revenue),
        Math.round(a.weight),
        Math.round(a.currentRevenue),
        Math.round(a.previousRevenue),
        a.growthPct == null ? "" : Math.round(a.growthPct),
      ])
    );
    downloadCsv("analisi-clienti.csv", csv);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-slate-100">
            <FileSpreadsheet className="mr-2.5 h-6 w-6 text-amber-400" /> Analisi clienti
          </h1>
          <p className="mt-1 text-sm text-slate-400">Carica le bolle esportate dal gestionale: chi è fermo, chi cala, chi cresce.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Carica CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {error && <div className="rounded-xl border border-amber-800/60 bg-amber-950/40 p-3 text-sm text-amber-200">{error}</div>}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-100">File bolle</h2>
            <p className="mt-1 text-xs text-slate-500">
              Colonne riconosciute: cliente, data, fatturato/importo, peso. I file vengono letti nel browser e non inviati ai server.
            </p>
          </div>
          {fileName && <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">{fileNameLabel(fileName)}</span>}
        </div>
        {rows.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Clienti</p>
              <p className="mt-1 text-xl font-bold text-slate-100">{summary.total}</p>
            </div>
            <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3">
              <p className="flex items-center text-[10px] font-bold uppercase tracking-wide text-red-300"><UserX className="mr-1 h-3 w-3" /> Fermi</p>
              <p className="mt-1 text-xl font-bold text-red-200">{summary.fermi}</p>
            </div>
            <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-3">
              <p className="flex items-center text-[10px] font-bold uppercase tracking-wide text-amber-300"><TrendingDown className="mr-1 h-3 w-3" /> In calo</p>
              <p className="mt-1 text-xl font-bold text-amber-200">{summary.calo}</p>
            </div>
            <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-3">
              <p className="flex items-center text-[10px] font-bold uppercase tracking-wide text-emerald-300"><TrendingUp className="mr-1 h-3 w-3" /> In crescita</p>
              <p className="mt-1 text-xl font-bold text-emerald-200">{summary.crescita}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Fatturato</p>
              <p className="mt-1 text-xl font-bold text-slate-100">{eur(summary.revenue)}</p>
            </div>
          </div>
        )}
      </section>

      {analysis.length > 0 && (
        <div className="space-y-3 md:hidden">
          {analysis.map((a) => (
            <div key={a.customer} className="ops-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">{a.customer}</p>
                  <p className="text-[11px] text-slate-500">{a.lastDate.toLocaleDateString("it-IT")} · {a.daysSinceLast} gg</p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusStyle[a.status]}`}>{a.status}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3" style={{ borderColor: "var(--surface-border)" }}>
                <div><p className="text-[10px] text-slate-500">Fatturato</p><p className="text-sm font-bold text-slate-100">{eur(a.revenue)}</p></div>
                <div><p className="text-[10px] text-slate-500">Variazione 90 gg</p><p className={`text-sm font-bold ${a.growthPct == null ? "text-sky-300" : a.growthPct >= 0 ? "text-emerald-300" : "text-red-300"}`}>{a.growthPct == null ? "nuovo" : `${a.growthPct > 0 ? "+" : ""}${Math.round(a.growthPct)}%`}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {analysis.length > 0 && (
        <div className="hidden overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70 md:block">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold text-slate-100">Allarmi commerciali</p>
            <button type="button" onClick={exportAnalysis} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-indigo-500">
              <Download className="h-3.5 w-3.5" /> Esporta
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3">Ultima spedizione</th>
                <th className="px-4 py-3 text-right">Spedizioni</th>
                <th className="px-4 py-3 text-right">Fatturato</th>
                <th className="px-4 py-3 text-right">90 gg</th>
                <th className="px-4 py-3 text-right">Variazione</th>
              </tr>
            </thead>
            <tbody>
              {analysis.map((a) => (
                <tr key={a.customer} className="border-b border-slate-800/60 last:border-0">
                  <td className="px-4 py-3 font-semibold text-slate-100">{a.customer}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusStyle[a.status]}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {a.lastDate.toLocaleDateString("it-IT")}
                    <span className="ml-1 text-xs text-slate-500">({a.daysSinceLast} gg)</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">{a.shipments}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-100">{eur(a.revenue)}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{eur(a.currentRevenue)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${a.growthPct == null ? "text-sky-300" : a.growthPct >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {a.growthPct == null ? "nuovo" : `${a.growthPct > 0 ? "+" : ""}${Math.round(a.growthPct)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <p className="flex items-start gap-2 text-xs text-slate-500">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
          Analisi calcolata su 90 giorni rispetto ai 90 precedenti, usando come riferimento la data più recente del file. I dati sono elaborati solo nel browser.
        </p>
      )}
    </div>
  );
}

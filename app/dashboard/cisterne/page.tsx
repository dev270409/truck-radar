"use client";

import { useEffect, useMemo, useState } from "react";
import { Droplets, Download, Fuel, Loader2, Plus, Trash2 } from "lucide-react";
import { downloadCsv, toCsv } from "@/lib/csv";

interface Tank {
  id: string;
  name: string;
  capacitaLitri: number;
  contalitri: string | null;
  note: string | null;
  litriCorrenti: number;
  ultimoContalitri: number | null;
}

interface Movement {
  id: string;
  tankId: string;
  tipo: string;
  litri: number;
  contalitri: number | null;
  note: string | null;
  createdAt: string;
}

interface Quarter {
  trimestre: string;
  litri: number;
  costo: number;
  prezzoMedio: number | null;
  rifornimenti: number;
}

const num = (n: number) => n.toLocaleString("it-IT", { maximumFractionDigits: 1 });
const eur = (n: number) => `€ ${n.toLocaleString("it-IT", { maximumFractionDigits: 2 })}`;

export default function CisternePage() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [quarters, setQuarters] = useState<Quarter[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [contalitri, setContalitri] = useState("");
  const [note, setNote] = useState("");
  const [tankId, setTankId] = useState("");
  const [movTipo, setMovTipo] = useState("CARICO");
  const [movLitri, setMovLitri] = useState("");
  const [movContalitri, setMovContalitri] = useState("");
  const [movNote, setMovNote] = useState("");

  const load = async () => {
    try {
      const [tRes, mRes, aRes] = await Promise.all([
        fetch("/api/fuel/tanks"),
        fetch("/api/fuel/tanks/movements"),
        fetch(`/api/fuel/accise?year=${year}`),
      ]);
      const tData = await tRes.json();
      const mData = await mRes.json();
      const aData = await aRes.json();
      if (tData.items) setTanks(tData.items);
      if (mData.items) setMovements(mData.items);
      if (aData.quarters) setQuarters(aData.quarters);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [year]);

  const totalLiters = useMemo(() => tanks.reduce((s, t) => s + Number(t.litriCorrenti ?? 0), 0), [tanks]);

  const addTank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/fuel/tanks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, capacitaLitri: Number(capacity), contalitri, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore salvataggio");
      setName("");
      setCapacity("");
      setContalitri("");
      setNote("");
      setSuccess("Cisterna creata.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const addMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tankId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/fuel/tanks/${tankId}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: movTipo, litri: Number(movLitri), contalitri: movContalitri || null, note: movNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore salvataggio");
      setMovLitri("");
      setMovContalitri("");
      setMovNote("");
      setSuccess("Movimento registrato.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const removeTank = async (id: string) => {
    if (!window.confirm("Eliminare la cisterna? I movimenti resteranno nello storico.")) return;
    await fetch(`/api/fuel/tanks?id=${id}`, { method: "DELETE" });
    load();
  };

  const exportAccise = () => {
    const csv = toCsv(
      ["trimestre", "litri", "costo", "prezzoMedio", "rifornimenti"],
      quarters.map((q) => [q.trimestre, q.litri, q.costo, q.prezzoMedio ?? "", q.rifornimenti])
    );
    downloadCsv(`accise-${year}.csv`, csv);
  };

  const tankName = (id: string) => tanks.find((t) => t.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-slate-100">
            <Fuel className="mr-2.5 h-6 w-6 text-amber-400" /> Cisterne e accise
          </h1>
          <p className="mt-1 text-sm text-slate-400">Litri in cisterna, movimenti contalitri e prospetto accise trimestrale.</p>
        </div>
        <span className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
          <Droplets className="mr-1 inline h-4 w-4 text-sky-400" /> {num(totalLiters)} litri stimati
        </span>
      </div>

      {error && <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-200">{success}</div>}

      <div className="grid gap-5 xl:grid-cols-2">
        <form onSubmit={addTank} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="mb-3 flex items-center font-semibold text-slate-100"><Plus className="mr-2 h-4 w-4 text-emerald-400" /> Nuova cisterna</h2>
          <div className="space-y-2">
            <input required placeholder="Nome cisterna *" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Capacità litri" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
              <input placeholder="N. contalitri" value={contalitri} onChange={(e) => setContalitri(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            </div>
            <input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <button type="submit" disabled={saving || !name} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crea cisterna
            </button>
          </div>
        </form>

        <form onSubmit={addMovement} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="mb-3 flex items-center font-semibold text-slate-100"><Droplets className="mr-2 h-4 w-4 text-sky-400" /> Movimento</h2>
          <div className="space-y-2">
            <select required value={tankId} onChange={(e) => setTankId(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
              <option value="">Cisterna *</option>
              {tanks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select value={movTipo} onChange={(e) => setMovTipo(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                <option value="CARICO">Carico</option>
                <option value="SCARICO">Scarico</option>
                <option value="RETTIFICA">Rettifica</option>
              </select>
              <input required type="number" placeholder="Litri *" value={movLitri} onChange={(e) => setMovLitri(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            </div>
            <input type="number" placeholder="Contalitri" value={movContalitri} onChange={(e) => setMovContalitri(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <input placeholder="Note" value={movNote} onChange={(e) => setMovNote(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <button type="submit" disabled={saving || !tankId} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Registra movimento
            </button>
          </div>
        </form>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="mb-3 flex items-center font-semibold text-slate-100"><Fuel className="mr-2 h-4 w-4 text-amber-400" /> Cisterne</h2>
        {loading ? (
          <div className="flex items-center text-slate-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Caricamento...</div>
        ) : tanks.length === 0 ? (
          <p className="text-sm text-slate-500">Nessuna cisterna. Creane una per tracciare i litri.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {tanks.map((t) => {
              const pct = t.capacitaLitri > 0 ? Math.min(100, Math.max(0, (Number(t.litriCorrenti) / t.capacitaLitri) * 100)) : 0;
              return (
                <div key={t.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-100">{t.name}</p>
                      <p className="text-xs text-slate-500">Capacità {num(t.capacitaLitri)} l{t.contalitri ? ` · contalitri ${t.contalitri}` : ""}</p>
                    </div>
                    <button type="button" onClick={() => removeTank(t.id)} className="text-slate-500 hover:text-red-400" aria-label="Elimina cisterna"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-sky-300">{num(Number(t.litriCorrenti))} l</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{pct.toFixed(0)}% · ultimo contalitri {t.ultimoContalitri ?? "—"}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center font-semibold text-slate-100"><Download className="mr-2 h-4 w-4 text-indigo-400" /> Prospetto accise</h2>
          <div className="flex items-center gap-2">
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100" />
            <button type="button" onClick={exportAccise} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-indigo-500"><Download className="h-3.5 w-3.5" /> Esporta</button>
          </div>
        </div>
        <div className="space-y-2 md:hidden">
          {quarters.map((q) => (
            <div key={q.trimestre} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">{q.trimestre} {year}</p>
                <span className="text-[11px] text-slate-500">{q.rifornimenti} rifornimenti</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div><p className="text-[9px] text-slate-500">Litri</p><p className="text-sm font-semibold text-slate-200">{num(q.litri)}</p></div>
                <div><p className="text-[9px] text-slate-500">Costo</p><p className="text-sm font-semibold text-slate-200">{eur(q.costo)}</p></div>
                <div><p className="text-[9px] text-slate-500">€/l</p><p className="text-sm font-semibold text-slate-200">{q.prezzoMedio != null ? eur(q.prezzoMedio) : "—"}</p></div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2">Trimestre</th>
                <th className="px-3 py-2 text-right">Litri</th>
                <th className="px-3 py-2 text-right">Costo</th>
                <th className="px-3 py-2 text-right">€/l medio</th>
                <th className="px-3 py-2 text-right">Rifornimenti</th>
              </tr>
            </thead>
            <tbody>
              {quarters.map((q) => (
                <tr key={q.trimestre} className="border-b border-slate-800/60 last:border-0">
                  <td className="py-2 font-semibold text-slate-100">{q.trimestre} {year}</td>
                  <td className="px-3 py-2 text-right text-slate-300">{num(q.litri)}</td>
                  <td className="px-3 py-2 text-right text-slate-300">{eur(q.costo)}</td>
                  <td className="px-3 py-2 text-right text-slate-400">{q.prezzoMedio != null ? eur(q.prezzoMedio) : "—"}</td>
                  <td className="px-3 py-2 text-right text-slate-400">{q.rifornimenti}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">Il prospetto usa i rifornimenti registrati in Carburante. Verifica sempre con il commercialista prima della richiesta di rimborso.</p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="mb-3 font-semibold text-slate-100">Ultimi movimenti</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun movimento.</p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {movements.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-100">{tankName(m.tankId)} · {m.tipo}</p>
                  <p className="text-xs text-slate-500">{new Date(m.createdAt).toLocaleString("it-IT")}{m.note ? ` · ${m.note}` : ""}</p>
                </div>
                <span className={`font-semibold ${m.tipo === "SCARICO" ? "text-red-300" : "text-emerald-300"}`}>{m.tipo === "SCARICO" ? "-" : "+"}{num(m.litri)} l</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

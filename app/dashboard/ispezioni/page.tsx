"use client";

import { useEffect, useState } from "react";
import { Loader2, ClipboardCheck, Save, Plus, Trash2, ShieldAlert } from "lucide-react";

interface Template {
  id: string;
  name: string;
  items: { label: string; ok: boolean }[];
}

interface Inspection {
  id: string;
  vehicleId: string;
  targa?: string;
  templateName?: string | null;
  esito: string;
  items: { label: string; ok: boolean; note?: string | null }[];
  note?: string | null;
  createdAt: string;
}

export default function IspezioniPage() {
  const [template, setTemplate] = useState<Template | null>(null);
  const [itemsInput, setItemsInput] = useState<string[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const [tRes, iRes] = await Promise.all([
        fetch("/api/inspections?action=template"),
        fetch("/api/inspections"),
      ]);
      const tData = await tRes.json();
      const iData = await iRes.json();
      if (tData.template) {
        setTemplate(tData.template);
        setItemsInput(tData.template.items.map((i: { label: string }) => i.label));
      }
      if (iData.items) setInspections(iData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSaveTemplate = async () => {
    if (!template) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/inspections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: template.id, name: template.name, items: itemsInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio");
      fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (idx: number, val: string) => {
    setItemsInput((prev) => prev.map((x, i) => (i === idx ? val : x)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center">
          <ClipboardCheck className="w-6 h-6 mr-2.5 text-emerald-400" /> Check-list Ispezioni
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Template pre-partenza per gli autisti e storico esiti verificati in sede.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-800 text-red-200 text-sm rounded-2xl">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template editor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4">
            Template pre-partenza
          </h2>
          {loading ? (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" /> <span>Caricamento...</span>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {itemsInput.map((label, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      value={label}
                      onChange={(e) => updateItem(idx, e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-100 text-sm outline-none"
                    />
                    <button
                      onClick={() => setItemsInput((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-300 bg-red-950/40 border border-red-800/60 p-2 rounded-lg hover:bg-red-900/60 transition"
                      title="Rimuovi voce"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setItemsInput((prev) => [...prev, ""])}
                className="text-xs font-semibold text-blue-300 bg-blue-950/40 border border-blue-800/60 px-3 py-2 rounded-lg hover:bg-blue-900/60 transition flex items-center space-x-1.5 mb-4"
              >
                <Plus className="w-3.5 h-3.5" /> Aggiungi voce
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Salva Template</span>
              </button>
            </>
          )}
        </div>

        {/* Inspection log */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4">
            Esiti ispezioni recenti
          </h2>
          {loading ? (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" /> <span>Caricamento...</span>
            </div>
          ) : inspections.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nessuna ispezione registrata. Gli autisti compileranno la check-list dall&apos;app.
            </p>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {inspections.map((ins) => {
                const failCount = ins.items.filter((i) => !i.ok).length;
                return (
                  <div key={ins.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-100 text-sm">{ins.targa ?? ins.vehicleId}</span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded ${
                            ins.esito === "OK"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                              : "bg-red-950 text-red-300 border border-red-800/60"
                          }`}
                        >
                          {ins.esito}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(ins.createdAt).toLocaleDateString("it-IT")} {new Date(ins.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">
                      {ins.templateName || "Check-list pre-partenza"} · {ins.items.length} voci
                      {failCount > 0 && (
                        <span className="ml-1 text-red-300 font-bold flex items-center inline">
                          <ShieldAlert className="w-3 h-3 mr-1" /> {failCount} criticità
                        </span>
                      )}
                    </p>
                    {ins.note && <p className="text-xs text-slate-500 mt-1 italic">{ins.note}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
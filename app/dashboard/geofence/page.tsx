"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Plus, Trash2, Edit3 } from "lucide-react";

interface Geofence {
  id: string;
  name: string;
  latCenter?: number | null;
  lngCenter?: number | null;
  raggioM: number;
  color: string;
  note?: string | null;
  createdAt: string;
}

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7"];

export default function GeofencePage() {
  const [items, setItems] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Geofence | null>(null);

  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [raggio, setRaggio] = useState("1000");
  const [color, setColor] = useState("#3b82f6");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const res = await fetch("/api/geofence");
      const data = await res.json();
      if (data.items) setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setLat("");
    setLng("");
    setRaggio("1000");
    setColor("#3b82f6");
    setNote("");
    setShowModal(true);
  };

  const openEdit = (g: Geofence) => {
    setEditing(g);
    setName(g.name);
    setLat(g.latCenter != null ? String(g.latCenter) : "");
    setLng(g.lngCenter != null ? String(g.lngCenter) : "");
    setRaggio(String(g.raggioM));
    setColor(g.color);
    setNote(g.note ?? "");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/geofence", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          name,
          latCenter: lat || null,
          lngCenter: lng || null,
          raggioM: Number(raggio),
          color,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio");
      setShowModal(false);
      fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Eliminare l'area?")) return;
    try {
      const res = await fetch(`/api/geofence?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore eliminazione");
      fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <MapPin className="w-6 h-6 mr-2.5 text-violet-400" /> Aree e Geofence
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Zone personalizzate per il monitoraggio della flotta (alert di ingresso/uscita in arrivo).
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-violet-600/30 flex items-center space-x-2 transition"
        >
          <Plus className="w-4 h-4" /> <span>Nuova Area</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-800 text-red-200 text-sm rounded-2xl">{error}</div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" /> <span>Caricamento aree...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Nessuna area definita. Crea geofence personalizzate per il monitoraggio della tua flotta.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Area</th>
                  <th className="px-6 py-4">Centro</th>
                  <th className="px-6 py-4">Raggio</th>
                  <th className="px-6 py-4">Note</th>
                  <th className="px-6 py-4">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {items.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="w-3 h-3 rounded-full" style={{ background: g.color }} />
                        <span className="font-bold text-slate-100">{g.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {g.latCenter != null && g.lngCenter != null
                        ? `${g.latCenter.toFixed(4)}, ${g.lngCenter.toFixed(4)}`
                        : <span className="text-slate-500">Da definire</span>}
                    </td>
                    <td className="px-6 py-4">
                      {g.raggioM >= 1000
                        ? `${(g.raggioM / 1000).toLocaleString("it-IT")} km`
                        : `${g.raggioM} m`}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">{g.note || <span className="text-slate-500">—</span>}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEdit(g)}
                          className="text-blue-300 bg-blue-950/40 border border-blue-800/60 p-1.5 rounded-lg hover:bg-blue-900/60 transition"
                          title="Modifica"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(g.id)}
                          className="text-red-300 bg-red-950/40 border border-red-800/60 p-1.5 rounded-lg hover:bg-red-900/60 transition"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-violet-400" /> {editing ? "Modifica Area" : "Nuova Area"}
            </h3>
            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">{error}</div>
            )}
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nome area *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="es. Base Milano Est"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Latitudine</label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="45.46"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Longitudine</label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="9.19"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Raggio (metri)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={50000}
                  value={raggio}
                  onChange={(e) => setRaggio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Colore</label>
                <div className="flex items-center space-x-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition ring-2 ring-offset-2 ring-offset-slate-900 ${
                        color === c ? "ring-white" : "ring-transparent"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold flex items-center space-x-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Salva Area</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
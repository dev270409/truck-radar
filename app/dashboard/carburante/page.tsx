"use client";

import { useEffect, useState } from "react";
import { Loader2, Fuel, Plus, Trash2, Wallet, Droplets, Gauge, TrendingUp } from "lucide-react";

interface VehicleLite {
  id: string;
  targa: string;
}

interface FuelItem {
  id: string;
  vehicleId: string;
  tripId?: string | null;
  litri: number;
  costo: number;
  odometerKm: number;
  pieno: boolean;
  luogo?: string | null;
  fornitore?: string | null;
  note?: string | null;
  createdAt: string;
}

interface FuelStats {
  totalLitri: number;
  totalCosto: number;
  mediaKmPerLitro: number | null;
  mediaCostoPerKm: number | null;
  kmTotali: number;
  perVehicle: Array<{
    vehicleId: string;
    targa: string;
    litri: number;
    costo: number;
    kmPercorsi: number;
    kmPerLitro: number | null;
    costoPerKm: number | null;
  }>;
}

export default function CarburantePage() {
  const [items, setItems] = useState<FuelItem[]>([]);
  const [stats, setStats] = useState<FuelStats | null>(null);
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [vehicleId, setVehicleId] = useState("");
  const [litri, setLitri] = useState("");
  const [costo, setCosto] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [pieno, setPieno] = useState(true);
  const [luogo, setLuogo] = useState("");
  const [fornitore, setFornitore] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const [fRes, vRes] = await Promise.all([fetch("/api/fuel"), fetch("/api/vehicles")]);
      const fData = await fRes.json();
      const vData = await vRes.json();
      if (fData.items) setItems(fData.items);
      if (fData.stats) setStats(fData.stats);
      if (vData.vehicles) {
        setVehicles(vData.vehicles.map((v: { id: string; targa: string }) => ({ id: v.id, targa: v.targa })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const targaOf = (id: string) => vehicles.find((v) => v.id === id)?.targa ?? id;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/fuel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId, litri: Number(litri), costo: Number(costo), odometerKm: Number(odometerKm), pieno, luogo, fornitore, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio");
      setShowModal(false);
      setVehicleId(""); setLitri(""); setCosto(""); setOdometerKm(""); setPieno(true); setLuogo(""); setFornitore(""); setNote("");
      fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Eliminare il rifornimento?")) return;
    try {
      const res = await fetch(`/api/fuel?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore eliminazione");
      fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const inputCls = "w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-100 outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <Fuel className="w-6 h-6 mr-2.5 text-emerald-400" /> Carburante e Consumi
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Rifornimenti con odometro, efficienza km/l e costo per km per mezzo (Fuel Log).
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition"
        >
          <Plus className="w-4 h-4" /> <span>Registra Rifornimento</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-800 text-red-200 text-sm rounded-2xl">{error}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-3xl font-bold text-emerald-300 flex items-center">
            <Droplets className="w-5 h-5 mr-2 text-emerald-400" /> {(stats?.totalLitri ?? 0).toLocaleString("it-IT", { maximumFractionDigits: 1 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">Litri totali</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-3xl font-bold text-amber-300 flex items-center">
            <Wallet className="w-5 h-5 mr-2 text-amber-400" /> {(stats?.totalCosto ?? 0).toLocaleString("it-IT", { maximumFractionDigits: 0 })} €
          </p>
          <p className="text-xs text-slate-400 mt-1">Costo totale carburante</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-3xl font-bold text-blue-300 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-400" /> {stats?.mediaKmPerLitro != null ? stats.mediaKmPerLitro.toLocaleString("it-IT") : "—"}
          </p>
          <p className="text-xs text-slate-400 mt-1">Efficienza media (km/l)</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-3xl font-bold text-slate-200 flex items-center">
            <Gauge className="w-5 h-5 mr-2 text-slate-400" /> {(stats?.kmTotali ?? 0).toLocaleString("it-IT")}
          </p>
          <p className="text-xs text-slate-400 mt-1">Km misurati su rifornimenti</p>
        </div>
      </div>

      {(stats?.perVehicle.length ?? 0) > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-slate-200 mb-3">Efficienza per mezzo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats!.perVehicle.map((v) => (
              <div key={v.vehicleId} className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
                <div>
                  <p className="font-mono font-bold text-slate-100">{v.targa}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {v.litri.toLocaleString("it-IT")} l · {(v.costo / (stats?.totalCosto ?? 1) * 100).toFixed(0)}% dei costi
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-300">{v.kmPerLitro != null ? `${v.kmPerLitro.toLocaleString("it-IT")} km/l` : "n.d."}</p>
                  <p className="text-[11px] text-slate-400">{v.costoPerKm != null ? `${v.costoPerKm.toLocaleString("it-IT")} €/km` : "n.d."}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" /> <span>Caricamento rifornimenti...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Nessun rifornimento registrato. Usa &quot;Registra Rifornimento&quot; per tracciare consumi ed efficienza.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Mezzo</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Litri</th>
                  <th className="px-6 py-4">Costo</th>
                  <th className="px-6 py-4">Odometro</th>
                  <th className="px-6 py-4">Luogo</th>
                  <th className="px-6 py-4">Pieno</th>
                  <th className="px-6 py-4">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-mono font-bold text-slate-100">{targaOf(i.vehicleId)}</td>
                    <td className="px-6 py-4 text-xs">{new Date(i.createdAt).toLocaleString("it-IT")}</td>
                    <td className="px-6 py-4">{i.litri.toLocaleString("it-IT", { maximumFractionDigits: 1 })} l</td>
                    <td className="px-6 py-4 text-emerald-300 font-semibold">{i.costo.toLocaleString("it-IT")} €</td>
                    <td className="px-6 py-4">{i.odometerKm.toLocaleString("it-IT")} km</td>
                    <td className="px-6 py-4 text-xs">{i.luogo || <span className="text-slate-500">—</span>}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${i.pieno ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60" : "bg-slate-800 text-slate-300 border border-slate-700"}`}>
                        {i.pieno ? "PIENO" : "PARZIALE"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(i.id)}
                        className="text-red-300 bg-red-950/40 border border-red-800/60 p-1.5 rounded-lg hover:bg-red-900/60 transition"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-100 flex items-center">
              <Fuel className="w-5 h-5 mr-2 text-emerald-400" /> Registra Rifornimento
            </h3>
            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">{error}</div>
            )}
            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Veicolo *</label>
                <select
                  required
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Seleziona mezzo...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.targa}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Litri *</label>
                  <input type="number" step="0.1" min="0" required value={litri} onChange={(e) => setLitri(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Costo (€) *</label>
                  <input type="number" step="0.01" min="0" required value={costo} onChange={(e) => setCosto(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Odometro (km) *</label>
                  <input type="number" step="1" min="0" required value={odometerKm} onChange={(e) => setOdometerKm(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tipo rifornimento</label>
                  <select value={pieno ? "pieno" : "parziale"} onChange={(e) => setPieno(e.target.value === "pieno")} className={inputCls}>
                    <option value="pieno">Pieno</option>
                    <option value="parziale">Parziale</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Luogo</label>
                  <input type="text" value={luogo} onChange={(e) => setLuogo(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Fornitore / Card</label>
                  <input type="text" value={fornitore} onChange={(e) => setFornitore(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Note</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputCls} />
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold flex items-center space-x-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Salva Rifornimento</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
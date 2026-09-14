"use client";

import { useEffect, useState } from "react";
import { Car, Plus, ShieldAlert, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

interface Vehicle {
  id: string;
  targa: string;
  categoria: string;
  portataMaxKg: number;
  volumeMaxM3: number;
  status: string;
  createdAt: string;
  documents?: any[];
  drivers?: any[];
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [targa, setTarga] = useState("");
  const [categoria, setCategoria] = useState("FRIGO");
  const [portataMaxKg, setPortataMaxKg] = useState("3500");
  const [volumeMaxM3, setVolumeMaxM3] = useState("18");
  const [status, setStatus] = useState("DISPONIBILE");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/vehicles");
      const data = await res.json();
      if (data.vehicles) {
        setVehicles(data.vehicles);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targa,
          categoria,
          portataMaxKg,
          volumeMaxM3,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio del veicolo");

      setTarga("");
      setShowAddModal(false);
      fetchVehicles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <Car className="w-6 h-6 mr-2.5 text-emerald-400" /> Gestione Flotta Veicoli
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Visualizza e gestisci i veicoli della tua azienda in tempo reale.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Aggiungi Veicolo</span>
        </button>
      </div>

      {/* Vehicles Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Caricamento veicoli in corso...</span>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Nessun veicolo registrato nella flotta. Clicca su "Aggiungi Veicolo" per iniziare.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Targa</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Portata (kg)</th>
                  <th className="px-6 py-4">Volume (m³)</th>
                  <th className="px-6 py-4">Stato Operativo</th>
                  <th className="px-6 py-4">Autista Assegnato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-mono font-bold text-slate-100">{v.targa}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-800 text-slate-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                        {v.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4">{v.portataMaxKg} kg</td>
                    <td className="px-6 py-4">{v.volumeMaxM3} m³</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          v.status === "DISPONIBILE"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                            : v.status === "IN_MANUTENZIONE"
                            ? "bg-red-950 text-red-300 border border-red-800/60"
                            : "bg-amber-950 text-amber-300 border border-amber-800/60"
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                      {v.drivers && v.drivers.length > 0
                        ? `${v.drivers[0].nome} ${v.drivers[0].cognome}`
                        : "Nessun Autista"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center">
              <Car className="w-5 h-5 mr-2 text-emerald-400" /> Nuovo Veicolo Flotta
            </h3>

            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleAddVehicle} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Targa Veicolo *
                </label>
                <input
                  type="text"
                  required
                  value={targa}
                  onChange={(e) => setTarga(e.target.value)}
                  placeholder="AB123CD"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-100 font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Categoria *
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                >
                  <option value="FRIGO">FRIGO</option>
                  <option value="TELONATO">TELONATO</option>
                  <option value="SPONDA_IDRAULICA">SPONDA_IDRAULICA</option>
                  <option value="CISTERNA">CISTERNA</option>
                  <option value="ADR">ADR</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Portata Max (Kg)
                  </label>
                  <input
                    type="number"
                    required
                    value={portataMaxKg}
                    onChange={(e) => setPortataMaxKg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Volume Max (M³)
                  </label>
                  <input
                    type="number"
                    required
                    value={volumeMaxM3}
                    onChange={(e) => setVolumeMaxM3(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Stato Iniziale
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                >
                  <option value="DISPONIBILE">DISPONIBILE</option>
                  <option value="IN_MANUTENZIONE">IN_MANUTENZIONE</option>
                  <option value="NON_IDONEO">NON_IDONEO</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold flex items-center space-x-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Salva Veicolo</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

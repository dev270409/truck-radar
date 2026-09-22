"use client";

import { useEffect, useState } from "react";
import { Loader2, Wrench, Plus, Trash2, CheckCircle2, XCircle, CalendarClock, Gauge, Coins } from "lucide-react";

interface VehicleLite {
  id: string;
  targa: string;
}

interface MaintenanceItem {
  id: string;
  vehicleId: string;
  tipo: string;
  descrizione?: string | null;
  kmProssimo?: number | null;
  dataProssima?: string | null;
  kmEseguito?: number | null;
  dataEseguito?: string | null;
  costo?: number | null;
  fornitore?: string | null;
  note?: string | null;
  status: string;
  createdAt: string;
}

const TIPI = ["TAGLIANDO", "FUNGHIOLO", "OLIO", "USURA_PNEUMATICI", "ALTRO"];
const STATUS_META: Record<string, { label: string; cls: string }> = {
  PROGRAMMATO: { label: "Programmato", cls: "bg-amber-950 text-amber-300 border border-amber-800/60" },
  IN_CORSO: { label: "In corso", cls: "bg-blue-950 text-blue-300 border border-blue-800/60" },
  ESEGUITO: { label: "Eseguito", cls: "bg-emerald-950 text-emerald-300 border border-emerald-800/60" },
  SALTATO: { label: "Saltato", cls: "bg-slate-800 text-slate-300 border border-slate-700" },
};

export default function ManutenzionePage() {
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [vehicleId, setVehicleId] = useState("");
  const [tipo, setTipo] = useState("TAGLIANDO");
  const [descrizione, setDescrizione] = useState("");
  const [kmProssimo, setKmProssimo] = useState("");
  const [dataProssima, setDataProssima] = useState("");
  const [costo, setCosto] = useState("");
  const [fornitore, setFornitore] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const [mRes, vRes] = await Promise.all([fetch("/api/maintenance"), fetch("/api/vehicles")]);
      const mData = await mRes.json();
      const vData = await vRes.json();
      if (mData.items) setItems(mData.items);
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
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          tipo,
          descrizione,
          kmProssimo: kmProssimo || null,
          dataProssima: dataProssima ? new Date(dataProssima).toISOString() : null,
          costo: costo || null,
          fornitore,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio");
      setShowModal(false);
      setTargaReset();
      fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const setTargaReset = () => {
    setVehicleId("");
    setTipo("TAGLIANDO");
    setDescrizione("");
    setKmProssimo("");
    setDataProssima("");
    setCosto("");
    setFornitore("");
    setNote("");
  };

  const handleStatus = async (item: MaintenanceItem, status: string) => {
    try {
      const res = await fetch("/api/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore aggiornamento");
      fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Eliminare l'intervento?")) return;
    try {
      const res = await fetch(`/api/maintenance?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore eliminazione");
      fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const scheduled = items.filter((i) => i.status === "PROGRAMMATO" || i.status === "IN_CORSO");
  const completed = items.filter((i) => i.status === "ESEGUITO");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <Wrench className="w-6 h-6 mr-2.5 text-amber-400" /> Manutenzione Programmata
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tagliandi e interventi pianificati per veicolo (km e scadenze).
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-600/30 flex items-center space-x-2 transition"
        >
          <Plus className="w-4 h-4" /> <span>Pianifica Intervento</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-800 text-red-200 text-sm rounded-2xl">{error}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-3xl font-bold text-amber-300">{scheduled.length}</p>
          <p className="text-xs text-slate-400 mt-1">In lavorazione / programmati</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-3xl font-bold text-emerald-300">{completed.length}</p>
          <p className="text-xs text-slate-400 mt-1">Eseguiti</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-3xl font-bold text-blue-300">
            {completed.reduce((s, i) => s + (i.costo ?? 0), 0).toLocaleString("it-IT")} €
          </p>
          <p className="text-xs text-slate-400 mt-1">Costo totale manutenzioni</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-3xl font-bold text-slate-200">{items.length}</p>
          <p className="text-xs text-slate-400 mt-1">Interventi registrati</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" /> <span>Caricamento manutenzioni...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Nessun intervento pianificato. Usa &quot;Pianifica Intervento&quot; per programmare tagliandi ed esami.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Mezzo</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Prossimo (km)</th>
                  <th className="px-6 py-4">Scadenza</th>
                  <th className="px-6 py-4">Fornitore</th>
                  <th className="px-6 py-4">Costo</th>
                  <th className="px-6 py-4">Stato</th>
                  <th className="px-6 py-4">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {items.map((i) => {
                  const meta = STATUS_META[i.status] ?? { label: i.status, cls: "bg-slate-800 text-slate-300" };
                  return (
                    <tr key={i.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-mono font-bold text-slate-100">{targaOf(i.vehicleId)}</td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-800 text-white px-2.5 py-1 rounded-md text-xs font-bold">{i.tipo}</span>
                      </td>
                      <td className="px-6 py-4">
                        {i.kmProssimo != null ? (
                          <span className="flex items-center text-slate-300">
                            <Gauge className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                            {i.kmProssimo.toLocaleString("it-IT")} km
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {i.dataProssima ? (
                          <span className="flex items-center text-slate-300">
                            <CalendarClock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                            {new Date(i.dataProssima).toLocaleDateString("it-IT")}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs">{i.fornitore || <span className="text-slate-500">—</span>}</td>
                      <td className="px-6 py-4">
                        {i.costo != null ? (
                          <span className="flex items-center">
                            <Coins className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                            {i.costo.toLocaleString("it-IT")} €
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${meta.cls}`}>{meta.label}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {i.status === "PROGRAMMATO" && (
                            <button
                              onClick={() => handleStatus(i, "IN_CORSO")}
                              className="text-xs font-semibold text-blue-300 bg-blue-950/40 border border-blue-800/60 px-2.5 py-1.5 rounded-lg hover:bg-blue-900/60 transition"
                            >
                              Inizia
                            </button>
                          )}
                          {(i.status === "PROGRAMMATO" || i.status === "IN_CORSO") && (
                            <button
                              onClick={() => handleStatus(i, "ESEGUITO")}
                              title="Marca eseguito"
                              className="text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 p-1.5 rounded-lg hover:bg-emerald-900/60 transition"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {(i.status === "PROGRAMMATO" || i.status === "IN_CORSO") && (
                            <button
                              onClick={() => handleStatus(i, "SALTATO")}
                              title="Salta"
                              className="text-slate-300 bg-slate-800 border border-slate-700 p-1.5 rounded-lg hover:bg-slate-700 transition"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(i.id)}
                            className="text-red-300 bg-red-950/40 border border-red-800/60 p-1.5 rounded-lg hover:bg-red-900/60 transition"
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-100 flex items-center">
              <Wrench className="w-5 h-5 mr-2 text-amber-400" /> Pianifica Intervento
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
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                >
                  <option value="">Seleziona mezzo...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.targa}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tipo intervento *</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                >
                  {TIPI.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Descrizione</label>
                <input
                  type="text"
                  value={descrizione}
                  onChange={(e) => setDescrizione(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">KM prossimo</label>
                  <input
                    type="number"
                    value={kmProssimo}
                    onChange={(e) => setKmProssimo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Data scadenza</label>
                  <input
                    type="date"
                    value={dataProssima}
                    onChange={(e) => setDataProssima(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Costo stimato (€)</label>
                  <input
                    type="number"
                    value={costo}
                    onChange={(e) => setCosto(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Fornitore</label>
                  <input
                    type="text"
                    value={fornitore}
                    onChange={(e) => setFornitore(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold flex items-center space-x-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Salva Intervento</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
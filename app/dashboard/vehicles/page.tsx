"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Car,
  Plus,
  Loader2,
  FileText,
  Trash2,
  FileWarning,
  CalendarClock,
  ExternalLink,
  X,
  BarChart3,
} from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";

interface VehicleDocument {
  id: string;
  tipo: string;
  dataScadenza: string;
  fileUrl?: string | null;
  createdAt: string;
}

interface Vehicle {
  id: string;
  targa: string;
  categoria: string;
  portataMaxKg: number;
  volumeMaxM3: number;
  status: string;
  createdAt: string;
  documents?: VehicleDocument[];
  drivers?: { id: string; nome: string; cognome: string }[];
}

const DOC_TYPES = ["ASSICURAZIONE", "REVISIONE", "TAGLIANDO", "BOLLO"];

const daysUntil = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);

function docBadge(dataScadenza: string) {
  const days = daysUntil(dataScadenza);
  if (days < 0)
    return { label: "SCADUTO", cls: "bg-red-950 text-red-300 border border-red-800/60" };
  if (days <= 30)
    return { label: `ENTRO ${days} G`, cls: "bg-amber-950 text-amber-300 border border-amber-800/60" };
  return { label: "VALIDO", cls: "bg-emerald-950 text-emerald-300 border border-emerald-800/60" };
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add vehicle form
  const [targa, setTarga] = useState("");
  const [categoria, setCategoria] = useState("FRIGO");
  const [portataMaxKg, setPortataMaxKg] = useState("3500");
  const [volumeMaxM3, setVolumeMaxM3] = useState("18");
  const [status, setStatus] = useState("DISPONIBILE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Documents modal
  const [docVehicle, setDocVehicle] = useState<Vehicle | null>(null);
  const [docs, setDocs] = useState<VehicleDocument[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [docSaving, setDocSaving] = useState(false);
  const [docError, setDocError] = useState("");
  const [docTipo, setDocTipo] = useState("ASSICURAZIONE");
  const [docScadenza, setDocScadenza] = useState("");
  const [docFileUrl, setDocFileUrl] = useState("");
  const [docUploaded, setDocUploaded] = useState(false);

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/vehicles");
      const data = await res.json();
      if (data.vehicles) setVehicles(data.vehicles);
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
        body: JSON.stringify({ targa, categoria, portataMaxKg, volumeMaxM3, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio del veicolo");
      setTarga("");
      setShowAddModal(false);
      fetchVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const openDocs = async (v: Vehicle) => {
    setDocVehicle(v);
    setDocs([]);
    setDocError("");
    setDocTipo("ASSICURAZIONE");
    setDocScadenza("");
    setDocFileUrl("");
    setDocUploaded(false);
    setDocLoading(true);
    try {
      const res = await fetch(`/api/vehicles/${v.id}/documents`);
      const data = await res.json();
      if (data.documents) setDocs(data.documents);
    } catch (err) {
      setDocError(err instanceof Error ? err.message : String(err));
    } finally {
      setDocLoading(false);
    }
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docVehicle) return;
    setDocSaving(true);
    setDocError("");
    try {
      const res = await fetch(`/api/vehicles/${docVehicle.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: docTipo,
          dataScadenza: new Date(docScadenza).toISOString(),
          fileUrl: docFileUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio del documento");
      setDocScadenza("");
      setDocFileUrl("");
      setDocUploaded(false);
      fetchVehicles();
      openDocs(docVehicle);
    } catch (err) {
      setDocError(err instanceof Error ? err.message : String(err));
    } finally {
      setDocSaving(false);
    }
  };

  const handleDeleteDoc = async (doc: VehicleDocument) => {
    if (!docVehicle) return;
    if (!window.confirm(`Eliminare il documento ${doc.tipo}?`)) return;
    try {
      const res = await fetch(`/api/vehicles/${docVehicle.id}/documents/${doc.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nell'eliminazione");
      fetchVehicles();
      openDocs(docVehicle);
    } catch (err) {
      setDocError(err instanceof Error ? err.message : String(err));
    }
  };

  const alerts = vehicles
    .flatMap((v) => (v.documents ?? []).map((d) => ({ ...d, targa: v.targa })))
    .filter((d) => daysUntil(d.dataScadenza) <= 30)
    .sort((a, b) => new Date(a.dataScadenza).getTime() - new Date(b.dataScadenza).getTime());

  const hasExpired = alerts.some((d) => daysUntil(d.dataScadenza) < 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <Car className="w-6 h-6 mr-2.5 text-emerald-400" /> Gestione Flotta Veicoli
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Veicoli, stato operativo e documenti con scadenze.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/analytics?scope=veicolo" className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center space-x-2 transition">
            <BarChart3 className="w-4 h-4" /><span>Analisi mezzi</span>
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Aggiungi Veicolo</span>
          </button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div
          className={`p-4 rounded-2xl border flex items-start space-x-3 ${
            hasExpired ? "bg-red-950/60 border-red-800/60" : "bg-amber-950/60 border-amber-800/60"
          }`}
        >
          <FileWarning className={`w-5 h-5 flex-shrink-0 mt-0.5 ${hasExpired ? "text-red-400" : "text-amber-400"}`} />
          <div className="text-sm">
            <p className={`font-bold ${hasExpired ? "text-red-200" : "text-amber-200"}`}>
              {alerts.length} documenti {hasExpired ? "scaduti o in scadenza" : "in scadenza"}
            </p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {alerts.map((d) => {
                const b = docBadge(d.dataScadenza);
                return (
                  <li key={d.id} className="text-slate-300">
                    <span className="font-mono font-bold">{d.targa}</span> · {d.tipo} ·{" "}
                    {new Date(d.dataScadenza).toLocaleDateString("it-IT")}{" "}
                    <span className={`ml-1 px-1.5 py-0.5 rounded font-semibold ${b.cls}`}>{b.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Caricamento veicoli in corso...</span>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Nessun veicolo registrato nella flotta. Clicca su &quot;Aggiungi Veicolo&quot; per iniziare.
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
                  <th className="px-6 py-4">Documenti</th>
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
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openDocs(v)}
                        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-300 hover:text-blue-200 bg-blue-950/40 border border-blue-800/60 px-3 py-1.5 rounded-lg transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Documenti ({(v.documents ?? []).length})</span>
                      </button>
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
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">{error}</div>
            )}
            <form onSubmit={handleAddVehicle} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Targa Veicolo *</label>
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
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Categoria *</label>
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
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Portata Max (Kg)</label>
                  <input
                    type="number"
                    required
                    value={portataMaxKg}
                    onChange={(e) => setPortataMaxKg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Volume Max (M³)</label>
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
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Stato Iniziale</label>
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

      {/* Documents Modal */}
      {docVehicle && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-400" /> Documenti — {docVehicle.targa}
              </h3>
              <button onClick={() => setDocVehicle(null)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {docError && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">{docError}</div>
            )}

            {docLoading ? (
              <div className="p-8 text-center text-slate-400 flex items-center justify-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Caricamento documenti...</span>
              </div>
            ) : docs.length === 0 ? (
              <p className="text-sm text-slate-500">Nessun documento registrato per questo veicolo.</p>
            ) : (
              <div className="space-y-2">
                {docs.map((d) => {
                  const b = docBadge(d.dataScadenza);
                  return (
                    <div
                      key={d.id}
                      className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-slate-200">{d.tipo}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${b.cls}`}>{b.label}</span>
                        </div>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">
                          <CalendarClock className="w-3 h-3 inline mr-1" />
                          {new Date(d.dataScadenza).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {d.fileUrl && (
                          <a
                            href={d.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-300 hover:text-blue-200 bg-blue-950/40 border border-blue-800/60 p-2 rounded-lg transition"
                            title="Apri documento"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteDoc(d)}
                          className="text-red-300 hover:text-red-200 bg-red-950/40 border border-red-800/60 p-2 rounded-lg transition"
                          title="Elimina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <form onSubmit={handleAddDoc} className="space-y-3 pt-3 border-t border-slate-800 text-sm">
              <p className="text-xs font-semibold text-slate-300 uppercase">Aggiungi documento</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tipo *</label>
                  <select
                    value={docTipo}
                    onChange={(e) => setDocTipo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-slate-100 outline-none"
                  >
                    {DOC_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Scadenza *</label>
                  <input
                    type="date"
                    required
                    value={docScadenza}
                    onChange={(e) => setDocScadenza(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <UploadButton
                  endpoint="vehicleDocument"
                  appearance={{
                    button:
                      "bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl px-3 py-2",
                    allowedContent: "text-[10px] text-slate-500",
                  }}
                  onClientUploadComplete={(res) => {
                      const f = res[0];
                      setDocFileUrl(f.url);
                      setDocUploaded(true);
                    }}
                    onUploadError={(e) => setDocError(e.message)}
                  />
                  {docUploaded && (
                    <span className="text-xs text-emerald-300 flex items-center space-x-1">
                      <ExternalLink className="w-3 h-3" />
                      <span>File caricato</span>
                    </span>
                  )}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={docSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold flex items-center space-x-2"
                >
                  {docSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Salva Documento</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Loader2, Fuel, Plus, Trash2, Wallet, Droplets, Gauge, TrendingUp, Sparkles } from "lucide-react";
import EmptyState from "@/components/ops/EmptyState";

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

interface FuelEstimate {
  estimated: true;
  kmTotali: number;
  kmSource: "GEOTAB" | "TRIPS" | "NESSUNO";
  litriStimati: number;
  costoStimato: number;
  kmPerLitroMedio: number;
  prezzoRiferimento: number;
  metodo: "REALE" | "MISTO" | "STIMA" | "NESSUNO";
  kmConConsumoReale: number;
  kmConStima: number;
  prezzoSource: "RIFORNIMENTI" | "RIFERIMENTO";
  dettaglio: Array<{
    vehicleId: string;
    targa: string;
    km: number;
    kmPerLitro: number;
    fonte: "REALE" | "STIMA";
    litri: number;
    costo: number;
    prezzo: number;
    segmentiReali: number;
  }>;
  nota: string;
}

export default function CarburantePage() {
  const [items, setItems] = useState<FuelItem[]>([]);
  const [stats, setStats] = useState<FuelStats | null>(null);
  const [estimate, setEstimate] = useState<FuelEstimate | null>(null);
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
      if (fData.estimate) setEstimate(fData.estimate);
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

  const inputCls = "w-full bg-[var(--surface-soft)] border border-[var(--surface-border)] focus:border-[var(--success)] rounded-xl px-4 py-2 text-[var(--text)] outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)] flex items-center">
            <Fuel className="w-6 h-6 mr-2.5 text-emerald-400" /> Carburante e Consumi
          </h1>
          <p className="text-sm text-[var(--text-label)] mt-1">
            Rifornimenti con odometro, efficienza km/l e costo per km per mezzo (Fuel Log).
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl   flex items-center space-x-2 transition"
        >
          <Plus className="w-4 h-4" /> <span>Registra Rifornimento</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-800 text-red-200 text-sm rounded-xl">{error}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl p-4">
          <p className="text-3xl font-semibold text-emerald-300 flex items-center">
            <Droplets className="w-5 h-5 mr-2 text-emerald-400" /> {(stats?.totalLitri ?? 0).toLocaleString("it-IT", { maximumFractionDigits: 1 })}
          </p>
          <p className="text-xs text-[var(--text-label)] mt-1">Litri totali</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl p-4">
          <p className="text-3xl font-semibold text-amber-300 flex items-center">
            <Wallet className="w-5 h-5 mr-2 text-amber-400" /> {(stats?.totalCosto ?? 0).toLocaleString("it-IT", { maximumFractionDigits: 0 })} €
          </p>
          <p className="text-xs text-[var(--text-label)] mt-1">Costo totale carburante</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl p-4">
          <p className="text-3xl font-semibold text-blue-300 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-400" /> {stats?.mediaKmPerLitro != null ? stats.mediaKmPerLitro.toLocaleString("it-IT") : "—"}
          </p>
          <p className="text-xs text-[var(--text-label)] mt-1">Efficienza media (km/l)</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl p-4">
          <p className="text-3xl font-semibold text-[var(--text)] flex items-center">
            <Gauge className="w-5 h-5 mr-2 text-[var(--text-label)]" /> {(stats?.kmTotali ?? 0).toLocaleString("it-IT")}
          </p>
          <p className="text-xs text-[var(--text-label)] mt-1">Km misurati su rifornimenti</p>
        </div>
      </div>

      {(stats?.perVehicle.length ?? 0) === 0 && estimate && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center text-sm font-semibold text-amber-100">
              <Sparkles className="mr-2 h-4 w-4" /> Stima consumi carburante
            </h3>
            <span className="rounded-full border border-amber-700/60 bg-amber-950/60 px-2.5 py-1 text-[11px] font-semibold  text-amber-200">
              {estimate.metodo === "REALE"
                ? "Consumi reali"
                : estimate.metodo === "MISTO"
                  ? "Dati misti"
                  : "Stima"}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-amber-100/80">{estimate.nota}</p>
          {estimate.kmSource !== "NESSUNO" && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-soft)] p-3">
                <p className="text-[11px] font-semibold   text-[var(--text-label)]">Litri stimati (30gg)</p>
                <p className="mt-1 text-lg font-semibold text-amber-200">{estimate.litriStimati.toLocaleString("it-IT", { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-soft)] p-3">
                <p className="text-[11px] font-semibold   text-[var(--text-label)]">Costo stimato</p>
                <p className="mt-1 text-lg font-semibold text-amber-200">€ {estimate.costoStimato.toLocaleString("it-IT", { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-soft)] p-3">
                <p className="text-[11px] font-semibold   text-[var(--text-label)]">Consumo medio</p>
                <p className="mt-1 text-lg font-semibold text-amber-200">{estimate.kmPerLitroMedio} km/l</p>
              </div>
            </div>
          )}
          {estimate.dettaglio.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px]   text-[var(--text-label)]">
                  <tr>
                    <th className="py-1.5 pr-3">Mezzo</th>
                    <th className="py-1.5 pr-3">Km</th>
                    <th className="py-1.5 pr-3">Consumo</th>
                    <th className="py-1.5 pr-3">Fonte</th>
                    <th className="py-1.5 text-right">€/l</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-soft)]">
                  {estimate.dettaglio.map((row) => (
                    <tr key={row.vehicleId} className="border-t border-[var(--surface-border)]">
                      <td className="py-1.5 pr-3 font-mono font-semibold text-[var(--text)]">{row.targa}</td>
                      <td className="py-1.5 pr-3">{row.km.toLocaleString("it-IT")}</td>
                      <td className="py-1.5 pr-3">{row.kmPerLitro} km/l</td>
                      <td className="py-1.5 pr-3">
                        <span className={row.fonte === "REALE" ? "text-emerald-300" : "text-amber-300"}>
                          {row.fonte === "REALE" ? `Reale (${row.segmentiReali} pieni)` : "Stima categoria"}
                        </span>
                      </td>
                      <td className="py-1.5 text-right">{row.prezzo.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-[11px] text-amber-200/70">
            Prezzo {estimate.prezzoSource === "RIFORNIMENTI" ? "medio dai rifornimenti" : "di riferimento"}:{" "}
            {estimate.prezzoRiferimento} €/l · {estimate.kmConConsumoReale.toLocaleString("it-IT")} km con consumi
            reali, {estimate.kmConStima.toLocaleString("it-IT")} km stimati. I km a vuoto non sono inclusi.
          </p>
        </div>
      )}

      {(stats?.perVehicle.length ?? 0) > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Efficienza per mezzo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats!.perVehicle.map((v) => (
              <div key={v.vehicleId} className="flex items-center justify-between bg-[var(--surface-soft)] border border-[var(--surface-border)] rounded-xl px-4 py-3">
                <div>
                  <p className="font-mono font-semibold text-[var(--text)]">{v.targa}</p>
                  <p className="text-[11px] text-[var(--text-label)] mt-0.5">
                    {v.litri.toLocaleString("it-IT")} l · {(v.costo / (stats?.totalCosto ?? 1) * 100).toFixed(0)}% dei costi
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-300">{v.kmPerLitro != null ? `${v.kmPerLitro.toLocaleString("it-IT")} km/l` : "n.d."}</p>
                  <p className="text-[11px] text-[var(--text-label)]">{v.costoPerKm != null ? `${v.costoPerKm.toLocaleString("it-IT")} €/km` : "n.d."}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl overflow-hidden ">
        {loading ? (
          <div className="p-12 text-center text-[var(--text-label)] flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" /> <span>Caricamento rifornimenti...</span>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Fuel}
            title="Nessun rifornimento registrato"
            description="Registra litri, costo e odometro: consumi ed efficienza per mezzo vengono calcolati automaticamente."
            actionLabel="Registra il primo rifornimento"
            onAction={() => setShowModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[var(--text-soft)]">
              <thead className="bg-black/60 text-xs font-semibold text-[var(--text-label)]   border-b border-[var(--surface-border)]">
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
              <tbody className="divide-y divide-[var(--surface-border)]">
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-[var(--surface-soft)] transition">
                    <td className="px-6 py-4 font-mono font-semibold text-[var(--text)]">{targaOf(i.vehicleId)}</td>
                    <td className="px-6 py-4 text-xs">{new Date(i.createdAt).toLocaleString("it-IT")}</td>
                    <td className="px-6 py-4">{i.litri.toLocaleString("it-IT", { maximumFractionDigits: 1 })} l</td>
                    <td className="px-6 py-4 text-emerald-300 font-semibold">{i.costo.toLocaleString("it-IT")} €</td>
                    <td className="px-6 py-4">{i.odometerKm.toLocaleString("it-IT")} km</td>
                    <td className="px-6 py-4 text-xs">{i.luogo || <span className="text-[var(--text-label-soft)]">—</span>}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${i.pieno ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60" : "bg-[var(--surface-strong)] text-[var(--text-soft)] border border-[var(--surface-border)]"}`}>
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
        <div className="fixed inset-0 bg-black/60  z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl w-full max-w-lg p-6  space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-[var(--text)] flex items-center">
              <Fuel className="w-5 h-5 mr-2 text-emerald-400" /> Registra Rifornimento
            </h3>
            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">{error}</div>
            )}
            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-soft)]  mb-1">Veicolo *</label>
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
                  <label className="block text-xs font-semibold text-[var(--text-soft)]  mb-1">Litri *</label>
                  <input type="number" step="0.1" min="0" required value={litri} onChange={(e) => setLitri(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-soft)]  mb-1">Costo (€) *</label>
                  <input type="number" step="0.01" min="0" required value={costo} onChange={(e) => setCosto(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-soft)]  mb-1">Odometro (km) *</label>
                  <input type="number" step="1" min="0" required value={odometerKm} onChange={(e) => setOdometerKm(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-soft)]  mb-1">Tipo rifornimento</label>
                  <select value={pieno ? "pieno" : "parziale"} onChange={(e) => setPieno(e.target.value === "pieno")} className={inputCls}>
                    <option value="pieno">Pieno</option>
                    <option value="parziale">Parziale</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-soft)]  mb-1">Luogo</label>
                  <input type="text" value={luogo} onChange={(e) => setLuogo(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-soft)]  mb-1">Fornitore / Card</label>
                  <input type="text" value={fornitore} onChange={(e) => setFornitore(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-soft)]  mb-1">Note</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputCls} />
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t border-[var(--surface-border)]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-[var(--surface-strong)] hover:bg-[var(--surface-border)] text-[var(--text-soft)] rounded-xl font-medium"
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
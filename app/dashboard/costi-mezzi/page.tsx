"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Car, Download, Fuel, Loader2, Plus, ScanLine, Trash2, Wrench } from "lucide-react";
import { label } from "@/lib/labels";

interface Vehicle {
  id: string;
  targa: string;
  categoria: string;
  portataMaxKg: number;
  volumeMaxM3: number;
}

interface Cost {
  id: string;
  vehicleId: string;
  tipo: string;
  descrizione: string | null;
  importo: number;
  data: string;
  fornitore: string | null;
  note: string | null;
}

interface FuelStat {
  vehicleId: string;
  targa: string;
  litri: number;
  costo: number;
  kmPercorsi: number;
  kmPerLitro: number | null;
  costoPerKm: number | null;
}

interface Libretto {
  targa: string | null;
  marca: string | null;
  modello: string | null;
  categoria: string | null;
  portataMaxKg: number | null;
  volumeMaxM3: number | null;
  classeEuro: string | null;
  dataRevisione: string | null;
  numeroAssi: number | null;
  note: string | null;
}

const eur = (n: number) => `€ ${Math.round(n * 100) / 100}`;

export default function CostiMezziPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [fuelStats, setFuelStats] = useState<FuelStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [libretto, setLibretto] = useState<Libretto | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [vehicleId, setVehicleId] = useState("");
  const [tipo, setTipo] = useState("GOMME");
  const [descrizione, setDescrizione] = useState("");
  const [importo, setImporto] = useState("");
  const [data, setData] = useState("");
  const [fornitore, setFornitore] = useState("");
  const [note, setNote] = useState("");

  const load = async () => {
    try {
      const [vRes, cRes, fRes] = await Promise.all([fetch("/api/vehicles"), fetch("/api/vehicles/costs"), fetch("/api/fuel")]);
      const vData = await vRes.json();
      const cData = await cRes.json();
      const fData = await fRes.json();
      if (vData.vehicles) setVehicles(vData.vehicles);
      if (cData.items) setCosts(cData.items);
      if (fData.stats?.perVehicle) setFuelStats(fData.stats.perVehicle);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const targaOf = (id: string) => vehicles.find((v) => v.id === id)?.targa ?? id;

  const tco = useMemo(() => {
    return vehicles.map((v) => {
      const f = fuelStats.find((s) => s.vehicleId === v.id);
      const other = costs.filter((c) => c.vehicleId === v.id).reduce((s, c) => s + c.importo, 0);
      const fuel = f?.costo ?? 0;
      const km = f?.kmPercorsi ?? 0;
      const total = fuel + other;
      return {
        vehicle: v,
        fuel,
        other,
        total,
        km,
        costPerKm: km > 0 ? total / km : null,
        kmPerLitro: f?.kmPerLitro ?? null,
      };
    });
  }, [vehicles, costs, fuelStats]);

  const handleOcr = async (file: File) => {
    setOcrLoading(true);
    setError("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Impossibile leggere il file."));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "libretto", file: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "OCR non disponibile");
      setLibretto(data.data);
      setMatchId(data.match?.id ?? null);
      setSuccess("Libretto letto. Controlla i dati e salva il mezzo.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOcrLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveLibretto = async () => {
    if (!libretto?.targa) {
      setError("Targa mancante: non posso salvare il mezzo.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        targa: libretto.targa,
        categoria: libretto.categoria || "TELONATO",
        portataMaxKg: libretto.portataMaxKg || 1000,
        volumeMaxM3: libretto.volumeMaxM3 || 1,
      };
      const res = matchId
        ? await fetch(`/api/vehicles/${matchId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/vehicles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore salvataggio mezzo");
      setSuccess(matchId ? "Mezzo aggiornato dal libretto." : "Mezzo creato dal libretto.");
      setLibretto(null);
      setMatchId(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const addCost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/vehicles/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId, tipo, descrizione, importo: Number(importo), data: data || null, fornitore, note }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Errore nel salvataggio");
      setImporto("");
      setDescrizione("");
      setFornitore("");
      setNote("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const removeCost = async (id: string) => {
    if (!window.confirm("Eliminare il costo?")) return;
    await fetch(`/api/vehicles/costs/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-slate-100">
            <Wrench className="mr-2.5 h-6 w-6 text-emerald-400" /> Costi mezzi e TCO
          </h1>
          <p className="mt-1 text-sm text-slate-400">Libretto, gomme, officina, assicurazione e costo reale al chilometro.</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/export?type=costs" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-indigo-500">
            <Download className="h-4 w-4" /> Esporta CSV
          </a>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={ocrLoading} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {ocrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />} Leggi libretto
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleOcr(f);
            }}
          />
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-200">{success}</div>}

      {libretto && (
        <section className="rounded-2xl border border-indigo-800/60 bg-indigo-950/30 p-5">
          <h2 className="mb-3 flex items-center font-semibold text-indigo-100"><Camera className="mr-2 h-4 w-4" /> Dati letti dal libretto</h2>
          <div className="grid gap-2 text-sm md:grid-cols-4">
            <p><span className="text-slate-400">Targa:</span> <b className="text-slate-100">{libretto.targa ?? "—"}</b></p>
            <p><span className="text-slate-400">Marca:</span> <b className="text-slate-100">{libretto.marca ?? "—"}</b></p>
            <p><span className="text-slate-400">Modello:</span> <b className="text-slate-100">{libretto.modello ?? "—"}</b></p>
            <p><span className="text-slate-400">Categoria:</span> <b className="text-slate-100">{libretto.categoria ?? "—"}</b></p>
            <p><span className="text-slate-400">Portata:</span> <b className="text-slate-100">{libretto.portataMaxKg?.toLocaleString("it-IT") ?? "—"} kg</b></p>
            <p><span className="text-slate-400">Volume:</span> <b className="text-slate-100">{libretto.volumeMaxM3 ?? "—"} m³</b></p>
            <p><span className="text-slate-400">Euro:</span> <b className="text-slate-100">{libretto.classeEuro ?? "—"}</b></p>
            <p><span className="text-slate-400">Revisione:</span> <b className="text-slate-100">{libretto.dataRevisione ?? "—"}</b></p>
          </div>
          <p className="mt-2 text-xs text-amber-300">Controlla sempre i dati estratti: l&apos;OCR può sbagliare. {matchId ? "Targa già in flotta: aggiorno il mezzo esistente." : "Targa nuova: creo un nuovo mezzo."}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={saveLibretto} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {matchId ? "Aggiorna mezzo" : "Crea mezzo"}
            </button>
            <button type="button" onClick={() => { setLibretto(null); setMatchId(null); }} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300">Annulla</button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="mb-3 flex items-center font-semibold text-slate-100"><Car className="mr-2 h-4 w-4 text-sky-400" /> Costo reale per mezzo</h2>
        {loading ? (
          <div className="flex items-center text-slate-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calcolo...</div>
        ) : (
          <>
          <div className="space-y-3 md:hidden">
            {loading ? (
              <div className="ops-card flex items-center p-6 text-slate-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calcolo...</div>
            ) : tco.length === 0 ? (
              <div className="ops-card p-6 text-sm text-slate-500">Nessun mezzo in flotta.</div>
            ) : (
              tco.map((t) => (
                <div key={t.vehicle.id} className="ops-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{t.vehicle.targa}</p>
                      <p className="text-[11px] text-slate-500">{label(t.vehicle.categoria)} · {t.km.toLocaleString("it-IT")} km</p>
                    </div>
                    <p className={`text-sm font-bold ${t.costPerKm != null ? "text-emerald-300" : "text-slate-500"}`}>
                      {t.costPerKm != null ? `${t.costPerKm.toFixed(2)} €/km` : "—"}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3" style={{ borderColor: "var(--surface-border)" }}>
                    <div><p className="text-[9px] text-slate-500">Totale</p><p className="text-xs font-semibold text-slate-100">{eur(t.total)}</p></div>
                    <div><p className="text-[9px] text-slate-500">Gasolio</p><p className="text-xs font-semibold text-slate-100">{eur(t.fuel)}</p></div>
                    <div><p className="text-[9px] text-slate-500">km/l</p><p className="text-xs font-semibold text-slate-100">{t.kmPerLitro != null ? t.kmPerLitro.toFixed(2) : "—"}</p></div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Mezzo</th>
                  <th className="px-3 py-2 text-right">Gasolio</th>
                  <th className="px-3 py-2 text-right">Altri costi</th>
                  <th className="px-3 py-2 text-right">Totale</th>
                  <th className="px-3 py-2 text-right">Km</th>
                  <th className="px-3 py-2 text-right">€/km</th>
                  <th className="px-3 py-2 text-right">km/l</th>
                </tr>
              </thead>
              <tbody>
                {tco.map((t) => (
                  <tr key={t.vehicle.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="py-2 pr-3 font-semibold text-slate-100">{t.vehicle.targa}<span className="ml-1 text-xs font-normal text-slate-500">{label(t.vehicle.categoria)}</span></td>
                    <td className="px-3 py-2 text-right text-slate-300">{eur(t.fuel)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{eur(t.other)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-100">{eur(t.total)}</td>
                    <td className="px-3 py-2 text-right text-slate-400">{t.km.toLocaleString("it-IT")}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${t.costPerKm != null ? "text-emerald-300" : "text-slate-500"}`}>{t.costPerKm != null ? `${t.costPerKm.toFixed(2)} €` : "—"}</td>
                    <td className="px-3 py-2 text-right text-slate-400">{t.kmPerLitro != null ? t.kmPerLitro.toFixed(2) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <form onSubmit={addCost} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="mb-3 flex items-center font-semibold text-slate-100"><Plus className="mr-2 h-4 w-4 text-emerald-400" /> Nuovo costo</h2>
          <div className="space-y-2">
            <select required value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
              <option value="">Mezzo *</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.targa}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                {["GOMME", "OFFICINA", "TAGLIANDO", "ASSICURAZIONE", "BOLLO", "PEDAGGIO", "ALTRO"].map((t) => <option key={t}>{t}</option>)}
              </select>
              <input required type="number" placeholder="Importo € *" value={importo} onChange={(e) => setImporto(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            </div>
            <input placeholder="Descrizione" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
              <input placeholder="Fornitore" value={fornitore} onChange={(e) => setFornitore(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            </div>
            <textarea placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <button type="submit" disabled={saving || !vehicleId} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Salva costo
            </button>
          </div>
        </form>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="mb-3 flex items-center font-semibold text-slate-100"><Fuel className="mr-2 h-4 w-4 text-amber-400" /> Costi registrati</h2>
          {costs.length === 0 ? (
            <p className="text-sm text-slate-500">Nessun costo registrato.</p>
          ) : (
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {costs.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-100">{targaOf(c.vehicleId)} · {label(c.tipo)}</p>
                    <p className="truncate text-xs text-slate-500">{new Date(c.data).toLocaleDateString("it-IT")} · {c.descrizione || c.fornitore || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-100">{eur(c.importo)}</span>
                    <button type="button" onClick={() => removeCost(c.id)} className="text-slate-500 hover:text-red-400" aria-label="Elimina costo">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

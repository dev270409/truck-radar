"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Download, Loader2, MapPin, Navigation, Plus, Route, Save, Trash2, Wand2 } from "lucide-react";
import { calculateTripCost } from "@/lib/routes";

interface Stop {
  name: string;
  address?: string;
  lat: number | null;
  lng: number | null;
}

interface SavedRoute {
  id: string;
  name: string;
  stopCount: number;
  totalKm: number;
  totalCost: number;
  suggestedPrice: number;
  createdAt: string;
  stops: Stop[];
  optimized: Stop[];
}

const eur = (n: number) => `â‚¬ ${Math.round(n).toLocaleString("it-IT")}`;

function parseLines(text: string): Stop[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      const name = parts[0] || line;
      const address = parts[1] || name;
      const lat = parts[2] ? Number(parts[2]) : null;
      const lng = parts[3] ? Number(parts[3]) : null;
      return { name, address, lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null };
    });
}

async function geocode(stop: Stop): Promise<Stop> {
  const q = stop.address || stop.name;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=it&q=${encodeURIComponent(q)}`);
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (data[0]) {
      return { ...stop, lat: Number(data[0].lat), lng: Number(data[0].lon), address: data[0].display_name };
    }
  } catch {
    return stop;
  }
  return stop;
}

export default function GiriPage() {
  const [raw, setRaw] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [optimized, setOptimized] = useState<Stop[]>([]);
  const [totalKm, setTotalKm] = useState(0);
  const [startIndex, setStartIndex] = useState(0);
  const [returnToDepot, setReturnToDepot] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saved, setSaved] = useState<SavedRoute[]>([]);
  const [name, setName] = useState("Giro");

  const [fuelPrice, setFuelPrice] = useState("1.75");
  const [kmPerL, setKmPerL] = useState("3.3");
  const [toll, setToll] = useState("0");
  const [driverHourly, setDriverHourly] = useState("25");
  const [drivingHours, setDrivingHours] = useState("0");
  const [breaksHours, setBreaksHours] = useState("0");
  const [otherCosts, setOtherCosts] = useState("0");
  const [markup, setMarkup] = useState("20");

  const load = async () => {
    const res = await fetch("/api/route-plans");
    const data = await res.json();
    if (data.items) {
      setSaved(
        data.items.map((r: Record<string, unknown>) => ({
          id: String(r.id),
          name: String(r.name),
          stopCount: Array.isArray(r.stops) ? r.stops.length : 0,
          totalKm: Number(r.totalKm ?? 0),
          totalCost: Number(r.totalCost ?? 0),
          suggestedPrice: Number(r.suggestedPrice ?? 0),
          createdAt: String(r.createdAt),
          stops: Array.isArray(r.stops) ? (r.stops as Stop[]) : [],
          optimized: Array.isArray(r.optimized) ? (r.optimized as Stop[]) : [],
        }))
      );
    }
  };

  useEffect(() => {
    load().catch((e) => setError(String(e)));
  }, []);

  const cost = useMemo(
    () =>
      calculateTripCost({
        km: totalKm,
        fuelPricePerL: Number(fuelPrice) || 0,
        kmPerL: Number(kmPerL) || 0,
        tollEur: Number(toll) || 0,
        driverHourlyEur: Number(driverHourly) || 0,
        drivingHours: Number(drivingHours) || 0,
        breaksHours: Number(breaksHours) || 0,
        otherCostsEur: Number(otherCosts) || 0,
        markupPct: Number(markup) || 0,
      }),
    [totalKm, fuelPrice, kmPerL, toll, driverHourly, drivingHours, breaksHours, otherCosts, markup]
  );

  const handleGeocode = async () => {
    setLoading(true);
    setError("");
    try {
      const parsed = parseLines(raw);
      if (parsed.length < 2) throw new Error("Inserisci almeno due tappe, una per riga.");
      const out: Stop[] = [];
      for (const s of parsed) {
        if (s.lat != null && s.lng != null) {
          out.push(s);
        } else {
          out.push(await geocode(s));
          await new Promise((r) => setTimeout(r, 650));
        }
      }
      setStops(out);
      setOptimized([]);
      setTotalKm(0);
      const missing = out.filter((s) => s.lat == null || s.lng == null).length;
      if (missing > 0) setError(`${missing} tappe non geocodificate. Puoi inserire lat|lng manualmente nella riga (Nome|Indirizzo|lat|lng).`);
      else setSuccess("Indirizzi geocodificati. Ora ottimizza il giro.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const optimize = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const source = stops.length > 0 ? stops : parseLines(raw);
      const res = await fetch("/api/route-plans/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops: source, startIndex, returnToDepot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore ottimizzazione");
      setStops(source);
      setOptimized(data.ordered);
      setTotalKm(Number(data.totalKm ?? 0));
      setSuccess(`Giro ottimizzato: ${data.totalKm} km.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!optimized.length) {
      setError("Ottimizza il giro prima di salvarlo.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/route-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          stops,
          optimized,
          totalKm,
          totalCost: cost.totalCost,
          suggestedPrice: cost.suggestedPrice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore salvataggio");
      setSuccess("Giro salvato.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Eliminare il giro?")) return;
    await fetch(`/api/route-plans/${id}`, { method: "DELETE" });
    load();
  };

  const mapsUrl = useMemo(() => {
    const list = optimized.length > 0 ? optimized : stops;
    if (list.length < 2) return "";
    const points = list.map((s) => (s.lat != null && s.lng != null ? `${s.lat},${s.lng}` : encodeURIComponent(s.address || s.name)));
    const origin = points[0];
    const destination = points[points.length - 1];
    const waypoints = points.slice(1, -1).join("|");
    return `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ""}`;
  }, [optimized, stops]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center text-2xl font-bold text-slate-100">
          <Route className="mr-2.5 h-6 w-6 text-sky-400" /> Giri e costi del viaggio
        </h1>
        <p className="mt-1 text-sm text-slate-400">Incolla le tappe, ottimizza i chilometri e calcola costo reale e prezzo consigliato.</p>
      </div>

      {error && <div className="rounded-xl border border-amber-800/60 bg-amber-950/40 p-3 text-sm text-amber-200">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-200">{success}</div>}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-slate-100">Tappe</h2>
              <span className="text-xs text-slate-500">Una per riga Â· Nome|Indirizzo|lat|lng</span>
            </div>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={8}
              placeholder={"Sede|Via E. da Rotterdam 5, Ferrara|44.8381|11.6198\nCliente A|Via Roma 1, Bologna\nCliente B|Via Milano 10, Verona"}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleGeocode} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-sky-500 disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />} Geocodifica
              </button>
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <input type="checkbox" checked={returnToDepot} onChange={(e) => setReturnToDepot(e.target.checked)} /> ritorno alla sede
              </label>
              <label className="text-xs text-slate-400">
                Partenza:{" "}
                <select value={startIndex} onChange={(e) => setStartIndex(Number(e.target.value))} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200">
                  {(stops.length > 0 ? stops : parseLines(raw)).map((s, i) => (
                    <option key={`${s.name}-${i}`} value={i}>{i + 1}. {s.name}</option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={optimize} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Ottimizza giro
              </button>
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-sky-500">
                  <Navigation className="h-4 w-4" /> Google Maps
                </a>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="mb-3 font-semibold text-slate-100">Tappe ottimizzate</h2>
            {(optimized.length > 0 ? optimized : stops).length === 0 ? (
              <p className="text-sm text-slate-500">Nessuna tappa. Incolla gli indirizzi e ottimizza.</p>
            ) : (
              <ol className="space-y-2">
                {(optimized.length > 0 ? optimized : stops).map((s, i) => (
                  <li key={`${s.name}-${i}`} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-sky-950 text-xs font-bold text-sky-300">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100">{s.name}</p>
                      <p className="truncate text-xs text-slate-500">{s.address}</p>
                      {s.lat != null && s.lng != null && <p className="text-[10px] text-slate-600">{s.lat.toFixed(4)}, {s.lng.toFixed(4)}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="mb-3 flex items-center font-semibold text-slate-100">
              <Calculator className="mr-2 h-4 w-4 text-emerald-400" /> Costo viaggio
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="text-xs text-slate-400">Km totali
                <input value={totalKm} onChange={(e) => setTotalKm(Number(e.target.value))} type="number" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100" />
              </label>
              <label className="text-xs text-slate-400">Gasolio â‚¬/l
                <input value={fuelPrice} onChange={(e) => setFuelPrice(e.target.value)} type="number" step="0.01" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100" />
              </label>
              <label className="text-xs text-slate-400">Consumo km/l
                <input value={kmPerL} onChange={(e) => setKmPerL(e.target.value)} type="number" step="0.1" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100" />
              </label>
              <label className="text-xs text-slate-400">Pedaggi â‚¬
                <input value={toll} onChange={(e) => setToll(e.target.value)} type="number" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100" />
              </label>
              <label className="text-xs text-slate-400">Autista â‚¬/h
                <input value={driverHourly} onChange={(e) => setDriverHourly(e.target.value)} type="number" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100" />
              </label>
              <label className="text-xs text-slate-400">Ore guida
                <input value={drivingHours} onChange={(e) => setDrivingHours(e.target.value)} type="number" step="0.1" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100" />
              </label>
              <label className="text-xs text-slate-400">Ore pause
                <input value={breaksHours} onChange={(e) => setBreaksHours(e.target.value)} type="number" step="0.1" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100" />
              </label>
              <label className="text-xs text-slate-400">Altri costi â‚¬
                <input value={otherCosts} onChange={(e) => setOtherCosts(e.target.value)} type="number" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100" />
              </label>
              <label className="text-xs text-slate-400">Ricarico %
                <input value={markup} onChange={(e) => setMarkup(e.target.value)} type="number" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100" />
              </label>
              <label className="text-xs text-slate-400">Nome giro
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100" />
              </label>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Gasolio</p>
                <p className="mt-1 text-lg font-bold text-slate-100">{eur(cost.fuelCost)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Autista</p>
                <p className="mt-1 text-lg font-bold text-slate-100">{eur(cost.driverCost)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Costo totale</p>
                <p className="mt-1 text-lg font-bold text-slate-100">{eur(cost.totalCost)}</p>
              </div>
              <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">Prezzo consigliato</p>
                <p className="mt-1 text-lg font-bold text-emerald-200">{eur(cost.suggestedPrice)}</p>
              </div>
            </div>
            <button type="button" onClick={save} disabled={saving} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salva giro
            </button>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-100">Giri salvati</h2>
              <a href="/api/export?type=customers" className="text-xs text-slate-500 hover:text-slate-300"><Download className="inline h-3.5 w-3.5" /> clienti</a>
            </div>
            {saved.length === 0 ? (
              <p className="text-sm text-slate-500">Nessun giro salvato.</p>
            ) : (
              <div className="space-y-2">
                {saved.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.stopCount} tappe Â· {r.totalKm} km Â· {eur(r.suggestedPrice)}</p>
                    </div>
                    <button type="button" onClick={() => remove(r.id)} className="text-slate-500 hover:text-red-400" aria-label="Elimina giro">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}


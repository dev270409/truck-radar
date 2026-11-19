"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  Calculator,
  Camera,
  CheckCircle2,
  Loader2,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
  Truck,
  Upload,
} from "lucide-react";
import { label } from "@/lib/labels";

interface VehicleLite {
  id: string;
  targa: string;
  categoria: string;
  portataMaxKg: number;
  volumeMaxM3: number;
}

interface LoadItem {
  id: string;
  descrizione: string;
  quantita: number;
  lunghezzaCm: number;
  larghezzaCm: number;
  altezzaCm: number;
  pesoKg: number;
  impilabile: boolean;
  fragile: boolean;
}

interface PlacedItem extends LoadItem {
  x: number;
  y: number;
  z: number;
  lane: number;
}

interface LoadPlan {
  id: string;
  name: string;
  vehicleType: string;
  containerType: string | null;
  items: LoadItem[];
  totals: Record<string, number | string | boolean | null>;
  createdAt: string;
}

const VEHICLE_SPECS: Record<string, { lengthCm: number; widthCm: number; heightCm: number; payloadKg: number }> = {
  FURGONE: { lengthCm: 420, widthCm: 210, heightCm: 220, payloadKg: 1200 },
  MOTRICE: { lengthCm: 750, widthCm: 245, heightCm: 270, payloadKg: 16000 },
  BILICO: { lengthCm: 1360, widthCm: 245, heightCm: 270, payloadKg: 24000 },
  RIMORCHIO: { lengthCm: 1360, widthCm: 245, heightCm: 270, payloadKg: 24000 },
  CONTAINER: { lengthCm: 1203, widthCm: 235, heightCm: 239, payloadKg: 26000 },
};

const CONTAINER_SPECS: Record<string, { lengthCm: number; widthCm: number; heightCm: number }> = {
  "20'": { lengthCm: 589, widthCm: 235, heightCm: 239 },
  "40'": { lengthCm: 1203, widthCm: 235, heightCm: 239 },
  "40' HC": { lengthCm: 1203, widthCm: 235, heightCm: 269 },
  "45' HC": { lengthCm: 1355, widthCm: 235, heightCm: 269 },
  FRIGO: { lengthCm: 1150, widthCm: 228, heightCm: 226 },
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyItem(): LoadItem {
  return {
    id: uid(),
    descrizione: "",
    quantita: 1,
    lunghezzaCm: 120,
    larghezzaCm: 80,
    altezzaCm: 100,
    pesoKg: 100,
    impilabile: true,
    fragile: false,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function layout(items: LoadItem[], cargo: { lengthCm: number; widthCm: number; heightCm: number; payloadKg: number }) {
  const expanded: LoadItem[] = [];
  for (const item of items) {
    const qty = Math.max(1, Math.min(200, Math.round(item.quantita || 1)));
    for (let i = 0; i < qty; i++) expanded.push(item);
  }
  expanded.sort((a, b) => b.lunghezzaCm - a.lunghezzaCm || b.larghezzaCm - a.larghezzaCm);

  const lanes: Array<{ y: number; width: number; length: number }> = [];
  const placed: PlacedItem[] = [];
  let overflow = false;

  for (const item of expanded) {
    const L = Math.max(10, item.lunghezzaCm);
    const W = Math.max(10, item.larghezzaCm);
    const H = Math.max(10, item.altezzaCm);
    let target: { lane: number; y: number } | null = null;
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      if (lane.length + L <= cargo.lengthCm && W <= lane.width + 1) {
        target = { lane: i, y: lane.y };
        break;
      }
    }
    if (!target) {
      const usedWidth = lanes.reduce((s, l) => s + l.width, 0);
      if (usedWidth + W <= cargo.widthCm) {
        lanes.push({ y: usedWidth, width: W, length: 0 });
        target = { lane: lanes.length - 1, y: usedWidth };
      }
    }
    if (!target) {
      overflow = true;
      continue;
    }
    const lane = lanes[target.lane];
    placed.push({ ...item, x: lane.length, y: target.y, z: 0, lane: target.lane });
    lane.length += L;
    lane.width = Math.max(lane.width, W);
  }

  const usedLength = lanes.reduce((m, l) => Math.max(m, l.length), 0);
  const usedWidth = lanes.reduce((s, l) => s + l.width, 0);
  const totalWeight = placed.reduce((s, i) => s + i.pesoKg, 0);
  const totalVolume = placed.reduce((s, i) => s + (i.lunghezzaCm * i.larghezzaCm * i.altezzaCm) / 1_000_000, 0);
  const baricenter = totalWeight > 0 ? placed.reduce((s, i) => s + i.pesoKg * (i.x + i.lunghezzaCm / 2), 0) / totalWeight : 0;
  const fits =
    placed.length > 0 &&
    !overflow &&
    totalWeight <= cargo.payloadKg &&
    usedLength <= cargo.lengthCm + 1 &&
    usedWidth <= cargo.widthCm + 1;

  return {
    placed,
    lanes,
    usedLength: round2(usedLength / 100),
    usedWidth: round2(usedWidth / 100),
    totalWeight: round2(totalWeight),
    totalVolume: round2(totalVolume),
    baricenter: round2(baricenter / 100),
    fits,
    overflow,
    count: placed.length,
  };
}

function IsoView({ placed, cargo }: { placed: PlacedItem[]; cargo: { lengthCm: number; widthCm: number; heightCm: number } }) {
  const boxes = placed.map((i) => {
    const h = Math.max(10, i.altezzaCm);
    const corners = [
      [i.x, i.y, 0],
      [i.x + i.lunghezzaCm, i.y, 0],
      [i.x + i.lunghezzaCm, i.y + i.larghezzaCm, 0],
      [i.x, i.y + i.larghezzaCm, 0],
      [i.x, i.y, h],
      [i.x + i.lunghezzaCm, i.y, h],
      [i.x + i.lunghezzaCm, i.y + i.larghezzaCm, h],
      [i.x, i.y + i.larghezzaCm, h],
    ] as Array<[number, number, number]>;
    const project = ([x, y, z]: [number, number, number]) => {
      const sx = (x - y) * 0.866;
      const sy = (x + y) * 0.5 - z;
      return [sx, sy] as [number, number];
    };
    const p = corners.map(project);
    return { item: i, p, depth: i.x + i.y };
  });
  boxes.sort((a, b) => a.depth - b.depth);

  const all = boxes.flatMap((b) => b.p).concat([[0, 0], [(cargo.lengthCm - cargo.widthCm) * 0.866, (cargo.lengthCm + cargo.widthCm) * 0.5]]);
  const minX = Math.min(...all.map((p) => p[0]));
  const maxX = Math.max(...all.map((p) => p[0]));
  const minY = Math.min(...all.map((p) => p[1]));
  const maxY = Math.max(...all.map((p) => p[1]));
  const scale = Math.min(720 / Math.max(1, maxX - minX), 380 / Math.max(1, maxY - minY));

  return (
    <svg viewBox="0 0 780 430" className="w-full rounded-xl border border-slate-800 bg-slate-950/60">
      <g transform={`translate(${30 - minX * scale}, ${20 - minY * scale}) scale(${scale})`}>
        {boxes.map(({ item, p }, idx) => {
          const color = item.fragile ? "#f97316" : ["#38bdf8", "#34d399", "#a78bfa", "#f472b6", "#facc15"][idx % 5];
          const top = `${p[4]} ${p[5]} ${p[6]} ${p[7]}`;
          const left = `${p[0]} ${p[1]} ${p[5]} ${p[4]}`;
          const right = `${p[1]} ${p[2]} ${p[6]} ${p[5]}`;
          return (
            <g key={`${item.id}-${idx}`} opacity={0.92}>
              <polygon points={top} fill={color} opacity={0.85} stroke="#0f172a" strokeWidth={1} />
              <polygon points={left} fill={color} opacity={0.55} stroke="#0f172a" strokeWidth={1} />
              <polygon points={right} fill={color} opacity={0.35} stroke="#0f172a" strokeWidth={1} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function TopView({ placed, cargo }: { placed: PlacedItem[]; cargo: { lengthCm: number; widthCm: number } }) {
  const scale = Math.min(720 / Math.max(1, cargo.lengthCm), 240 / Math.max(1, cargo.widthCm));
  return (
    <svg viewBox="0 0 780 300" className="w-full rounded-xl border border-slate-800 bg-slate-950/60">
      <g transform={`translate(20,20)`}>
        <rect x={0} y={0} width={cargo.lengthCm * scale} height={cargo.widthCm * scale} fill="none" stroke="#475569" strokeDasharray="6 4" />
        {placed.map((i, idx) => (
          <rect
            key={`${i.id}-${idx}`}
            x={i.x * scale}
            y={i.y * scale}
            width={i.lunghezzaCm * scale}
            height={i.larghezzaCm * scale}
            fill={i.fragile ? "#f97316" : ["#38bdf8", "#34d399", "#a78bfa", "#f472b6", "#facc15"][idx % 5]}
            opacity={0.7}
            stroke="#0f172a"
            strokeWidth={1}
          />
        ))}
      </g>
    </svg>
  );
}

export default function CaricoPage() {
  const [items, setItems] = useState<LoadItem[]>([emptyItem()]);
  const [name, setName] = useState("Piano di carico");
  const [vehicleType, setVehicleType] = useState("MOTRICE");
  const [containerType, setContainerType] = useState("40'");
  const [vehicleId, setVehicleId] = useState("");
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [plans, setPlans] = useState<LoadPlan[]>([]);
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [vRes, pRes] = await Promise.all([fetch("/api/vehicles"), fetch("/api/load-plans")]);
    const vData = await vRes.json();
    const pData = await pRes.json();
    if (vData.vehicles) setVehicles(vData.vehicles);
    if (pData.items) setPlans(pData.items);
  };

  useEffect(() => {
    load().catch((e) => setError(String(e)));
  }, []);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const cargo = useMemo(() => {
    if (vehicleType === "CONTAINER") {
      const spec = CONTAINER_SPECS[containerType] ?? CONTAINER_SPECS["40'"];
      return { ...spec, payloadKg: selectedVehicle?.portataMaxKg ?? 26000 };
    }
    const spec = VEHICLE_SPECS[vehicleType] ?? VEHICLE_SPECS.MOTRICE;
    return {
      ...spec,
      payloadKg: selectedVehicle?.portataMaxKg ?? spec.payloadKg,
    };
  }, [vehicleType, containerType, selectedVehicle]);

  const result = useMemo(() => layout(items, cargo), [items, cargo]);

  const setItem = (id: string, patch: Partial<LoadItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

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
        body: JSON.stringify({ kind: "packing", file: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "OCR non disponibile");
      const extracted = (data.data?.items ?? []) as Array<Record<string, unknown>>;
      if (extracted.length === 0) throw new Error("Nessun collo riconosciuto nel documento.");
      setItems(
        extracted.map((it) => ({
          id: uid(),
          descrizione: String(it.descrizione ?? "Collo"),
          quantita: Number(it.quantita ?? 1) || 1,
          lunghezzaCm: Number(it.lunghezzaCm ?? 120) || 120,
          larghezzaCm: Number(it.larghezzaCm ?? 80) || 80,
          altezzaCm: Number(it.altezzaCm ?? 100) || 100,
          pesoKg: Number(it.pesoKg ?? 100) || 100,
          impilabile: it.impilabile !== false,
          fragile: it.fragile === true,
        }))
      );
      setSuccess(`Packing list letto: ${extracted.length} colli. Controlla sempre i dati estratti.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOcrLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/load-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          vehicleId: vehicleId || null,
          vehicleType,
          containerType: vehicleType === "CONTAINER" ? containerType : null,
          items,
          totals: {
            usedLengthM: result.usedLength,
            usedWidthM: result.usedWidth,
            totalWeightKg: result.totalWeight,
            totalVolumeM3: result.totalVolume,
            baricenterM: result.baricenter,
            fits: result.fits,
            count: result.count,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio");
      setSuccess("Piano di carico salvato.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const removePlan = async (id: string) => {
    if (!window.confirm("Eliminare il piano di carico?")) return;
    await fetch(`/api/load-plans/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center text-2xl font-bold text-slate-100">
          <Boxes className="mr-2.5 h-6 w-6 text-indigo-400" /> Piano di carico
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Colli, metri lineari, peso sugli assi e vista 3D. Calcola prima di partire, stampa per il magazzino.
        </p>
      </div>

      {error && <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-200">{success}</div>}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-[220px] flex-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Nome piano
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Tipo mezzo
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="FURGONE">Furgone</option>
                  <option value="MOTRICE">Motrice</option>
                  <option value="BILICO">Bilico</option>
                  <option value="RIMORCHIO">Rimorchio</option>
                  <option value="CONTAINER">Container</option>
                </select>
              </label>
              {vehicleType === "CONTAINER" ? (
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Container
                  <select
                    value={containerType}
                    onChange={(e) => setContainerType(e.target.value)}
                    className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  >
                    {Object.keys(CONTAINER_SPECS).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Mezzo in flotta
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="">— dimensioni standard —</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.targa} · {label(v.categoria)}</option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-indigo-500"
              >
                {ocrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Leggi packing list
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
            <p className="mt-2 text-xs text-slate-500">
              {cargo.lengthCm} × {cargo.widthCm} × {cargo.heightCm} cm · portata {cargo.payloadKg.toLocaleString("it-IT")} kg
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-100">Colli</h2>
              <button
                type="button"
                onClick={() => setItems((p) => [...p, emptyItem()])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-indigo-500"
              >
                <Plus className="h-3.5 w-3.5" /> Aggiungi collo
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Collo {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setItems((p) => (p.length > 1 ? p.filter((i) => i.id !== item.id) : p))}
                      className="text-slate-500 hover:text-red-400"
                      aria-label="Rimuovi collo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <input
                      placeholder="Descrizione"
                      value={item.descrizione}
                      onChange={(e) => setItem(item.id, { descrizione: e.target.value })}
                      className="col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100"
                    />
                    <input
                      type="number"
                      min={1}
                      placeholder="Q.tà"
                      value={item.quantita}
                      onChange={(e) => setItem(item.id, { quantita: Number(e.target.value) })}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100"
                    />
                    <input
                      type="number"
                      min={1}
                      placeholder="Peso kg"
                      value={item.pesoKg}
                      onChange={(e) => setItem(item.id, { pesoKg: Number(e.target.value) })}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100"
                    />
                    <input
                      type="number"
                      min={1}
                      placeholder="L cm"
                      value={item.lunghezzaCm}
                      onChange={(e) => setItem(item.id, { lunghezzaCm: Number(e.target.value) })}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100"
                    />
                    <input
                      type="number"
                      min={1}
                      placeholder="P cm"
                      value={item.larghezzaCm}
                      onChange={(e) => setItem(item.id, { larghezzaCm: Number(e.target.value) })}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100"
                    />
                    <input
                      type="number"
                      min={1}
                      placeholder="H cm"
                      value={item.altezzaCm}
                      onChange={(e) => setItem(item.id, { altezzaCm: Number(e.target.value) })}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100"
                    />
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <label className="inline-flex items-center gap-1">
                        <input type="checkbox" checked={item.impilabile} onChange={(e) => setItem(item.id, { impilabile: e.target.checked })} /> impilabile
                      </label>
                      <label className="inline-flex items-center gap-1">
                        <input type="checkbox" checked={item.fragile} onChange={(e) => setItem(item.id, { fragile: e.target.checked })} /> fragile
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="mb-3 flex items-center font-semibold text-slate-100">
              <Calculator className="mr-2 h-4 w-4 text-emerald-400" /> Risultato
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Metri lineari</p>
                <p className="mt-1 text-xl font-bold text-slate-100">{result.usedLength} m</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Peso</p>
                <p className={`mt-1 text-xl font-bold ${result.totalWeight > cargo.payloadKg ? "text-red-400" : "text-slate-100"}`}>
                  {result.totalWeight.toLocaleString("it-IT")} kg
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Volume</p>
                <p className="mt-1 text-xl font-bold text-slate-100">{result.totalVolume} m³</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Baricentro</p>
                <p className="mt-1 text-xl font-bold text-slate-100">{result.baricenter} m</p>
              </div>
            </div>
            <div className={`mt-3 flex items-start gap-2 rounded-xl border p-3 text-sm ${result.fits ? "border-emerald-800/60 bg-emerald-950/30 text-emerald-200" : "border-amber-800/60 bg-amber-950/30 text-amber-200"}`}>
              {result.fits ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" /> : <TriangleAlert className="mt-0.5 h-4 w-4 flex-none" />}
              <span>
                {result.fits
                  ? `Ci sta: ${result.count} colli, ${result.usedLength} m lineari, ${result.totalWeight.toLocaleString("it-IT")} kg.`
                  : result.overflow
                    ? "Non ci sta: alcuni colli non trovano spazio. Prova un mezzo più grande o riduci i colli."
                    : result.totalWeight > cargo.payloadKg
                      ? `Peso oltre la portata di ${(result.totalWeight - cargo.payloadKg).toLocaleString("it-IT")} kg.`
                      : "Ingombro oltre le dimensioni del mezzo: riduci metri lineari o larghezza."}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={saving || items.length === 0}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salva piano
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-indigo-500"
              >
                <Upload className="h-4 w-4" /> Stampa
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="mb-3 flex items-center font-semibold text-slate-100">
              <Truck className="mr-2 h-4 w-4 text-sky-400" /> Vista 2D / 3D
            </h2>
            <TopView placed={result.placed} cargo={cargo} />
            <div className="mt-3">
              <IsoView placed={result.placed} cargo={cargo} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="mb-3 font-semibold text-slate-100">Piani salvati</h2>
            {plans.length === 0 ? (
              <p className="text-sm text-slate-500">Nessun piano salvato.</p>
            ) : (
              <div className="space-y-2">
                {plans.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.vehicleType}{p.containerType ? ` · ${p.containerType}` : ""} ·{" "}
                        {Number(p.totals?.usedLengthM ?? 0)} m · {Number(p.totals?.totalWeightKg ?? 0).toLocaleString("it-IT")} kg
                      </p>
                    </div>
                    <button type="button" onClick={() => removePlan(p.id)} className="text-slate-500 hover:text-red-400" aria-label="Elimina piano">
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

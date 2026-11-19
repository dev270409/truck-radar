"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { label } from "@/lib/labels";

interface Vehicle {
  id: string;
  targa: string;
  categoria: string;
}

interface Cost {
  vehicleId: string;
  importo: number;
}

interface FuelStat {
  vehicleId: string;
  costo: number;
  kmPercorsi: number;
  kmPerLitro: number | null;
}

const eur = (n: number) => `€ ${n.toFixed(2)}`;

export default function BenchmarkPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [fuel, setFuel] = useState<FuelStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/vehicles"), fetch("/api/vehicles/costs"), fetch("/api/fuel")])
      .then(async ([v, c, f]) => {
        const vData = await v.json();
        const cData = await c.json();
        const fData = await f.json();
        if (vData.vehicles) setVehicles(vData.vehicles);
        if (cData.items) setCosts(cData.items);
        if (fData.stats?.perVehicle) setFuel(fData.stats.perVehicle);
      })
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const byCat = new Map<string, { categoria: string; vehicles: number; km: number; total: number; costPerKm: number; kmPerL: number | null }>();
    for (const v of vehicles) {
      const f = fuel.find((x) => x.vehicleId === v.id);
      const other = costs.filter((c) => c.vehicleId === v.id).reduce((s, c) => s + c.importo, 0);
      const total = (f?.costo ?? 0) + other;
      const km = f?.kmPercorsi ?? 0;
      const current = byCat.get(v.categoria) ?? { categoria: v.categoria, vehicles: 0, km: 0, total: 0, costPerKm: 0, kmPerL: null };
      current.vehicles += 1;
      current.km += km;
      current.total += total;
      byCat.set(v.categoria, current);
    }
    return [...byCat.values()]
      .map((r) => ({
        ...r,
        costPerKm: r.km > 0 ? r.total / r.km : 0,
        kmPerL: (() => {
          const stats = vehicles
            .filter((v) => v.categoria === r.categoria)
            .map((v) => fuel.find((f) => f.vehicleId === v.id)?.kmPerLitro)
            .filter((n): n is number => n != null && n > 0);
          return stats.length > 0 ? stats.reduce((s, n) => s + n, 0) / stats.length : null;
        })(),
      }))
      .sort((a, b) => a.costPerKm - b.costPerKm);
  }, [vehicles, costs, fuel]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center text-2xl font-bold text-slate-100">
          <BarChart3 className="mr-2.5 h-6 w-6 text-indigo-400" /> Benchmark costi/km
        </h1>
        <p className="mt-1 text-sm text-slate-400">Confronta costo al chilometro e consumo per categoria di mezzo.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-10 text-slate-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Calcolo...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-500">Servono mezzi, rifornimenti e costi registrati.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r, idx) => (
            <div key={r.categoria} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-bold text-slate-100">{label(r.categoria)}</p>
                {idx === 0 ? <TrendingUp className="h-5 w-5 text-emerald-400" /> : idx === rows.length - 1 ? <TrendingDown className="h-5 w-5 text-red-400" /> : null}
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-100">{r.costPerKm > 0 ? eur(r.costPerKm) : "—"}<span className="ml-1 text-sm font-normal text-slate-500">/km</span></p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                <p>Mezzi: <b className="text-slate-200">{r.vehicles}</b></p>
                <p>Km: <b className="text-slate-200">{r.km.toLocaleString("it-IT")}</b></p>
                <p>Costo: <b className="text-slate-200">€ {r.total.toLocaleString("it-IT")}</b></p>
                <p>Consumo: <b className="text-slate-200">{r.kmPerL != null ? `${r.kmPerL.toFixed(2)} km/l` : "—"}</b></p>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500">Il costo/km include gasolio registrato e costi mezzi (gomme, officina, tagliando, assicurazione, bollo, pedaggi, altro). Non include il costo autista.</p>
    </div>
  );
}

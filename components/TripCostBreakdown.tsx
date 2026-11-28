"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Fuel, Loader2, Plus, ReceiptText, Trash2, User, Wallet } from "lucide-react";

interface CostItem {
  id: string;
  tipo: string;
  label: string | null;
  quantity: number;
  unit: string | null;
  unitCost: number;
  amount: number;
  source: string;
  note: string | null;
}

const COST_LABELS: Record<string, string> = {
  GASOLIO: "Gasolio",
  PEDAGGIO: "Pedaggi",
  AUTISTA: "Autista",
  TRAGHETTO: "Traghetto",
  PARCHEGGIO: "Parcheggio",
  MANUTENZIONE: "Manutenzione",
  ASSICURAZIONE: "Assicurazione",
  ALTRO: "Altro",
};

const KM_PER_L: Record<string, number> = {
  FRIGO: 3.2,
  TELONATO: 3.5,
  SPONDA_IDRAULICA: 3.4,
  CISTERNA: 3.0,
  ADR: 3.0,
};

const eur = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

export default function TripCostBreakdown({
  tripId,
  prezzo,
  vehicleCategory,
  onTotalChange,
}: {
  tripId: string;
  prezzo?: number | null;
  vehicleCategory?: string | null;
  onTotalChange?: (total: number) => void;
}) {
  const [items, setItems] = useState<CostItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [fuelOn, setFuelOn] = useState(true);
  const [km, setKm] = useState("0");
  const [kmPerL, setKmPerL] = useState(String(KM_PER_L[vehicleCategory ?? ""] ?? 3.3));
  const [fuelPrice, setFuelPrice] = useState("1.75");

  const [tollOn, setTollOn] = useState(true);
  const [toll, setToll] = useState("0");

  const [driverOn, setDriverOn] = useState(true);
  const [hours, setHours] = useState("0");
  const [hourly, setHourly] = useState("25");

  const [ferryOn, setFerryOn] = useState(false);
  const [ferry, setFerry] = useState("0");

  const [otherOn, setOtherOn] = useState(false);
  const [otherLabel, setOtherLabel] = useState("Parcheggio");
  const [otherAmount, setOtherAmount] = useState("0");

  const fuelAmount = useMemo(() => {
    const kmValue = Number(km) || 0;
    const consumption = Number(kmPerL) || 0;
    const price = Number(fuelPrice) || 0;
    return consumption > 0 ? (kmValue / consumption) * price : 0;
  }, [km, kmPerL, fuelPrice]);

  const driverAmount = (Number(hours) || 0) * (Number(hourly) || 0);

  const load = async () => {
    try {
      const res = await fetch(`/api/trips/${tripId}/costs`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel caricamento costi");
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total ?? 0));
      onTotalChange?.(Number(data.total ?? 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [tripId]);

  const addSelected = async () => {
    setSaving(true);
    setError("");
    try {
      const payloads: Array<Record<string, unknown>> = [];
      if (fuelOn && fuelAmount > 0) {
        payloads.push({
          tipo: "GASOLIO",
          label: `Gasolio ${km} km`,
          quantity: Number(km) || 0,
          unit: "km",
          unitCost: Number(km) > 0 ? fuelAmount / Number(km) : 0,
          amount: fuelAmount,
        });
      }
      if (tollOn && Number(toll) > 0) {
        payloads.push({ tipo: "PEDAGGIO", label: "Pedaggi autostradali", amount: Number(toll) });
      }
      if (driverOn && driverAmount > 0) {
        payloads.push({
          tipo: "AUTISTA",
          label: `Autista ${hours} h`,
          quantity: Number(hours) || 0,
          unit: "h",
          unitCost: Number(hourly) || 0,
          amount: driverAmount,
        });
      }
      if (ferryOn && Number(ferry) > 0) {
        payloads.push({ tipo: "TRAGHETTO", label: "Traghetto/tunnel", amount: Number(ferry) });
      }
      if (otherOn && Number(otherAmount) > 0) {
        payloads.push({ tipo: "ALTRO", label: otherLabel || "Altro costo", amount: Number(otherAmount) });
      }
      if (payloads.length === 0) throw new Error("Seleziona almeno una spesa con importo maggiore di zero.");

      for (const payload of payloads) {
        const res = await fetch(`/api/trips/${tripId}/costs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Errore nel salvataggio costo");
      }

      setFuelOn(false);
      setTollOn(false);
      setDriverOn(false);
      setFerryOn(false);
      setOtherOn(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: CostItem) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/trips/${tripId}/costs/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nell'eliminazione");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const margin = prezzo != null ? prezzo - total : null;
  const marginPct = prezzo != null && prezzo > 0 ? (margin! / prezzo) * 100 : null;

  return (
    <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-[var(--text)]">
            <Calculator className="h-5 w-5 text-amber-400" /> Costi e margine del viaggio
          </h2>
          <p className="mt-1 text-xs text-[var(--text-label-soft)]">
            Seleziona le spese, calcola il costo approssimativo e confrontalo con il ricavo.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold   text-[var(--text-label-soft)]">Margine</p>
          <p className={`text-xl font-semibold ${margin == null ? "text-[var(--text-label)]" : margin >= 0 ? "text-emerald-300" : "text-red-300"}`}>
            {margin == null ? "—" : eur(margin)}
          </p>
          <p className="text-[11px] text-[var(--text-label-soft)]">{marginPct == null ? "Ricavo non inserito" : `${marginPct.toFixed(1)}% del ricavo`}</p>
        </div>
      </div>

      {error && <div className="mt-3 rounded-lg border border-red-800/60 bg-red-950/40 p-2.5 text-xs text-red-200">{error}</div>}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className={`rounded-xl border p-3 ${fuelOn ? "border-amber-800/60 bg-amber-950/20" : "border-[var(--surface-border)] bg-[var(--surface-soft)]"}`}>
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
            <input type="checkbox" checked={fuelOn} onChange={(e) => setFuelOn(e.target.checked)} />
            <Fuel className="h-3.5 w-3.5 text-amber-400" /> Gasolio
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <input value={km} onChange={(e) => setKm(e.target.value)} type="number" min="0" placeholder="km" className="rounded border border-[var(--surface-border)] bg-[var(--surface-soft)] px-2 py-1.5 text-xs text-[var(--text)]" />
            <input value={kmPerL} onChange={(e) => setKmPerL(e.target.value)} type="number" min="0" step="0.1" placeholder="km/l" className="rounded border border-[var(--surface-border)] bg-[var(--surface-soft)] px-2 py-1.5 text-xs text-[var(--text)]" />
            <input value={fuelPrice} onChange={(e) => setFuelPrice(e.target.value)} type="number" min="0" step="0.01" placeholder="€/l" className="rounded border border-[var(--surface-border)] bg-[var(--surface-soft)] px-2 py-1.5 text-xs text-[var(--text)]" />
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--text-label)]">Stima: {eur(fuelAmount)}</p>
        </div>

        <div className={`rounded-xl border p-3 ${tollOn ? "border-sky-800/60 bg-sky-950/20" : "border-[var(--surface-border)] bg-[var(--surface-soft)]"}`}>
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
            <input type="checkbox" checked={tollOn} onChange={(e) => setTollOn(e.target.checked)} />
            <ReceiptText className="h-3.5 w-3.5 text-sky-400" /> Pedaggi
          </label>
          <input value={toll} onChange={(e) => setToll(e.target.value)} type="number" min="0" step="0.01" placeholder="€ pedaggi" className="mt-2 w-full rounded border border-[var(--surface-border)] bg-[var(--surface-soft)] px-2 py-1.5 text-xs text-[var(--text)]" />
        </div>

        <div className={`rounded-xl border p-3 ${driverOn ? "border-violet-800/60 bg-violet-950/20" : "border-[var(--surface-border)] bg-[var(--surface-soft)]"}`}>
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
            <input type="checkbox" checked={driverOn} onChange={(e) => setDriverOn(e.target.checked)} />
            <User className="h-3.5 w-3.5 text-violet-400" /> Autista
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input value={hours} onChange={(e) => setHours(e.target.value)} type="number" min="0" step="0.5" placeholder="ore" className="rounded border border-[var(--surface-border)] bg-[var(--surface-soft)] px-2 py-1.5 text-xs text-[var(--text)]" />
            <input value={hourly} onChange={(e) => setHourly(e.target.value)} type="number" min="0" step="0.5" placeholder="€/h" className="rounded border border-[var(--surface-border)] bg-[var(--surface-soft)] px-2 py-1.5 text-xs text-[var(--text)]" />
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--text-label)]">Stima: {eur(driverAmount)}</p>
        </div>

        <div className={`rounded-xl border p-3 ${ferryOn ? "border-teal-800/60 bg-teal-950/20" : "border-[var(--surface-border)] bg-[var(--surface-soft)]"}`}>
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
            <input type="checkbox" checked={ferryOn} onChange={(e) => setFerryOn(e.target.checked)} />
            <Wallet className="h-3.5 w-3.5 text-teal-400" /> Traghetto / tunnel
          </label>
          <input value={ferry} onChange={(e) => setFerry(e.target.value)} type="number" min="0" step="0.01" placeholder="€" className="mt-2 w-full rounded border border-[var(--surface-border)] bg-[var(--surface-soft)] px-2 py-1.5 text-xs text-[var(--text)]" />
        </div>

        <div className={`rounded-xl border p-3 md:col-span-2 ${otherOn ? "border-[var(--surface-border)] bg-[var(--surface-strong)]" : "border-[var(--surface-border)] bg-[var(--surface-soft)]"}`}>
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
            <input type="checkbox" checked={otherOn} onChange={(e) => setOtherOn(e.target.checked)} />
            Altro costo
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input value={otherLabel} onChange={(e) => setOtherLabel(e.target.value)} placeholder="Descrizione" className="rounded border border-[var(--surface-border)] bg-[var(--surface-soft)] px-2 py-1.5 text-xs text-[var(--text)]" />
            <input value={otherAmount} onChange={(e) => setOtherAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="€" className="rounded border border-[var(--surface-border)] bg-[var(--surface-soft)] px-2 py-1.5 text-xs text-[var(--text)]" />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={addSelected}
        disabled={saving}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Aggiungi spese selezionate
      </button>

      <div className="mt-5 border-t border-[var(--surface-border)] pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-[var(--text)]">Costi registrati</span>
          <span className="font-semibold text-[var(--text)]">{loading ? "..." : eur(total)}</span>
        </div>
        {items.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--text-label-soft)]">Nessun costo analitico. Aggiungi gasolio, pedaggi o autista per calcolare il margine.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--surface-border)]">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--text)]">{COST_LABELS[item.tipo] ?? item.tipo}{item.label ? ` · ${item.label}` : ""}</p>
                  <p className="text-[var(--text-label-soft)]">
                    {item.quantity > 0 ? `${item.quantity} ${item.unit ?? ""} · ` : ""}{eur(item.amount)}
                  </p>
                </div>
                <button type="button" onClick={() => remove(item)} disabled={saving} className="text-red-300 hover:text-red-200 disabled:opacity-50" title="Elimina costo">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--surface-border)] pt-3 text-xs">
          <div>
            <p className="text-[var(--text-label-soft)]">Ricavo viaggio</p>
            <p className="font-semibold text-[var(--text)]">{prezzo != null ? eur(prezzo) : "Non inserito"}</p>
          </div>
          <div>
            <p className="text-[var(--text-label-soft)]">Costo totale</p>
            <p className="font-semibold text-amber-300">{eur(total)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

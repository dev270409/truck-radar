"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, FileText, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { label } from "@/lib/labels";
import EmptyState from "@/components/ops/EmptyState";

interface CustomerLite {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Quote {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  pickup: string;
  delivery: string;
  goods: string | null;
  weightKg: number;
  volumeM3: number;
  linearM: number;
  price: number;
  cost: number;
  status: string;
  validUntil: string | null;
  notes: string | null;
  createdAt: string;
}

const statusStyle: Record<string, string> = {
  BOZZA: "bg-slate-800 text-slate-300 border-slate-600",
  INVIATO: "bg-sky-950 text-sky-300 border-sky-800",
  ACCETTATO: "bg-emerald-950 text-emerald-300 border-emerald-800",
  RIFIUTATO: "bg-red-950 text-red-300 border-red-800",
  SCADUTO: "bg-amber-950 text-amber-300 border-amber-800",
};

const eur = (n: number) => `€ ${Math.round(n).toLocaleString("it-IT")}`;

export default function PreventiviPage() {
  const [items, setItems] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [goods, setGoods] = useState("");
  const [weightKg, setWeightKg] = useState("0");
  const [volumeM3, setVolumeM3] = useState("0");
  const [linearM, setLinearM] = useState("0");
  const [price, setPrice] = useState("0");
  const [cost, setCost] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/quotes");
      const data = await res.json();
      if (data.items) setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await fetch("/api/customers?type=CLIENTE");
      const data = await res.json();
      if (res.ok && Array.isArray(data.items)) {
        setCustomers(
          data.items.map((item: CustomerLite) => ({
            id: item.id,
            name: item.name,
            email: item.email,
            phone: item.phone,
          }))
        );
      }
    } catch {
      // l'anagrafica è opzionale: il preventivo resta compilabile a mano
    }
  };

  useEffect(() => {
    load();
    loadCustomers();
  }, []);

  const selectCustomer = (id: string) => {
    setCustomerId(id);
    const customer = customers.find((item) => item.id === id);
    if (!customer) return;
    setCustomerName(customer.name);
    setCustomerEmail(customer.email ?? "");
    setCustomerPhone(customer.phone ?? "");
  };

  const reset = () => {
    setCustomerId("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setPickup("");
    setDelivery("");
    setGoods("");
    setWeightKg("0");
    setVolumeM3("0");
    setLinearM("0");
    setPrice("0");
    setCost("0");
    setValidUntil("");
    setNotes("");
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || null,
          customerName,
          customerEmail,
          customerPhone,
          pickup,
          delivery,
          goods,
          weightKg: Number(weightKg),
          volumeM3: Number(volumeM3),
          linearM: Number(linearM),
          price: Number(price),
          cost: Number(cost),
          status: "BOZZA",
          validUntil: validUntil || null,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio");
      setShowForm(false);
      reset();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Eliminare il preventivo?")) return;
    await fetch(`/api/quotes/${id}`, { method: "DELETE" });
    load();
  };

  const margin = (q: Quote) => q.price - q.cost;
  const marginPct = (q: Quote) => (q.price > 0 ? (margin(q) / q.price) * 100 : 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-slate-100">
            <FileText className="mr-2.5 h-6 w-6 text-emerald-400" /> Preventivi
          </h1>
          <p className="mt-1 text-sm text-slate-400">Prezzo, costo, margine e registro modifiche. Il preventivo accettato diventa ordine.</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/export?type=quotes"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-indigo-500"
          >
            <Download className="h-4 w-4" /> Esporta CSV
          </a>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" /> Nuovo preventivo
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>}

      {showForm && (
        <form onSubmit={create} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="col-span-full flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={customerId}
                onChange={(e) => selectCustomer(e.target.value)}
                aria-label="Seleziona cliente dall'anagrafica"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Cliente occasionale / nuovo — compila i campi sotto</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <a href="/dashboard/anagrafica" className="text-xs font-semibold text-indigo-300 hover:text-indigo-200">
                Gestisci anagrafica
              </a>
            </div>
            <input required placeholder="Cliente *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <input placeholder="Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <input placeholder="Telefono" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <input required placeholder="Ritiro *" value={pickup} onChange={(e) => setPickup(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <input required placeholder="Consegna *" value={delivery} onChange={(e) => setDelivery(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <input placeholder="Merce" value={goods} onChange={(e) => setGoods(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <input type="number" placeholder="Peso kg" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <input type="number" placeholder="Volume m³" value={volumeM3} onChange={(e) => setVolumeM3(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <input type="number" placeholder="Metri lineari" value={linearM} onChange={(e) => setLinearM(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <input type="number" placeholder="Prezzo €" value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <input type="number" placeholder="Costo €" value={cost} onChange={(e) => setCost(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            <textarea placeholder="Note" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" rows={2} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Margine: <b className="text-emerald-300">{eur(Number(price) - Number(cost))}</b>
              {Number(price) > 0 ? ` (${Math.round(((Number(price) - Number(cost)) / Number(price)) * 100)}%)` : ""}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300">Annulla</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Salva preventivo
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="ops-card flex items-center justify-center p-8 text-slate-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Caricamento...</div>
        ) : items.length === 0 ? (
          <div className="ops-card">
            <EmptyState
              icon={FileText}
              title="Nessun preventivo"
              description="Parti da cliente e tratta: prezzo, costo e margine vengono calcolati mentre compili."
              actionLabel="Crea il primo preventivo"
              onAction={() => setShowForm(true)}
            />
          </div>
        ) : (
          items.map((q) => (
            <div key={q.id} className="ops-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">{q.customerName}</p>
                  <p className="text-xs text-slate-500">{q.pickup} → {q.delivery}</p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusStyle[q.status] ?? statusStyle.BOZZA}`}>{label(q.status)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3" style={{ borderColor: "var(--surface-border)" }}>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500">Prezzo</p>
                  <p className="text-sm font-bold text-slate-100">{eur(q.price)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500">Margine</p>
                  <p className={`text-sm font-bold ${margin(q) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{eur(margin(q))}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                {q.status !== "ACCETTATO" && (
                  <button type="button" onClick={() => setStatus(q.id, "ACCETTATO")} className="inline-flex items-center gap-1 rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Accetta
                  </button>
                )}
                <button type="button" onClick={() => remove(q.id)} className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-red-300" aria-label="Elimina">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70 md:block">
        {loading ? (
          <div className="flex items-center justify-center p-10 text-slate-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Caricamento...</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nessun preventivo"
            description="Crea un preventivo o importa i clienti dall'anagrafica: il margine resta visibile accanto al prezzo."
            actionLabel="Crea il primo preventivo"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Tratta</th>
                <th className="px-4 py-3 text-right">Prezzo</th>
                <th className="px-4 py-3 text-right">Costo</th>
                <th className="px-4 py-3 text-right">Margine</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr key={q.id} className="border-b border-slate-800/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-100">{q.customerName}</p>
                    <p className="text-xs text-slate-500">{q.customerEmail || q.customerPhone || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{q.pickup} → {q.delivery}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-100">{eur(q.price)}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{eur(q.cost)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${margin(q) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {eur(margin(q))}<span className="ml-1 text-xs font-normal text-slate-500">{Math.round(marginPct(q))}%</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusStyle[q.status] ?? statusStyle.BOZZA}`}>{label(q.status)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {q.status !== "ACCETTATO" && (
                        <button type="button" onClick={() => setStatus(q.id, "ACCETTATO")} className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 p-2 text-emerald-300 hover:bg-emerald-900/40" title="Accetta e crea ordine">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                      <button type="button" onClick={() => remove(q.id)} className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-red-300" title="Elimina">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

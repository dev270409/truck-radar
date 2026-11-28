"use client";

import { useEffect, useState } from "react";
import { Copy, Download, ExternalLink, Loader2, PackageCheck, Plus, RefreshCw, Route } from "lucide-react";
import { label } from "@/lib/labels";
import EmptyState from "@/components/ops/EmptyState";

interface Order {
  id: string;
  customerName: string;
  customerEmail: string | null;
  pickup: string;
  delivery: string;
  goods: string | null;
  weightKg: number;
  volumeM3: number;
  price: number;
  status: string;
  notes: string | null;
  tripId: string | null;
  createdAt: string;
}

interface Portal {
  token: string;
  enabled: boolean;
  brandName: string | null;
  brandColor: string;
}

interface CustomerLite {
  id: string;
  name: string;
  email: string | null;
}

const statuses = ["RICEVUTO", "CONFERMATO", "IN_VIAGGIO", "CONSEGNATO", "ANNULLATO"];

const statusStyle: Record<string, string> = {
  RICEVUTO: "bg-amber-950 text-amber-300 border-amber-800",
  CONFERMATO: "bg-sky-950 text-sky-300 border-sky-800",
  IN_VIAGGIO: "bg-indigo-950 text-indigo-300 border-indigo-800",
  CONSEGNATO: "bg-emerald-950 text-emerald-300 border-emerald-800",
  ANNULLATO: "bg-red-950 text-red-300 border-red-800",
};

const eur = (n: number) => `€ ${Math.round(n).toLocaleString("it-IT")}`;

export default function OrdiniPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [portal, setPortal] = useState<Portal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandColor, setBrandColor] = useState("#F5B800");
  const [customers, setCustomers] = useState<CustomerLite[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [goods, setGoods] = useState("");
  const [weightKg, setWeightKg] = useState("0");
  const [volumeM3, setVolumeM3] = useState("0");
  const [price, setPrice] = useState("0");
  const [notes, setNotes] = useState("");

  const load = async () => {
    try {
      const [oRes, pRes] = await Promise.all([fetch("/api/orders"), fetch("/api/portal")]);
      const oData = await oRes.json();
      const pData = await pRes.json();
      if (oData.items) setItems(oData.items);
      if (pData.portal) {
        setPortal(pData.portal);
        setBrandName(pData.portal.brandName ?? "");
        setBrandColor(pData.portal.brandColor ?? "#F5B800");
      }
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
          }))
        );
      }
    } catch {
      // l'anagrafica è opzionale: l'ordine resta compilabile a mano
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
  };

  const portalUrl = portal ? `${typeof window !== "undefined" ? window.location.origin : ""}/portale/${portal.token}` : "";

  const activatePortal = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName: brandName || undefined, brandColor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore attivazione portale");
      setPortal(data.portal);
      setSuccess("Portale ordini attivo.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const updatePortal = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/portal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName, brandColor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore aggiornamento portale");
      setPortal(data.portal);
      setSuccess("Portale aggiornato.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    setSuccess("Link copiato.");
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || null,
          customerName,
          customerEmail,
          pickup,
          delivery,
          goods,
          weightKg: Number(weightKg),
          volumeM3: Number(volumeM3),
          price: Number(price),
          notes,
          status: "RICEVUTO",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio");
      setShowForm(false);
      setCustomerId("");
      setCustomerName("");
      setCustomerEmail("");
      setPickup("");
      setDelivery("");
      setGoods("");
      setNotes("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) load();
  };

  const createTrip = async (order: Order) => {
    setError("");
    try {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 86_400_000);
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          luogoRitiro: order.pickup,
          luogoConsegna: order.delivery,
          dataRitiro: today.toISOString(),
          dataConsegna: tomorrow.toISOString(),
          tipoMerce: order.goods || "Merce",
          pesoKg: order.weightKg,
          volumeM3: order.volumeM3,
          cliente: order.customerName,
          prezzo: order.price,
          note: order.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore creazione viaggio");
      await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONFERMATO", tripId: data.trip.id }),
      });
      setSuccess("Viaggio creato e ordine confermato.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center text-2xl font-semibold text-[var(--text)]">
            <PackageCheck className="mr-2.5 h-6 w-6 text-amber-400" /> Ordini
          </h1>
          <p className="mt-1 text-sm text-[var(--text-label)]">Ordini e richieste dal portale cliente, con stati e conversione in viaggio.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/export?type=orders" className="inline-flex items-center gap-2 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:border-indigo-500">
            <Download className="h-4 w-4" /> Esporta CSV
          </a>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:border-indigo-500">
            <RefreshCw className="h-4 w-4" /> Aggiorna
          </button>
          <button type="button" onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-500">
            <Plus className="h-4 w-4" /> Nuovo ordine
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-200">{success}</div>}

      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[var(--text)]">Portale ordini cliente</h2>
            <p className="mt-1 text-xs text-[var(--text-label-soft)]">Una pagina brandizzata dove i clienti inviano ordini e richieste di preventivo.</p>
          </div>
          {portal ? (
            <div className="flex flex-wrap items-center gap-2">
              <a href={portalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:border-indigo-500">
                <ExternalLink className="h-3.5 w-3.5" /> Apri portale
              </a>
              <button type="button" onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:border-indigo-500">
                <Copy className="h-3.5 w-3.5" /> Copia link
              </button>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${portal.enabled ? "border-emerald-800 bg-emerald-950 text-emerald-300" : "border-[var(--surface-border)] bg-[var(--surface)] text-[var(--text-label)]"}`}>
                {portal.enabled ? "Attivo" : "Disattivato"}
              </span>
            </div>
          ) : (
            <button type="button" onClick={activatePortal} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Attiva portale
            </button>
          )}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <input placeholder="Nome brand (es. Trasporti Rossi)" value={brandName} onChange={(e) => setBrandName(e.target.value)} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
          <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-2" />
          <button type="button" onClick={updatePortal} disabled={saving || !portal} className="rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:border-indigo-500 disabled:opacity-50">
            Salva brand
          </button>
        </div>
        {portal && <p className="mt-2 break-all text-xs text-[var(--text-label-soft)]">{portalUrl}</p>}
      </section>

      {showForm && (
        <form onSubmit={create} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="col-span-full flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={customerId}
                onChange={(e) => selectCustomer(e.target.value)}
                aria-label="Seleziona cliente dall'anagrafica"
                className="flex-1 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]"
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
            <input required placeholder="Cliente *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
            <input placeholder="Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
            <input placeholder="Merce" value={goods} onChange={(e) => setGoods(e.target.value)} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
            <input required placeholder="Ritiro *" value={pickup} onChange={(e) => setPickup(e.target.value)} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
            <input required placeholder="Consegna *" value={delivery} onChange={(e) => setDelivery(e.target.value)} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
            <input type="number" placeholder="Prezzo €" value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
            <input type="number" placeholder="Peso kg" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
            <input type="number" placeholder="Volume m³" value={volumeM3} onChange={(e) => setVolumeM3(e.target.value)} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
            <textarea placeholder="Note" value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)] md:col-span-1" rows={1} />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm text-[var(--text-soft)]">Annulla</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Salva ordine
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="ops-card flex items-center justify-center p-8 text-[var(--text-label)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Caricamento...</div>
        ) : items.length === 0 ? (
          <div className="ops-card">
            <EmptyState
              icon={PackageCheck}
              title="Nessun ordine"
              description="Crea il primo ordine oppure attiva il portale e condividi il link con i clienti."
              actionLabel="Crea il primo ordine"
              onAction={() => setShowForm(true)}
            />
          </div>
        ) : (
          items.map((o) => (
            <div key={o.id} className="ops-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text)]">{o.customerName}</p>
                  <p className="text-xs text-[var(--text-label-soft)]">{o.pickup} → {o.delivery}</p>
                </div>
                <p className="text-sm font-semibold text-[var(--text)]">{eur(o.price)}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: "var(--surface-border)" }}>
                <select
                  value={o.status}
                  onChange={(e) => setStatus(o.id, e.target.value)}
                  className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${statusStyle[o.status] ?? statusStyle.RICEVUTO}`}
                >
                  {statuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </select>
                {!o.tripId && o.status !== "ANNULLATO" && (
                  <button type="button" onClick={() => createTrip(o)} className="inline-flex items-center gap-1 rounded-lg border border-sky-800/60 bg-sky-950/40 px-2.5 py-1.5 text-[11px] font-semibold text-sky-300">
                    <Route className="h-3.5 w-3.5" /> Crea viaggio
                  </button>
                )}
                {o.tripId && <span className="text-[11px] text-emerald-300">Viaggio collegato</span>}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] md:block">
        {loading ? (
          <div className="flex items-center justify-center p-10 text-[var(--text-label)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Caricamento...</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="Nessun ordine"
            description="Gli ordini del portale arrivano qui. Puoi anche crearne uno manualmente e convertirlo in viaggio."
            actionLabel="Crea il primo ordine"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--surface-border)] text-[11px]   text-[var(--text-label-soft)]">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Tratta</th>
                <th className="px-4 py-3 text-right">Prezzo</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id} className="border-b border-[var(--surface-border)] last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--text)]">{o.customerName}</p>
                    <p className="text-xs text-[var(--text-label-soft)]">{o.customerEmail || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-soft)]">
                    {o.pickup} → {o.delivery}
                    <p className="text-xs text-[var(--text-label-soft)]">{o.goods || "Merce"} · {o.weightKg} kg</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[var(--text)]">{eur(o.price)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={o.status}
                      onChange={(e) => setStatus(o.id, e.target.value)}
                      className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${statusStyle[o.status] ?? statusStyle.RICEVUTO}`}
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>{label(s)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {!o.tripId && o.status !== "ANNULLATO" && (
                        <button type="button" onClick={() => createTrip(o)} className="inline-flex items-center gap-1 rounded-lg border border-sky-800/60 bg-sky-950/40 px-2 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-900/40">
                          <Route className="h-3.5 w-3.5" /> Crea viaggio
                        </button>
                      )}
                      {o.tripId && <span className="text-xs text-emerald-300">Viaggio collegato</span>}
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


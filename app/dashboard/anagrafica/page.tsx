"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Download,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
  Users,
  X,
} from "lucide-react";

type CustomerType = "CLIENTE" | "FORNITORE";

interface Customer {
  id: string;
  type: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  vat: string | null;
  sdi: string | null;
  pec: string | null;
  paymentTerms: string | null;
  notes: string | null;
  addressCount?: number;
  createdAt: string;
}

interface CustomerAddress {
  id: string;
  label: string;
  address: string;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  notes: string | null;
}

interface CustomerForm {
  type: CustomerType;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  vat: string;
  sdi: string;
  pec: string;
  paymentTerms: string;
  notes: string;
}

const EMPTY_FORM: CustomerForm = {
  type: "CLIENTE",
  name: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  country: "IT",
  vat: "",
  sdi: "",
  pec: "",
  paymentTerms: "",
  notes: "",
};

const EMPTY_ADDRESS = {
  label: "Sede operativa",
  address: "",
  city: "",
  province: "",
  postalCode: "",
};

function toForm(customer: Customer): CustomerForm {
  return {
    type: customer.type === "FORNITORE" ? "FORNITORE" : "CLIENTE",
    name: customer.name ?? "",
    contactName: customer.contactName ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    city: customer.city ?? "",
    province: customer.province ?? "",
    postalCode: customer.postalCode ?? "",
    country: customer.country ?? "IT",
    vat: customer.vat ?? "",
    sdi: customer.sdi ?? "",
    pec: customer.pec ?? "",
    paymentTerms: customer.paymentTerms ?? "",
    notes: customer.notes ?? "",
  };
}

function cityLine(customer: Customer | CustomerAddress) {
  return [customer.postalCode, customer.city, customer.province]
    .filter(Boolean)
    .join(" ");
}

export default function AnagraficaPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [tab, setTab] = useState<CustomerType>("CLIENTE");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel caricamento dell'anagrafica.");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const counts = useMemo(
    () => ({
      CLIENTE: items.filter((item) => item.type !== "FORNITORE").length,
      FORNITORE: items.filter((item) => item.type === "FORNITORE").length,
    }),
    [items]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items
      .filter((item) => (tab === "FORNITORE" ? item.type === "FORNITORE" : item.type !== "FORNITORE"))
      .filter((item) => {
        if (!term) return true;
        return [item.name, item.contactName, item.email, item.vat, item.city, item.phone]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      });
  }, [items, q, tab]);

  const withVat = items.filter((item) => Boolean(item.vat)).length;
  const addressTotal = items.reduce((sum, item) => sum + (item.addressCount ?? 0), 0);

  const openCreate = (type: CustomerType) => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, type });
    setAddresses([]);
    setFormError("");
    setAddressError("");
    setModalOpen(true);
  };

  const openEdit = async (customer: Customer) => {
    setEditing(customer);
    setForm(toForm(customer));
    setAddresses([]);
    setFormError("");
    setAddressError("");
    setModalOpen(true);
    setAddressesLoading(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel caricamento della scheda.");
      setAddresses(Array.isArray(data.addresses) ? data.addresses : []);
      if (data.item) setForm(toForm(data.item));
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : String(err));
    } finally {
      setAddressesLoading(false);
    }
  };

  const closeModal = () => {
    if (saving || addressSaving) return;
    setModalOpen(false);
    setEditing(null);
    setAddresses([]);
  };

  const updateField = (key: keyof CustomerForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setSuccess("");
    try {
      const res = await fetch(editing ? `/api/customers/${editing.id}` : "/api/customers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio.");
      setSuccess(editing ? "Anagrafica aggiornata." : "Anagrafica creata.");
      setModalOpen(false);
      setEditing(null);
      setAddresses([]);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const removeCustomer = async (customer: Customer) => {
    const label = customer.type === "FORNITORE" ? "fornitore" : "cliente";
    if (
      !window.confirm(
        `Eliminare il ${label} "${customer.name}"? L'operazione non può essere annullata.`
      )
    ) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nell'eliminazione.");
      setSuccess(`Anagrafica "${customer.name}" eliminata.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const addAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setAddressSaving(true);
    setAddressError("");
    try {
      const res = await fetch(`/api/customers/${editing.id}/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio dell'indirizzo.");
      setAddresses((current) => [...current, data.item]);
      setAddressForm(EMPTY_ADDRESS);
      await load();
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : String(err));
    } finally {
      setAddressSaving(false);
    }
  };

  const removeAddress = async (address: CustomerAddress) => {
    if (!editing) return;
    if (!window.confirm(`Eliminare l'indirizzo "${address.label}"?`)) return;
    setAddressError("");
    try {
      const res = await fetch(`/api/customers/${editing.id}/addresses/${address.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nell'eliminazione.");
      setAddresses((current) => current.filter((item) => item.id !== address.id));
      await load();
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ops-label">Commerciale</p>
          <h1 className="ops-title mt-1 flex items-center gap-2 text-2xl">
            <Building2 className="h-6 w-6" style={{ color: "var(--brand)" }} /> Anagrafica
          </h1>
          <p className="ops-subtitle mt-1 text-[13px]">
            Clienti e fornitori in un unico archivio: contatti, P.IVA, condizioni di pagamento e sedi
            secondarie. Le stesse anagrafiche alimentano preventivi, ordini e portale.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/export?type=customers" className="ops-btn ops-btn--secondary ops-btn--sm">
            <Download className="h-4 w-4" /> Esporta CSV
          </a>
          <button
            type="button"
            onClick={() => openCreate(tab)}
            className="ops-btn ops-btn--primary ops-btn--sm"
          >
            <Plus className="h-4 w-4" /> Nuovo {tab === "FORNITORE" ? "fornitore" : "cliente"}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="flex items-start justify-between gap-3 rounded-[12px] border p-3 text-[13px]"
          style={{ borderColor: "var(--danger)", color: "var(--danger)", background: "var(--surface)" }}
        >
          <span>{error}</span>
          <button type="button" aria-label="Chiudi" onClick={() => setError("")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <div
          className="rounded-[12px] border p-3 text-[13px]"
          style={{ borderColor: "var(--success)", color: "var(--success)", background: "var(--surface)" }}
        >
          {success}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Clienti" value={counts.CLIENTE} icon={<Users className="h-4 w-4" />} tone="var(--info)" />
        <Metric label="Fornitori" value={counts.FORNITORE} icon={<Truck className="h-4 w-4" />} tone="var(--warning)" />
        <Metric label="Con P.IVA / CF" value={withVat} icon={<Building2 className="h-4 w-4" />} tone="var(--success)" />
        <Metric label="Sedi secondarie" value={addressTotal} icon={<MapPin className="h-4 w-4" />} tone="var(--brand)" />
      </div>

      <section className="ops-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4" style={{ borderColor: "var(--surface-border)" }}>
          <div
            className="flex gap-1 rounded-[10px] p-1"
            style={{ background: "var(--surface-soft)", border: "1px solid var(--surface-border)" }}
            role="tablist"
            aria-label="Tipo anagrafica"
          >
            {(["CLIENTE", "FORNITORE"] as CustomerType[]).map((value) => {
              const active = tab === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(value)}
                  className="rounded-[8px] px-3 py-1.5 text-[12px] font-semibold transition"
                  style={{
                    background: active ? "var(--surface)" : "transparent",
                    color: active ? "var(--text)" : "var(--text-label)",
                    boxShadow: active ? "var(--surface-shadow)" : "none",
                  }}
                >
                  {value === "CLIENTE" ? "Clienti" : "Fornitori"} ({counts[value]})
                </button>
              );
            })}
          </div>
          <div className="relative w-full max-w-[340px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: "var(--text-label-soft)" }}
            />
            <input
              type="search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Cerca nome, email, P.IVA, città…"
              className="ops-input pl-9"
              aria-label="Cerca in anagrafica"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-[13px]" style={{ color: "var(--text-label)" }}>
            <Loader2 className="h-5 w-5 animate-spin" /> Caricamento anagrafica…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <span
              className="grid h-12 w-12 place-items-center rounded-full"
              style={{ background: "var(--surface-soft)", color: "var(--brand)" }}
            >
              <Building2 className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-[15px] font-semibold" style={{ color: "var(--text)" }}>
                {q.trim()
                  ? `Nessun risultato per "${q.trim()}"`
                  : tab === "FORNITORE"
                    ? "Nessun fornitore in archivio"
                    : "Nessun cliente in archivio"}
              </p>
              <p className="mt-1 text-[12px]" style={{ color: "var(--text-label)" }}>
                {q.trim()
                  ? "Prova con un altro termine di ricerca."
                  : "Aggiungi la prima anagrafica: sarà riutilizzabile in preventivi e ordini."}
              </p>
            </div>
            {!q.trim() && (
              <button type="button" onClick={() => openCreate(tab)} className="ops-btn ops-btn--primary ops-btn--sm">
                <Plus className="h-4 w-4" /> Aggiungi il primo {tab === "FORNITORE" ? "fornitore" : "cliente"}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="ops-table w-full text-left">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Contatti</th>
                    <th>Sede</th>
                    <th>P.IVA / CF</th>
                    <th>Pagamento</th>
                    <th className="text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <p className="font-semibold" style={{ color: "var(--text)" }}>{customer.name}</p>
                        <p className="text-[11px]" style={{ color: "var(--text-label)" }}>
                          {customer.contactName || (customer.type === "FORNITORE" ? "Fornitore" : "Cliente")}
                          {(customer.addressCount ?? 0) > 0 ? ` · ${customer.addressCount} sedi` : ""}
                        </p>
                      </td>
                      <td>
                        <div className="space-y-0.5 text-[12px]" style={{ color: "var(--text-soft)" }}>
                          {customer.email ? (
                            <span className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3" /> {customer.email}
                            </span>
                          ) : null}
                          {customer.phone ? (
                            <span className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3" /> {customer.phone}
                            </span>
                          ) : null}
                          {!customer.email && !customer.phone ? (
                            <span style={{ color: "var(--text-label-soft)" }}>—</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="text-[12px]" style={{ color: "var(--text-soft)" }}>
                        {customer.address || cityLine(customer) ? (
                          <>
                            <p>{customer.address || "—"}</p>
                            <p style={{ color: "var(--text-label)" }}>{cityLine(customer)}</p>
                          </>
                        ) : (
                          <span style={{ color: "var(--text-label-soft)" }}>—</span>
                        )}
                      </td>
                      <td className="font-mono text-[12px]" style={{ color: "var(--text-soft)" }}>
                        {customer.vat || "—"}
                      </td>
                      <td className="text-[12px]" style={{ color: "var(--text-soft)" }}>
                        {customer.paymentTerms || "—"}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => void openEdit(customer)}
                            className="inline-flex items-center gap-1 rounded-[8px] border px-2 py-1 text-[11px] font-semibold"
                            style={{ borderColor: "var(--surface-border)", color: "var(--text-soft)" }}
                          >
                            <Pencil className="h-3 w-3" /> Modifica
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeCustomer(customer)}
                            aria-label={`Elimina ${customer.name}`}
                            className="rounded-[8px] border p-1.5"
                            style={{ borderColor: "var(--surface-border)", color: "var(--danger)" }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 p-3 md:hidden">
              {filtered.map((customer) => (
                <div key={customer.id} className="ops-card ops-card--flat p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold" style={{ color: "var(--text)" }}>{customer.name}</p>
                      <p className="truncate text-[11px]" style={{ color: "var(--text-label)" }}>
                        {customer.contactName || customer.email || customer.phone || "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => void openEdit(customer)}
                        aria-label={`Modifica ${customer.name}`}
                        className="rounded-[8px] border p-1.5"
                        style={{ borderColor: "var(--surface-border)", color: "var(--text-soft)" }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeCustomer(customer)}
                        aria-label={`Elimina ${customer.name}`}
                        className="rounded-[8px] border p-1.5"
                        style={{ borderColor: "var(--surface-border)", color: "var(--danger)" }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--text-label)" }}>
                    {customer.vat && <span>P.IVA {customer.vat}</span>}
                    {(customer.city || customer.province) && (
                      <span>{[customer.city, customer.province].filter(Boolean).join(" · ")}</span>
                    )}
                    {(customer.addressCount ?? 0) > 0 && <span>{customer.addressCount} sedi</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editing ? "Modifica anagrafica" : "Nuova anagrafica"}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="ops-card my-4 w-full max-w-3xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="ops-label">{editing ? "Scheda anagrafica" : "Nuova anagrafica"}</p>
                <h2 className="ops-title mt-1 text-xl">
                  {editing ? editing.name : form.type === "FORNITORE" ? "Nuovo fornitore" : "Nuovo cliente"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Chiudi"
                className="rounded-[8px] border p-1.5"
                style={{ borderColor: "var(--surface-border)", color: "var(--text-soft)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded-[10px] border p-2.5 text-[12px]" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
                {formError}
              </div>
            )}

            <form onSubmit={saveCustomer} className="mt-4 space-y-4">
              <div className="flex gap-2">
                {(["CLIENTE", "FORNITORE"] as CustomerType[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateField("type", value)}
                    className="ops-btn ops-btn--sm"
                    style={{
                      background: form.type === value ? "var(--brand)" : "transparent",
                      borderColor: "var(--surface-border)",
                      color: form.type === value ? "var(--bg-grad-a)" : "var(--text-soft)",
                    }}
                  >
                    {value === "CLIENTE" ? "Cliente" : "Fornitore"}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Nome / Ragione sociale *">
                  <input
                    required
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    maxLength={160}
                    className="ops-input"
                    placeholder="Trasporti Rossi S.r.l."
                  />
                </Field>
                <Field label="Referente">
                  <input
                    value={form.contactName}
                    onChange={(event) => updateField("contactName", event.target.value)}
                    maxLength={120}
                    className="ops-input"
                    placeholder="Mario Rossi"
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    maxLength={160}
                    className="ops-input"
                    placeholder="amministrazione@azienda.it"
                  />
                </Field>
                <Field label="Telefono">
                  <input
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    maxLength={40}
                    className="ops-input"
                    placeholder="+39 051 123456"
                  />
                </Field>
                <Field label="P.IVA / CF">
                  <input
                    value={form.vat}
                    onChange={(event) => updateField("vat", event.target.value)}
                    maxLength={32}
                    className="ops-input"
                    placeholder="01234567890"
                  />
                </Field>
                <Field label="Condizioni di pagamento">
                  <input
                    value={form.paymentTerms}
                    onChange={(event) => updateField("paymentTerms", event.target.value)}
                    maxLength={120}
                    className="ops-input"
                    placeholder="30 gg d.f."
                  />
                </Field>
                <Field label="Codice SDI">
                  <input
                    value={form.sdi}
                    onChange={(event) => updateField("sdi", event.target.value.toUpperCase())}
                    maxLength={7}
                    className="ops-input font-mono"
                    placeholder="ABC1234"
                  />
                </Field>
                <Field label="PEC">
                  <input
                    type="email"
                    value={form.pec}
                    onChange={(event) => updateField("pec", event.target.value)}
                    maxLength={160}
                    className="ops-input"
                    placeholder="azienda@pec.it"
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
                <Field label="Indirizzo sede">
                  <input
                    value={form.address}
                    onChange={(event) => updateField("address", event.target.value)}
                    maxLength={240}
                    className="ops-input"
                    placeholder="Via Roma 1"
                  />
                </Field>
                <Field label="Città">
                  <input
                    value={form.city}
                    onChange={(event) => updateField("city", event.target.value)}
                    maxLength={120}
                    className="ops-input"
                    placeholder="Bologna"
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Provincia">
                  <input
                    value={form.province}
                    onChange={(event) => updateField("province", event.target.value.toUpperCase())}
                    maxLength={4}
                    className="ops-input "
                    placeholder="BO"
                  />
                </Field>
                <Field label="CAP">
                  <input
                    value={form.postalCode}
                    onChange={(event) => updateField("postalCode", event.target.value)}
                    maxLength={20}
                    className="ops-input"
                    placeholder="40100"
                  />
                </Field>
                <Field label="Stato">
                  <input
                    value={form.country}
                    onChange={(event) => updateField("country", event.target.value.toUpperCase())}
                    maxLength={2}
                    className="ops-input "
                    placeholder="IT"
                  />
                </Field>
              </div>

              <Field label="Note">
                <textarea
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  maxLength={2000}
                  rows={2}
                  className="ops-input"
                  placeholder="Orari di carico, referente magazzino, annotazioni…"
                />
              </Field>

              <div className="flex items-center justify-end gap-2 border-t pt-3" style={{ borderColor: "var(--surface-border)" }}>
                <button type="button" onClick={closeModal} className="ops-btn ops-btn--secondary ops-btn--sm" disabled={saving}>
                  Annulla
                </button>
                <button type="submit" className="ops-btn ops-btn--primary ops-btn--sm" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editing ? "Salva modifiche" : "Crea anagrafica"}
                </button>
              </div>
            </form>

            {editing && (
              <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--surface-border)" }}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="ops-label">Indirizzi secondari</p>
                    <p className="mt-1 text-[12px]" style={{ color: "var(--text-label)" }}>
                      Magazzini, punti di carico o sedi amministrative da riusare nei giri.
                    </p>
                  </div>
                  <span className="chip chip-brand">{addresses.length}</span>
                </div>

                {addressError && (
                  <div className="mt-2 rounded-[10px] border p-2.5 text-[12px]" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
                    {addressError}
                  </div>
                )}

                {addressesLoading ? (
                  <div className="flex items-center gap-2 py-4 text-[12px]" style={{ color: "var(--text-label)" }}>
                    <Loader2 className="h-4 w-4 animate-spin" /> Caricamento indirizzi…
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {addresses.length === 0 ? (
                      <p className="text-[12px]" style={{ color: "var(--text-label)" }}>
                        Nessun indirizzo secondario. La sede principale è quella inserita sopra.
                      </p>
                    ) : (
                      addresses.map((address) => (
                        <div
                          key={address.id}
                          className="flex items-start justify-between gap-3 rounded-[10px] border p-2.5"
                          style={{ borderColor: "var(--surface-border)", background: "var(--surface-soft)" }}
                        >
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>{address.label}</p>
                            <p className="truncate text-[11px]" style={{ color: "var(--text-label)" }}>
                              {address.address}
                              {cityLine(address) ? ` · ${cityLine(address)}` : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void removeAddress(address)}
                            aria-label={`Elimina ${address.label}`}
                            className="rounded-[8px] border p-1.5"
                            style={{ borderColor: "var(--surface-border)", color: "var(--danger)" }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <form onSubmit={addAddress} className="mt-3 grid gap-2 md:grid-cols-[1fr_2fr_1fr_90px]">
                  <input
                    value={addressForm.label}
                    onChange={(event) => setAddressForm((current) => ({ ...current, label: event.target.value }))}
                    maxLength={60}
                    className="ops-input"
                    placeholder="Etichetta"
                    aria-label="Etichetta indirizzo"
                  />
                  <input
                    required
                    value={addressForm.address}
                    onChange={(event) => setAddressForm((current) => ({ ...current, address: event.target.value }))}
                    maxLength={240}
                    className="ops-input"
                    placeholder="Indirizzo *"
                    aria-label="Indirizzo"
                  />
                  <input
                    value={addressForm.city}
                    onChange={(event) => setAddressForm((current) => ({ ...current, city: event.target.value }))}
                    maxLength={120}
                    className="ops-input"
                    placeholder="Città"
                    aria-label="Città"
                  />
                  <input
                    value={addressForm.province}
                    onChange={(event) => setAddressForm((current) => ({ ...current, province: event.target.value.toUpperCase() }))}
                    maxLength={4}
                    className="ops-input "
                    placeholder="Prov."
                    aria-label="Provincia"
                  />
                  <div className="md:col-span-4 flex justify-end">
                    <button type="submit" className="ops-btn ops-btn--secondary ops-btn--sm" disabled={addressSaving}>
                      {addressSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Aggiungi indirizzo
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="ops-card p-4">
      <div className="flex items-center justify-between">
        <p className="ops-label">{label}</p>
        <span
          className="grid h-7 w-7 place-items-center rounded-[8px]"
          style={{ background: `color-mix(in oklab, ${tone} 14%, transparent)`, color: tone }}
        >
          {icon}
        </span>
      </div>
      <p className="font-display mt-2 text-2xl font-semibold" style={{ color: "var(--text)" }}>
        {value.toLocaleString("it-IT")}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="ops-label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

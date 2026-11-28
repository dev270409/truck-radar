"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_GROUPS,
  EXPENSE_CATEGORY_MAP,
  PAYMENT_METHODS,
  expenseCategoryLabel,
  expensePaymentLabel,
} from "@/lib/expense-catalog";

interface Expense {
  id: string;
  date: string;
  category: string;
  supplier: string | null;
  description: string;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  amount: number;
  paymentMethod: string | null;
  receiptUrl: string | null;
  receiptName: string | null;
  notes: string | null;
  createdAt: string;
}

interface ExpenseForm {
  date: string;
  category: string;
  supplier: string;
  description: string;
  amount: string;
  vatRate: string;
  paymentMethod: string;
  receiptUrl: string;
  receiptName: string;
  notes: string;
}

function isoLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function emptyForm(): ExpenseForm {
  const today = new Date();
  const category = EXPENSE_CATEGORIES[0];
  return {
    date: isoLocal(today),
    category: category.code,
    supplier: "",
    description: "",
    amount: "",
    vatRate: String(category.defaultVatRate),
    paymentMethod: "BONIFICO",
    receiptUrl: "",
    receiptName: "",
    notes: "",
  };
}

function calcAmounts(total: number, rate: number) {
  const roundedTotal = Math.round(total * 100) / 100;
  const vatAmount =
    rate > 0 ? Math.round(((roundedTotal * rate) / (100 + rate)) * 100) / 100 : 0;
  const netAmount = Math.round((roundedTotal - vatAmount) * 100) / 100;
  return { netAmount, vatAmount, total: roundedTotal };
}

const eur = (value: number) =>
  `€ ${Number(value).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SpesePage() {
  const now = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(isoLocal(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(isoLocal(now));
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");

  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (category) params.set("category", category);
        if (q.trim()) params.set("q", q.trim());
        const res = await fetch(`/api/expenses?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Errore nel caricamento delle spese.");
        setItems(Array.isArray(data.items) ? data.items : []);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }, q ? 280 : 0);
    return () => clearTimeout(timer);
  }, [from, to, category, q]);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => ({
          total: acc.total + Number(item.amount),
          net: acc.net + Number(item.netAmount),
          vat: acc.vat + Number(item.vatAmount),
        }),
        { total: 0, net: 0, vat: 0 }
      ),
    [items]
  );

  const topCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.category, (map.get(item.category) ?? 0) + Number(item.amount));
    }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    return { code: sorted[0][0], amount: sorted[0][1] };
  }, [items]);

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (category) params.set("category", category);
    if (q.trim()) params.set("q", q.trim());
    return `/api/expenses/export?${params.toString()}`;
  }, [from, to, category, q]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setForm({
      date: isoLocal(new Date(expense.date)),
      category: expense.category,
      supplier: expense.supplier ?? "",
      description: expense.description,
      amount: String(expense.amount),
      vatRate: String(expense.vatRate),
      paymentMethod: expense.paymentMethod ?? "",
      receiptUrl: expense.receiptUrl ?? "",
      receiptName: expense.receiptName ?? "",
      notes: expense.notes ?? "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const updateField = (key: keyof ExpenseForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const changeCategory = (code: string) => {
    const definition = EXPENSE_CATEGORY_MAP[code];
    setForm((current) => ({
      ...current,
      category: code,
      vatRate: editing ? current.vatRate : String(definition?.defaultVatRate ?? 22),
    }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setSuccess("");
    try {
      const res = await fetch(editing ? `/api/expenses/${editing.id}` : "/api/expenses", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          vatRate: Number(form.vatRate),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio.");
      setSuccess(editing ? "Spesa aggiornata." : "Spesa registrata.");
      setModalOpen(false);
      setEditing(null);
      const refresh = await fetch(
        `/api/expenses?${new URLSearchParams({
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...(category ? { category } : {}),
          ...(q.trim() ? { q: q.trim() } : {}),
        }).toString()}`
      );
      const refreshData = await refresh.json();
      if (refresh.ok && Array.isArray(refreshData.items)) setItems(refreshData.items);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (expense: Expense) => {
    if (!window.confirm(`Eliminare la spesa "${expense.description}"?`)) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nell'eliminazione.");
      setItems((current) => current.filter((item) => item.id !== expense.id));
      setSuccess("Spesa eliminata.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const preview = calcAmounts(Number(form.amount) || 0, Number(form.vatRate) || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ops-label">Amministrazione</p>
          <h1 className="ops-title mt-1 flex items-center gap-2 text-2xl">
            <ReceiptText className="h-6 w-6" style={{ color: "var(--brand)" }} /> Spese aziendali
          </h1>
          <p className="ops-subtitle mt-1 text-[13px]">
            Ricevute, imponibile e IVA in un unico registro. Export CSV pronto per il commercialista.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={exportUrl} className="ops-btn ops-btn--secondary ops-btn--sm">
            <Download className="h-4 w-4" /> Esporta CSV
          </a>
          <button type="button" onClick={openCreate} className="ops-btn ops-btn--primary ops-btn--sm">
            <Plus className="h-4 w-4" /> Nuova spesa
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-[12px] border p-3 text-[13px]" style={{ borderColor: "var(--danger)", color: "var(--danger)", background: "var(--surface)" }}>
          <span>{error}</span>
          <button type="button" aria-label="Chiudi" onClick={() => setError("")}><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div className="rounded-[12px] border p-3 text-[13px]" style={{ borderColor: "var(--success)", color: "var(--success)", background: "var(--surface)" }}>
          {success}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Totale periodo" value={eur(totals.total)} tone="var(--brand)" />
        <Metric label="Imponibile" value={eur(totals.net)} tone="var(--info)" />
        <Metric label="IVA" value={eur(totals.vat)} tone="var(--warning)" />
        <Metric
          label={topCategory ? `Top: ${expenseCategoryLabel(topCategory.code)}` : "Spese registrate"}
          value={topCategory ? eur(topCategory.amount) : String(items.length)}
          tone="var(--success)"
        />
      </div>

      <section className="ops-card overflow-hidden">
        <div className="grid gap-3 border-b p-4 md:grid-cols-[130px_130px_1fr_1fr]" style={{ borderColor: "var(--surface-border)" }}>
          <label className="block">
            <span className="ops-label">Dal</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="ops-input mt-1" />
          </label>
          <label className="block">
            <span className="ops-label">Al</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="ops-input mt-1" />
          </label>
          <label className="block">
            <span className="ops-label">Categoria</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="ops-input mt-1">
              <option value="">Tutte le categorie</option>
              {EXPENSE_CATEGORY_GROUPS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.items.map((item) => (
                    <option key={item.code} value={item.code}>{item.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="ops-label">Cerca</span>
            <span className="relative mt-1 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-label-soft)" }} />
              <input
                type="search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Fornitore o descrizione…"
                className="ops-input pl-9"
              />
            </span>
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-[13px]" style={{ color: "var(--text-label)" }}>
            <Loader2 className="h-5 w-5 animate-spin" /> Caricamento spese…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: "var(--surface-soft)", color: "var(--brand)" }}>
              <ReceiptText className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-[15px] font-semibold" style={{ color: "var(--text)" }}>
                Nessuna spesa nel periodo
              </p>
              <p className="mt-1 text-[12px]" style={{ color: "var(--text-label)" }}>
                Registra la prima ricevuta: bastano data, importo e IVA.
              </p>
            </div>
            <button type="button" onClick={openCreate} className="ops-btn ops-btn--primary ops-btn--sm">
              <Plus className="h-4 w-4" /> Registra la prima spesa
            </button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="ops-table w-full text-left">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Categoria</th>
                    <th>Fornitore / descrizione</th>
                    <th className="text-right">Imponibile</th>
                    <th className="text-right">IVA</th>
                    <th className="text-right">Totale</th>
                    <th>Ricevuta</th>
                    <th className="text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap font-mono text-[12px]" style={{ color: "var(--text-soft)" }}>
                        {new Date(item.date).toLocaleDateString("it-IT")}
                      </td>
                      <td>
                        <span className="chip chip-brand" style={{ fontSize: 9 }}>{expenseCategoryLabel(item.category)}</span>
                        {item.paymentMethod ? (
                          <p className="mt-1 text-[11px]" style={{ color: "var(--text-label)" }}>{expensePaymentLabel(item.paymentMethod)}</p>
                        ) : null}
                      </td>
                      <td>
                        <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{item.description}</p>
                        <p className="text-[11px]" style={{ color: "var(--text-label)" }}>{item.supplier || "—"}</p>
                      </td>
                      <td className="text-right font-mono text-[12px]" style={{ color: "var(--text-soft)" }}>{eur(Number(item.netAmount))}</td>
                      <td className="text-right font-mono text-[12px]" style={{ color: "var(--text-label)" }}>
                        {eur(Number(item.vatAmount))}
                        <span className="block text-[11px]">{Number(item.vatRate)}%</span>
                      </td>
                      <td className="text-right font-mono text-[12px] font-semibold" style={{ color: "var(--text)" }}>{eur(Number(item.amount))}</td>
                      <td>
                        {item.receiptUrl ? (
                          <a
                            href={item.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold"
                            style={{ color: "var(--brand)" }}
                          >
                            <Paperclip className="h-3 w-3" /> Apri
                          </a>
                        ) : (
                          <span className="text-[11px]" style={{ color: "var(--text-label-soft)" }}>—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="inline-flex items-center gap-1 rounded-[8px] border px-2 py-1 text-[11px] font-semibold"
                            style={{ borderColor: "var(--surface-border)", color: "var(--text-soft)" }}
                          >
                            <Pencil className="h-3 w-3" /> Modifica
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(item)}
                            aria-label={`Elimina ${item.description}`}
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
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-right text-[11px] font-semibold" style={{ color: "var(--text-label)" }}>Totale periodo</td>
                    <td className="text-right font-mono text-[12px]" style={{ color: "var(--text)" }}>{eur(totals.net)}</td>
                    <td className="text-right font-mono text-[12px]" style={{ color: "var(--text)" }}>{eur(totals.vat)}</td>
                    <td className="text-right font-mono text-[12px] font-semibold" style={{ color: "var(--text)" }}>{eur(totals.total)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="space-y-2 p-3 md:hidden">
              {items.map((item) => (
                <div key={item.id} className="ops-card ops-card--flat p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold" style={{ color: "var(--text)" }}>{item.description}</p>
                      <p className="text-[11px]" style={{ color: "var(--text-label)" }}>
                        {new Date(item.date).toLocaleDateString("it-IT")} · {expenseCategoryLabel(item.category)}
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-[13px] font-semibold" style={{ color: "var(--text)" }}>{eur(Number(item.amount))}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="truncate text-[11px]" style={{ color: "var(--text-label)" }}>
                      {item.supplier || "—"} · IVA {Number(item.vatRate)}%
                    </p>
                    <div className="flex shrink-0 gap-1">
                      {item.receiptUrl && (
                        <a
                          href={item.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-[8px] border p-1.5"
                          style={{ borderColor: "var(--surface-border)", color: "var(--brand)" }}
                          aria-label="Apri ricevuta"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        aria-label={`Modifica ${item.description}`}
                        className="rounded-[8px] border p-1.5"
                        style={{ borderColor: "var(--surface-border)", color: "var(--text-soft)" }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(item)}
                        aria-label={`Elimina ${item.description}`}
                        className="rounded-[8px] border p-1.5"
                        style={{ borderColor: "var(--surface-border)", color: "var(--danger)" }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
          aria-label={editing ? "Modifica spesa" : "Nuova spesa"}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false);
              setEditing(null);
            }
          }}
        >
          <div className="ops-card my-4 w-full max-w-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="ops-label">{editing ? "Modifica spesa" : "Nuova spesa"}</p>
                <h2 className="ops-title mt-1 text-xl">{editing ? editing.description : "Registra una spesa"}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!saving) {
                    setModalOpen(false);
                    setEditing(null);
                  }
                }}
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

            <form onSubmit={save} className="mt-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Data *">
                  <input required type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} className="ops-input" />
                </Field>
                <Field label="Categoria *">
                  <select required value={form.category} onChange={(event) => changeCategory(event.target.value)} className="ops-input">
                    {EXPENSE_CATEGORY_GROUPS.map((group) => (
                      <optgroup key={group.group} label={group.group}>
                        {group.items.map((item) => (
                          <option key={item.code} value={item.code}>{item.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                <Field label="Fornitore">
                  <input value={form.supplier} onChange={(event) => updateField("supplier", event.target.value)} maxLength={160} className="ops-input" placeholder="Q8, Officina Rossi…" />
                </Field>
                <Field label="Metodo di pagamento">
                  <select value={form.paymentMethod} onChange={(event) => updateField("paymentMethod", event.target.value)} className="ops-input">
                    <option value="">Non indicato</option>
                    {PAYMENT_METHODS.map((item) => (
                      <option key={item.code} value={item.code}>{item.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Descrizione *">
                <input required value={form.description} onChange={(event) => updateField("description", event.target.value)} maxLength={240} className="ops-input" placeholder="Gasolio viaggio Bologna–Milano" />
              </Field>

              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Totale documento (€) *">
                  <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(event) => updateField("amount", event.target.value)} className="ops-input" placeholder="122.00" />
                </Field>
                <Field label="IVA %">
                  <select value={form.vatRate} onChange={(event) => updateField("vatRate", event.target.value)} className="ops-input">
                    {[0, 4, 5, 10, 22].map((rate) => (
                      <option key={rate} value={rate}>{rate}%</option>
                    ))}
                  </select>
                </Field>
                <div className="rounded-[10px] border p-2.5 text-[11px]" style={{ borderColor: "var(--surface-border)", background: "var(--surface-soft)" }}>
                  <p style={{ color: "var(--text-label)" }}>Imponibile <b style={{ color: "var(--text)" }}>{eur(preview.netAmount)}</b></p>
                  <p className="mt-0.5" style={{ color: "var(--text-label)" }}>IVA <b style={{ color: "var(--text)" }}>{eur(preview.vatAmount)}</b></p>
                </div>
              </div>

              <Field label="Ricevuta o fattura">
                <div className="flex flex-wrap items-center gap-2">
                  <UploadButton
                    endpoint="expenseReceipt"
                    appearance={{
                      button: "ops-btn ops-btn--secondary ops-btn--sm",
                      allowedContent: "text-[11px]",
                    }}
                    onClientUploadComplete={(res) => {
                      const file = res[0];
                      if (!file) return;
                      setForm((current) => ({
                        ...current,
                        receiptUrl: file.url,
                        receiptName: file.name,
                      }));
                    }}
                    onUploadError={(uploadError) => setFormError(uploadError.message)}
                  />
                  {form.receiptUrl ? (
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--success)" }}>
                      <Paperclip className="h-3 w-3" />
                      {form.receiptName || "Ricevuta allegata"}
                      <button
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, receiptUrl: "", receiptName: "" }))}
                        className="ml-1 underline"
                      >
                        rimuovi
                      </button>
                    </span>
                  ) : (
                    <span className="text-[11px]" style={{ color: "var(--text-label-soft)" }}>PDF o immagine, max 8 MB</span>
                  )}
                </div>
              </Field>

              <Field label="Note">
                <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} maxLength={1000} rows={2} className="ops-input" placeholder="Riferimento viaggio, targa, numero documento…" />
              </Field>

              <div className="flex items-center justify-end gap-2 border-t pt-3" style={{ borderColor: "var(--surface-border)" }}>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditing(null);
                  }}
                  className="ops-btn ops-btn--secondary ops-btn--sm"
                  disabled={saving}
                >
                  Annulla
                </button>
                <button type="submit" className="ops-btn ops-btn--primary ops-btn--sm" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                  {editing ? "Salva modifiche" : "Registra spesa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="ops-card p-4">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: tone }} />
        <p className="ops-label">{label}</p>
      </div>
      <p className="font-display mt-2 text-xl font-semibold" style={{ color: "var(--text)" }}>{value}</p>
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

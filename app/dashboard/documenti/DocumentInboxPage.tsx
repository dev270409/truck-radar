"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  CheckCircle2,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";
import { label } from "@/lib/labels";
import { DOC_INBOX_TYPES } from "@/lib/doc-inbox-shared";
import type { PlanFeatures } from "@/lib/plans";

interface InboxItem {
  id: string;
  source: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  fileSize: number | null;
  status: string;
  docType: string | null;
  docNumber: string | null;
  docDate: string | null;
  amount: number | null;
  customerName: string | null;
  tripId: string | null;
  vehicleId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  tripLabel?: string | null;
  vehicleTarga?: string | null;
}

interface TripOption {
  id: string;
  luogoRitiro: string;
  luogoConsegna: string;
  status: string;
}

interface VehicleOption {
  id: string;
  targa: string;
}

const STATUS_STYLES: Record<string, string> = {
  DA_CLASSIFICARE: "bg-sky-950 text-sky-300 border-sky-800",
  DA_COLLEGARE: "bg-amber-950 text-amber-300 border-amber-800",
  DA_APPROVARE: "bg-violet-950 text-violet-300 border-violet-800",
  ARCHIVIATO: "bg-emerald-950 text-emerald-300 border-emerald-800",
  RIFIUTATO: "bg-red-950 text-red-300 border-red-800",
};

const SOURCE_LABELS: Record<string, string> = {
  UPLOAD: "Caricato",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  API: "API",
};

const FILTERS = [
  { key: "ALL", label: "Tutti" },
  { key: "DA_CLASSIFICARE", label: "Da classificare" },
  { key: "DA_COLLEGARE", label: "Da collegare" },
  { key: "DA_APPROVARE", label: "Da approvare" },
  { key: "ARCHIVIATO", label: "Archiviati" },
];

const fmtDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }) : "senza data";

const fmtAmount = (value: number | null) =>
  value == null
    ? null
    : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

export default function DocumentInboxPage({
  features,
  plan,
}: {
  features: PlanFeatures;
  plan: string;
}) {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [editing, setEditing] = useState<InboxItem | null>(null);

  const [docType, setDocType] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [docDate, setDocDate] = useState("");
  const [amount, setAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [tripId, setTripId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/documents/inbox");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel caricamento");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const [tripsRes, vehiclesRes] = await Promise.all([
        fetch("/api/trips"),
        fetch("/api/vehicles"),
      ]);
      const tripsData = await tripsRes.json();
      const vehiclesData = await vehiclesRes.json();
      if (Array.isArray(tripsData.trips)) setTrips(tripsData.trips);
      if (Array.isArray(vehiclesData.vehicles)) setVehicles(vehiclesData.vehicles);
    } catch {
      setTrips([]);
      setVehicles([]);
    }
  };

  useEffect(() => {
    void (async () => {
      await load();
      await loadOptions();
    })();
  }, []);

  const counts = useMemo(() => {
    const base: Record<string, number> = {
      ALL: items.length,
      DA_CLASSIFICARE: 0,
      DA_COLLEGARE: 0,
      DA_APPROVARE: 0,
      ARCHIVIATO: 0,
    };
    for (const item of items) {
      if (base[item.status] !== undefined) base[item.status] += 1;
    }
    return base;
  }, [items]);

  const filtered = useMemo(
    () => (filter === "ALL" ? items : items.filter((item) => item.status === filter)),
    [items, filter]
  );

  const openEdit = (item: InboxItem) => {
    setEditing(item);
    setDocType(item.docType ?? "");
    setDocNumber(item.docNumber ?? "");
    setDocDate(item.docDate ? item.docDate.slice(0, 10) : "");
    setAmount(item.amount == null ? "" : String(item.amount));
    setCustomerName(item.customerName ?? "");
    setTripId(item.tripId ?? "");
    setVehicleId(item.vehicleId ?? "");
    setNotes(item.notes ?? "");
    setError("");
  };

  const closeEdit = () => {
    if (busy) return;
    setEditing(null);
  };

  const handleUpload = async (file: { name: string; url: string; size: number; type: string }) => {
    setBusy("upload");
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/documents/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileUrl: file.url,
          mimeType: file.type,
          fileSize: file.size,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio del documento");
      setItems((prev) => [data.item, ...prev]);
      setSuccess("Documento caricato. Ora classificalo e collegalo a viaggio o mezzo.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const save = async (status?: string) => {
    if (!editing) return;
    setBusy(editing.id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/documents/inbox/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: docType || null,
          docNumber: docNumber || null,
          docDate: docDate || null,
          amount: amount === "" ? null : Number(amount),
          customerName: customerName || null,
          tripId: tripId || null,
          vehicleId: vehicleId || null,
          notes: notes || null,
          ...(status ? { status } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio");
      setItems((prev) => prev.map((item) => (item.id === data.item.id ? data.item : item)));
      setSuccess(
        status === "ARCHIVIATO"
          ? "Documento archiviato."
          : status === "RIFIUTATO"
            ? "Documento rifiutato."
            : "Documento aggiornato."
      );
      if (status === "ARCHIVIATO" || status === "RIFIUTATO") setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const quickStatus = async (item: InboxItem, status: string) => {
    setBusy(item.id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/documents/inbox/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nell'aggiornamento");
      setItems((prev) => prev.map((row) => (row.id === data.item.id ? data.item : row)));
      setSuccess(status === "ARCHIVIATO" ? "Documento archiviato." : "Documento aggiornato.");
      if (editing?.id === item.id) setEditing(data.item);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (item: InboxItem) => {
    if (!window.confirm(`Eliminare ${item.fileName}? Il file resterà nello storage.`)) return;
    setBusy(item.id);
    setError("");
    try {
      const res = await fetch(`/api/documents/inbox/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nell'eliminazione");
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      if (editing?.id === item.id) setEditing(null);
      setSuccess("Documento rimosso dalla coda.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center text-2xl font-semibold text-[var(--text)]">
            <Inbox className="mr-2.5 h-6 w-6 text-sky-400" /> Documenti in arrivo
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-label)]">
            Una coda unica per DDT, fatture, ordini di ritiro, POD e scadenze. Carica il file, assegna il tipo e collegalo a viaggio o mezzo.
          </p>
        </div>
        <span className="chip chip-brand">Piano {plan}</span>
      </div>

      {error && <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-200">{success}</div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { key: "DA_CLASSIFICARE", label: "Da classificare", tone: "text-sky-300" },
          { key: "DA_COLLEGARE", label: "Da collegare", tone: "text-amber-300" },
          { key: "DA_APPROVARE", label: "Da approvare", tone: "text-violet-300" },
          { key: "ARCHIVIATO", label: "Archiviati", tone: "text-emerald-300" },
        ].map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setFilter(card.key)}
            className={`ops-card p-4 text-left transition ${filter === card.key ? "ring-1 ring-sky-500/60" : ""}`}
          >
            <p className={`text-[11px] font-semibold   ${card.tone}`}>{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--text)]">{counts[card.key] ?? 0}</p>
          </button>
        ))}
      </div>

      <section className="ops-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="flex items-center text-sm font-semibold text-[var(--text)]">
              <Upload className="mr-2 h-4 w-4 text-sky-400" /> Carica un documento
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--text-label)]">
              PDF o foto fino a 8 MB. Il file entra in <strong className="text-[var(--text)]">Da classificare</strong>; non viene inviato a nessun provider AI finché non attivi l&apos;automazione Pro.
            </p>
          </div>
          <UploadButton
            endpoint="inboundDocument"
            content={{
              button: "Carica PDF o foto",
              allowedContent: "PDF o immagini fino a 8 MB",
            }}
            appearance={{
              button:
                "bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-xl px-4 py-2.5",
              allowedContent: "text-[11px] text-[var(--text-label-soft)]",
            }}
            onClientUploadComplete={(res) => {
              const file = res[0];
              if (file) handleUpload({ name: file.name, url: file.url, size: file.size, type: file.type });
            }}
            onUploadError={(e) => setError(e.message)}
          />
        </div>
        {busy === "upload" && (
          <p className="mt-3 flex items-center text-xs text-sky-300">
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Salvataggio in coda...
          </p>
        )}
      </section>

      {!features.aiDocumentIntake && (
        <section className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-950/60 text-amber-300">
              <Lock className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-amber-100">L&apos;automazione completa è nel piano Pro</h2>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-amber-100/80">
                In Pro la casella email e il numero aziendale alimentano questa coda: classificazione AI, estrazione dei campi e collegamento automatico. In Base puoi comunque caricare e archiviare i documenti manualmente.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-800/60 px-2.5 py-1 text-amber-200">
                  <Sparkles className="h-3 w-3" /> Classificazione AI
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-800/60 px-2.5 py-1 text-amber-200">
                  <Mail className="h-3 w-3" /> Email dedicata
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-800/60 px-2.5 py-1 text-amber-200">
                  <Phone className="h-3 w-3" /> Numero aziendale
                </span>
              </div>
              <Link
                href="/dashboard/abbonamenti"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-200 hover:text-amber-100"
              >
                Scopri il piano Pro <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === f.key
                ? "bg-sky-600 text-white"
                : "border border-[var(--surface-border)] text-[var(--text-soft)] hover:border-[var(--text-label)]"
            }`}
          >
            {f.label}
            <span className="ml-1.5 opacity-70">{counts[f.key] ?? 0}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setFilter("ALL"); load(); }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--surface-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] hover:border-[var(--text-label)]"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Aggiorna
        </button>
      </div>

      {loading ? (
        <div className="ops-card flex items-center justify-center gap-2 p-12 text-[var(--text-label)]">
          <Loader2 className="h-5 w-5 animate-spin" /> Caricamento documenti...
        </div>
      ) : filtered.length === 0 ? (
        <div className="ops-card p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-[var(--text-label-soft)]" />
          <p className="mt-3 text-sm font-semibold text-[var(--text)]">
            {items.length === 0 ? "Nessun documento in arrivo." : "Nessun documento in questo stato."}
          </p>
          <p className="mt-1 text-xs text-[var(--text-label-soft)]">
            {items.length === 0
              ? "Carica il primo PDF o la prima foto per iniziare."
              : "Cambia filtro o aggiorna la coda."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const linked = item.tripLabel || item.vehicleTarga || item.customerName;
            return (
              <article key={item.id} className="ops-card p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-soft)] text-sky-300">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 truncate text-sm font-semibold text-[var(--text)]">{item.fileName}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold  ${STATUS_STYLES[item.status] ?? "border-[var(--surface-border)] bg-[var(--surface-strong)] text-[var(--text-soft)]"}`}>
                        {label(item.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--text-label)]">
                      {item.docType ? label(item.docType) : "Tipo da assegnare"} · {SOURCE_LABELS[item.source] ?? item.source} · {fmtDate(item.createdAt)}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-[var(--text-label-soft)]">
                      {linked || "Nessun collegamento"}
                      {item.docNumber ? ` · ${item.docNumber}` : ""}
                      {item.amount != null ? ` · ${fmtAmount(item.amount)}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="shrink-0 rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:border-sky-500"
                  >
                    Gestisci
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--surface-border)] pt-3">
                  <a
                    href={item.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:border-sky-500"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Apri file
                  </a>
                  {item.status !== "ARCHIVIATO" && item.status !== "RIFIUTATO" && (
                    <button
                      type="button"
                      onClick={() => quickStatus(item, "ARCHIVIATO")}
                      disabled={busy === item.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/60 disabled:opacity-50"
                    >
                      {busy === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                      Archivia
                    </button>
                  )}
                  {(item.status === "ARCHIVIATO" || item.status === "RIFIUTATO") && (
                    <button
                      type="button"
                      onClick={() => quickStatus(item, "DA_CLASSIFICARE")}
                      disabled={busy === item.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--surface-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] hover:border-sky-500 disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Riapri
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    disabled={busy === item.id}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-900/60 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-950/40 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Elimina
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 md:items-center md:p-6"
          onClick={closeEdit}
        >
          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 "
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-[var(--text)]">{editing.fileName}</h2>
                <p className="mt-1 text-xs text-[var(--text-label)]">
                  Classifica il documento e collegalo a un viaggio o a un mezzo.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--surface-border)] text-[var(--text-soft)] hover:border-[var(--text-label)]"
                aria-label="Chiudi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold   text-[var(--text-label)]">Tipo documento</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]"
                >
                  <option value="">Da classificare</option>
                  {DOC_INBOX_TYPES.map((type) => (
                    <option key={type} value={type}>{label(type)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold   text-[var(--text-label)]">Numero documento</label>
                <input
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="Es. 2026/184"
                  className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold   text-[var(--text-label)]">Data documento</label>
                <input
                  type="date"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold   text-[var(--text-label)]">Importo</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold   text-[var(--text-label)]">Cliente / fornitore</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ragione sociale"
                  className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold   text-[var(--text-label)]">Viaggio</label>
                <select
                  value={tripId}
                  onChange={(e) => setTripId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]"
                >
                  <option value="">Nessun viaggio</option>
                  {trips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.luogoRitiro} {"->"} {trip.luogoConsegna}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold   text-[var(--text-label)]">Mezzo</label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]"
                >
                  <option value="">Nessun mezzo</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>{vehicle.targa}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold   text-[var(--text-label)]">Note</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Annotazioni per la revisione"
                  className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--surface-border)] pt-4">
              <button
                type="button"
                onClick={() => save()}
                disabled={busy === editing.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {busy === editing.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Salva
              </button>
              <button
                type="button"
                onClick={() => save("ARCHIVIATO")}
                disabled={busy === editing.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-950/60 disabled:opacity-50"
              >
                <Archive className="h-4 w-4" /> Archivia
              </button>
              <button
                type="button"
                onClick={() => save("RIFIUTATO")}
                disabled={busy === editing.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-900/60 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-950/40 disabled:opacity-50"
              >
                Rifiuta
              </button>
              <button
                type="button"
                onClick={() => remove(editing)}
                disabled={busy === editing.id}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm font-semibold text-[var(--text-soft)] hover:border-red-800 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

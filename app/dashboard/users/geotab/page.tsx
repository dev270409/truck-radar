"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Mail,
  Truck,
  UserPlus,
  Users,
} from "lucide-react";

interface DriverItem {
  geotabDriverId: string;
  driverName: string;
  trips: number;
  lastTrip: string | null;
  status: "COLLEGATO" | "ACCOUNT_ESISTENTE" | "DA_CREARE";
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  suggestedEmail: string;
}

interface Credential {
  geotabDriverId: string;
  driverName: string;
  userId: string;
  email: string;
  role: string;
  password: string | null;
  created: boolean;
}

interface ConfirmResult {
  created: Credential[];
  linked: Credential[];
  errors: string[];
  driversAssigned: number;
}

const STATUS_META: Record<
  DriverItem["status"],
  { label: string; className: string }
> = {
  DA_CREARE: { label: "Da creare", className: "chip chip-warning" },
  ACCOUNT_ESISTENTE: { label: "Account esistente", className: "chip chip-info" },
  COLLEGATO: { label: "Collegato", className: "chip chip-success" },
};

function credentialText(credential: Credential) {
  return [
    `Ciao ${credential.driverName},`,
    "",
    "il tuo accesso a Truck Radar:",
    `Email: ${credential.email}`,
    credential.password ? `Password: ${credential.password}` : null,
    "Link: https://www.truck-radar.it/login",
    "",
    "Nota: l'email serve solo per accedere, non è una casella di posta.",
    "Al primo accesso cambia la password dalla sezione Account.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export default function GeotabDriversPage() {
  const [items, setItems] = useState<DriverItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [copied, setCopied] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/drivers/geotab");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel caricamento dei driver Geotab.");
      const list: DriverItem[] = Array.isArray(data.items) ? data.items : [];
      setItems(list);
      setSelected(
        new Set(
          list
            .filter((item) => item.status !== "COLLEGATO")
            .map((item) => item.geotabDriverId)
        )
      );
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

  const selectable = useMemo(
    () => items.filter((item) => item.status !== "COLLEGATO"),
    [items]
  );
  const toCreate = items.filter((item) => item.status === "DA_CREARE").length;

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((current) =>
      current.size === selectable.length
        ? new Set()
        : new Set(selectable.map((item) => item.geotabDriverId))
    );
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(""), 2500);
    } catch {
      setError("Copia non riuscita: seleziona il testo e copialo manualmente.");
    }
  };

  const confirm = async () => {
    if (selected.size === 0) return;
    setConfirming(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/drivers/geotab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverIds: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nella creazione degli account.");
      setResult(data);
      setSelected(new Set());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConfirming(false);
    }
  };

  const allCreatedText = result
    ? result.created.map(credentialText).join("\n\n---\n\n")
    : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/dashboard/users"
            className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: "var(--text-label)" }}
          >
            <ArrowLeft className="h-3 w-3" /> Torna a Autisti e team
          </Link>
          <p className="ops-label">Autisti</p>
          <h1 className="ops-title mt-1 flex items-center gap-2 text-2xl">
            <Truck className="h-6 w-6" style={{ color: "var(--brand)" }} /> Autisti da Geotab
          </h1>
          <p className="ops-subtitle mt-1 max-w-3xl text-[13px]">
            Truck Radar legge i conducenti dai tracciati Geotab. Conferma i nominativi: per i nuovi
            crea un account con credenziali pronte da copiare e inviare, per quelli già presenti
            collega solo l&apos;account.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleAll}
            disabled={selectable.length === 0}
            className="ops-btn ops-btn--secondary ops-btn--sm"
          >
            {selected.size === selectable.length ? "Deseleziona" : "Seleziona tutti"}
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={confirming || selected.size === 0}
            className="ops-btn ops-btn--primary ops-btn--sm"
          >
            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Conferma {selected.size > 0 ? selected.size : ""} autisti
          </button>
        </div>
      </div>

      {error && (
        <div
          className="rounded-[12px] border p-3 text-[13px]"
          style={{ borderColor: "var(--danger)", color: "var(--danger)", background: "var(--surface)" }}
        >
          {error}
        </div>
      )}

      <div
        className="rounded-[12px] border p-3 text-[12px]"
        style={{ borderColor: "var(--surface-border)", color: "var(--text-label)", background: "var(--surface)" }}
      >
        L&apos;email generata è un <b>identificativo di accesso</b>, non una casella di posta. La password
        viene mostrata una sola volta: copiala e inviala all&apos;autista. Al primo accesso può cambiarla
        da Account.
      </div>

      <section className="ops-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4" style={{ borderColor: "var(--surface-border)" }}>
          <div>
            <p className="font-display text-[14px] font-semibold" style={{ color: "var(--text)" }}>
              Conducenti rilevati
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-label)" }}>
              {items.length} nominativi · {toCreate} senza account
            </p>
          </div>
          <span className="chip chip-brand">{selected.size} selezionati</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-[13px]" style={{ color: "var(--text-label)" }}>
            <Loader2 className="h-4 w-4 animate-spin" /> Lettura conducenti Geotab…
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-[13px]" style={{ color: "var(--text-label)" }}>
            Nessun conducente nei tracciati Geotab. Sincronizza Geotab da Integrazioni.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="ops-table w-full text-left">
                <thead>
                  <tr>
                    <th className="w-10">
                      <input
                        type="checkbox"
                        checked={selectable.length > 0 && selected.size === selectable.length}
                        onChange={toggleAll}
                        aria-label="Seleziona tutti i conducenti"
                      />
                    </th>
                    <th>Conducente</th>
                    <th>Tracciati</th>
                    <th>Ultimo viaggio</th>
                    <th>Account Truck Radar</th>
                    <th>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.geotabDriverId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(item.geotabDriverId)}
                          disabled={item.status === "COLLEGATO"}
                          onChange={() => toggle(item.geotabDriverId)}
                          aria-label={`Seleziona ${item.driverName}`}
                        />
                      </td>
                      <td>
                        <p className="font-semibold" style={{ color: "var(--text)" }}>{item.driverName}</p>
                        <p className="font-mono text-[11px]" style={{ color: "var(--text-label-soft)" }}>
                          Geotab ID {item.geotabDriverId}
                        </p>
                      </td>
                      <td className="text-[12px]" style={{ color: "var(--text-soft)" }}>
                        {item.trips.toLocaleString("it-IT")}
                      </td>
                      <td className="text-[12px]" style={{ color: "var(--text-soft)" }}>
                        {item.lastTrip ? new Date(item.lastTrip).toLocaleDateString("it-IT") : "—"}
                      </td>
                      <td className="text-[12px]" style={{ color: "var(--text-soft)" }}>
                        {item.userEmail ? (
                          <>
                            <p>{item.userEmail}</p>
                            <p style={{ color: "var(--text-label)" }}>{item.userRole}</p>
                          </>
                        ) : (
                          <span style={{ color: "var(--text-label-soft)" }}>{item.suggestedEmail}</span>
                        )}
                      </td>
                      <td>
                        <span className={STATUS_META[item.status].className} style={{ fontSize: 9 }}>
                          {STATUS_META[item.status].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 p-3 md:hidden">
              {items.map((item) => (
                <label
                  key={item.geotabDriverId}
                  className="flex items-start gap-2 rounded-[10px] border p-3"
                  style={{ borderColor: "var(--surface-border)" }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(item.geotabDriverId)}
                    disabled={item.status === "COLLEGATO"}
                    onChange={() => toggle(item.geotabDriverId)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                        {item.driverName}
                      </span>
                      <span className={STATUS_META[item.status].className} style={{ fontSize: 8 }}>
                        {STATUS_META[item.status].label}
                      </span>
                    </span>
                    <span className="mt-1 block text-[11px]" style={{ color: "var(--text-label)" }}>
                      {item.trips} tracciati · {item.userEmail ?? item.suggestedEmail}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </section>

      {result && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="ops-label">Esito</p>
              <h2 className="font-display text-[16px] font-semibold" style={{ color: "var(--text)" }}>
                {result.created.length} account creati · {result.linked.length} collegati
              </h2>
              <p className="text-[11px]" style={{ color: "var(--text-label)" }}>
                {result.driversAssigned} viaggi già importati sono stati assegnati ai nuovi autisti.
              </p>
            </div>
            {result.created.length > 1 && (
              <button
                type="button"
                onClick={() => void copy(allCreatedText, "all")}
                className="ops-btn ops-btn--secondary ops-btn--sm"
              >
                <Copy className="h-4 w-4" /> {copied === "all" ? "Copiato" : "Copia tutte le credenziali"}
              </button>
            )}
          </div>

          {result.created.map((credential) => (
            <div key={credential.geotabDriverId} className="ops-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display text-[15px] font-semibold" style={{ color: "var(--text)" }}>
                    {credential.driverName}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-label)" }}>
                    Nuovo account autista
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void copy(credentialText(credential), credential.geotabDriverId)}
                  className="ops-btn ops-btn--secondary ops-btn--sm"
                >
                  <Copy className="h-4 w-4" />
                  {copied === credential.geotabDriverId ? "Copiato" : "Copia messaggio"}
                </button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-[10px] border p-2.5" style={{ borderColor: "var(--surface-border)", background: "var(--surface-soft)" }}>
                  <p className="ops-label flex items-center gap-1"><Mail className="h-3 w-3" /> Email di accesso</p>
                  <p className="mt-1 break-all font-mono text-[12px]" style={{ color: "var(--text)" }}>
                    {credential.email}
                  </p>
                </div>
                <div className="rounded-[10px] border p-2.5" style={{ borderColor: "var(--surface-border)", background: "var(--surface-soft)" }}>
                  <p className="ops-label flex items-center gap-1"><KeyRound className="h-3 w-3" /> Password temporanea</p>
                  <p className="mt-1 break-all font-mono text-[12px] font-semibold" style={{ color: "var(--text)" }}>
                    {credential.password}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {result.linked.length > 0 && (
            <div className="ops-card p-4">
              <p className="ops-label flex items-center gap-1"><Users className="h-3 w-3" /> Account esistenti collegati</p>
              <div className="mt-2 space-y-1">
                {result.linked.map((item) => (
                  <p key={item.geotabDriverId} className="text-[12px]" style={{ color: "var(--text-soft)" }}>
                    {item.driverName} · {item.email} · {item.role}
                  </p>
                ))}
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div
              className="rounded-[12px] border p-3 text-[12px]"
              style={{ borderColor: "var(--warning)", color: "var(--warning)", background: "var(--surface)" }}
            >
              {result.errors.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          )}

          {result.created.length > 0 && (
            <p className="flex items-center gap-1 text-[11px]" style={{ color: "var(--success)" }}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Credenziali pronte: copia il messaggio e invialo
              all&apos;autista. La password non sarà più visibile dopo aver lasciato questa pagina.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

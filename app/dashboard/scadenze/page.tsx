"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Download,
  Loader2,
  Mail,
  Plus,
  Settings2,
  ShieldAlert,
  Trash2,
  Truck,
  User,
} from "lucide-react";
import { DEADLINE_TYPES, deadlineAppliesToVehicle, deadlineType } from "@/lib/deadline-catalog";

interface DriverDoc {
  id: string;
  userId: string;
  tipo: string;
  dataScadenza: string;
  note: string | null;
  nome?: string;
  cognome?: string;
}

interface CompanyDeadline {
  id: string;
  tipo: string;
  dataScadenza: string;
  note: string | null;
}

interface VehicleDeadline {
  id: string;
  scope: string;
  subjectId: string;
  subjectName: string;
  tipo: string;
  tipoLabel: string;
  dataScadenza: string;
  note: string | null;
  sourceTable: string;
}

interface Ban {
  id: string;
  data: string;
  regione: string | null;
  descrizione: string | null;
}

interface Person {
  id: string;
  nome: string;
  cognome: string;
  role: string;
}

interface Vehicle {
  id: string;
  targa: string;
  categoria: string;
}

interface DeadlineAlertStatus {
  settings?: {
    active?: Record<string, boolean>;
    alertEmails?: string[];
    alertsEnabled?: boolean;
    alertDays?: number[];
  };
  pending?: number;
  sent?: number;
  failed?: number;
  notConfigured?: number;
  senzaDestinatari?: boolean;
  providerConfigured?: boolean;
  canEdit?: boolean;
  lastErrors?: Array<{ tipo: string; lastError: string | null; createdAt: string }>;
}

const DRIVER_TYPES = DEADLINE_TYPES.filter((type) => type.subject === "AUTISTA");
const COMPANY_TYPES = DEADLINE_TYPES.filter((type) => type.subject === "AZIENDA");
const VEHICLE_TYPES = DEADLINE_TYPES.filter((type) => type.subject === "VEICOLO");

function daysLeft(value: string) {
  const d = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

function urgencyClass(days: number) {
  if (days < 0) return "border-red-800 bg-red-950/60 text-red-200";
  if (days <= 30) return "border-amber-800 bg-amber-950/50 text-amber-200";
  return "border-[var(--surface-border)] bg-[var(--surface-soft)] text-[var(--text)]";
}

function deadlineLabel(tipo: string) {
  return deadlineType(tipo.toLowerCase())?.label ?? tipo;
}

function fmtDate(value: string) {
  return new Date(value).toLocaleDateString("it-IT");
}

export default function ScadenzePage() {
  const [tab, setTab] = useState<"driver" | "vehicle" | "company" | "bans">("driver");
  const [drivers, setDrivers] = useState<DriverDoc[]>([]);
  const [company, setCompany] = useState<CompanyDeadline[]>([]);
  const [vehicleItems, setVehicleItems] = useState<VehicleDeadline[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [users, setUsers] = useState<Person[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [alertStatus, setAlertStatus] = useState<DeadlineAlertStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [userId, setUserId] = useState("");
  const [tipo, setTipo] = useState("patente");
  const [dataScadenza, setDataScadenza] = useState("");
  const [note, setNote] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [vehicleTipo, setVehicleTipo] = useState("assicurazione");
  const [companyTipo, setCompanyTipo] = useState("durc");
  const [banData, setBanData] = useState("");
  const [banRegione, setBanRegione] = useState("Emilia-Romagna");
  const [banDescrizione, setBanDescrizione] = useState("");

  const [alertEmails, setAlertEmails] = useState("");
  const [alertDays, setAlertDays] = useState("30, 7, 1");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [activeTypes, setActiveTypes] = useState<Record<string, boolean>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
  const visibleVehicleTypes = VEHICLE_TYPES.filter((type) =>
    deadlineAppliesToVehicle(type, selectedVehicle?.categoria)
  );
  const effectiveVehicleTipo = visibleVehicleTypes.some((type) => type.id === vehicleTipo)
    ? vehicleTipo
    : visibleVehicleTypes[0]?.id ?? vehicleTipo;

  const load = async () => {
    try {
      setLoading(true);
      const [dRes, cRes, vRes, bRes, uRes, vhRes, sRes] = await Promise.all([
        fetch("/api/deadlines?scope=driver"),
        fetch("/api/deadlines?scope=company"),
        fetch("/api/deadlines?scope=vehicle"),
        fetch("/api/deadlines/bans"),
        fetch("/api/users"),
        fetch("/api/vehicles"),
        fetch("/api/deadlines/status"),
      ]);
      const [dData, cData, vData, bData, uData, vhData, sData] = await Promise.all([
        dRes.json(),
        cRes.json(),
        vRes.json(),
        bRes.json(),
        uRes.json(),
        vhRes.json(),
        sRes.json(),
      ]);
      if (dData.items) setDrivers(dData.items);
      if (cData.items) setCompany(cData.items);
      if (vData.items) setVehicleItems(vData.items);
      if (bData.items) setBans(bData.items);
      if (uData.users) setUsers(uData.users.filter((user: Person) => user.role === "AUTISTA"));
      if (vhData.vehicles) setVehicles(vhData.vehicles);
      if (sData.settings) {
        setAlertStatus(sData);
        setAlertEmails((sData.settings.alertEmails ?? []).join(", "));
        setAlertDays((sData.settings.alertDays ?? [30, 7, 1]).join(", "));
        setAlertsEnabled(sData.settings.alertsEnabled !== false);
        setActiveTypes(sData.settings.active ?? {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  const postDeadline = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/deadlines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore salvataggio");
  };

  const addDriverDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await postDeadline({ scope: "driver", userId, tipo, dataScadenza, note });
      setSuccess("Scadenza autista salvata.");
      setDataScadenza("");
      setNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const addVehicleDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await postDeadline({ scope: "vehicle", vehicleId, tipo: effectiveVehicleTipo, dataScadenza, note });
      setSuccess("Scadenza mezzo salvata.");
      setDataScadenza("");
      setNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const addCompanyDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await postDeadline({ scope: "company", tipo: companyTipo, dataScadenza, note });
      setSuccess("Scadenza aziendale salvata.");
      setDataScadenza("");
      setNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const addBan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/deadlines/bans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: banData, regione: banRegione, descrizione: banDescrizione }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore salvataggio");
      setSuccess("Divieto salvato.");
      setBanData("");
      setBanDescrizione("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (scope: "driver" | "company" | "vehicle", id: string) => {
    if (!window.confirm("Eliminare la scadenza?")) return;
    await fetch(`/api/deadlines?id=${id}&scope=${scope}`, { method: "DELETE" });
    await load();
  };

  const removeBan = async (id: string) => {
    if (!window.confirm("Eliminare il divieto?")) return;
    await fetch(`/api/deadlines/bans?id=${id}`, { method: "DELETE" });
    await load();
  };

  const saveSettings = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/deadlines/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            alertsEnabled,
            alertEmails: alertEmails.split(",").map((value) => value.trim()).filter(Boolean),
            alertDays: alertDays.split(",").map((value) => Number(value.trim())).filter((value) => Number.isFinite(value)),
            active: activeTypes,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore salvataggio impostazioni");
      setSuccess("Impostazioni avvisi salvate.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const checkAlerts = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/deadlines/check", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore controllo avvisi");
      setSuccess(`Controllo completato: ${data.result?.queued ?? 0} in coda, ${data.result?.sent ?? 0} inviate.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const generateSundays = async () => {
    setSaving(true);
    setError("");
    try {
      const today = new Date();
      const nextSunday = new Date(today);
      nextSunday.setDate(today.getDate() + ((7 - today.getDay()) % 7 || 7));
      for (let i = 0; i < 12; i++) {
        const d = new Date(nextSunday);
        d.setDate(nextSunday.getDate() + i * 7);
        await fetch("/api/deadlines/bans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: d.toISOString().slice(0, 10),
            regione: banRegione,
            descrizione: "Divieto domenicale mezzi pesanti (verificare ordinanza locale)",
          }),
        });
      }
      setSuccess("Generate 12 domeniche. Verifica sempre le ordinanze locali.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    const all = [
      ...drivers.map((item) => daysLeft(item.dataScadenza)),
      ...company.map((item) => daysLeft(item.dataScadenza)),
      ...vehicleItems.map((item) => daysLeft(item.dataScadenza)),
    ];
    return {
      expired: all.filter((days) => days < 0).length,
      soon: all.filter((days) => days >= 0 && days <= 30).length,
      bans: bans.filter((ban) => daysLeft(ban.data) >= 0).length,
    };
  }, [drivers, company, vehicleItems, bans]);

  const alertTone =
    alertStatus?.senzaDestinatari
      ? "border-amber-800 bg-amber-950/40 text-amber-100"
      : alertStatus?.failed
        ? "border-red-800 bg-red-950/40 text-red-100"
        : "border-emerald-800 bg-emerald-950/40 text-emerald-100";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center text-2xl font-semibold text-[var(--text)]">
            <CalendarDays className="mr-2.5 h-6 w-6 text-amber-400" /> Scadenze e divieti
          </h1>
          <p className="mt-1 text-sm text-[var(--text-label)]">
            Mezzi, autisti, azienda e calendario divieti con catalogo, rinnovi e stato degli avvisi.
          </p>
        </div>
        <a href="/api/export?type=vehicles" className="inline-flex items-center gap-2 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:border-indigo-500">
          <Download className="h-4 w-4" /> Esporta mezzi
        </a>
      </div>

      {error && <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-200">{success}</div>}

      {alertStatus && (
        <div className={`rounded-xl border p-3 text-sm ${alertTone}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>
                Avvisi: {alertStatus.senzaDestinatari ? "nessun destinatario configurato" : `${alertStatus.pending ?? 0} in coda, ${alertStatus.sent ?? 0} inviati`}
                {alertStatus.providerConfigured ? "" : " · provider email non configurato"}
              </span>
            </div>
            {alertStatus.canEdit && (
              <button type="button" onClick={checkAlerts} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-current/30 px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50">
                <CheckCircle2 className="h-3.5 w-3.5" /> Controlla ora
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3">
          <p className="text-[11px] font-semibold   text-red-300">Scadute</p>
          <p className="mt-1 text-xl font-semibold text-red-200">{summary.expired}</p>
        </div>
        <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-3">
          <p className="text-[11px] font-semibold   text-amber-300">Entro 30 giorni</p>
          <p className="mt-1 text-xl font-semibold text-amber-200">{summary.soon}</p>
        </div>
        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-soft)] p-3">
          <p className="text-[11px] font-semibold   text-[var(--text-label-soft)]">Divieti futuri</p>
          <p className="mt-1 text-xl font-semibold text-[var(--text)]">{summary.bans}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "driver", label: "Autisti", icon: User },
          { id: "vehicle", label: "Mezzi", icon: Truck },
          { id: "company", label: "Azienda", icon: ShieldAlert },
          { id: "bans", label: "Divieti mezzi pesanti", icon: CalendarDays },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as typeof tab)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${tab === item.id ? "border-indigo-500 bg-indigo-950/50 text-indigo-200" : "border-[var(--surface-border)] text-[var(--text-soft)] hover:border-[var(--text-label)]"}`}
            >
              <Icon className="h-4 w-4" /> {item.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setSettingsOpen((value) => !value)}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm font-semibold text-[var(--text-soft)] hover:border-[var(--text-label)]"
        >
          <Settings2 className="h-4 w-4" /> Configurazione avvisi
        </button>
      </div>

      {settingsOpen && (
        <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center font-semibold text-[var(--text)]"><Settings2 className="mr-2 h-4 w-4 text-indigo-300" /> Catalogo e avvisi email</h2>
              <p className="mt-1 text-xs text-[var(--text-label)]">Le voci spuntate compaiono nelle scadenze. Gli avvisi partono solo con destinatari e provider configurati.</p>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold  ${alertStatus?.senzaDestinatari ? "border-amber-700 text-amber-200" : "border-emerald-700 text-emerald-200"}`}>
              {alertStatus?.senzaDestinatari ? "Da configurare" : "Attivo"}
            </span>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-semibold  text-[var(--text-label)]">Email destinatari</label>
              <input value={alertEmails} onChange={(e) => setAlertEmails(e.target.value)} placeholder="ufficio@azienda.it, titolare@azienda.it" className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold  text-[var(--text-label)]">Giorni preavviso</label>
                  <input value={alertDays} onChange={(e) => setAlertDays(e.target.value)} placeholder="30, 7, 1" className="mt-1 w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
                </div>
                <label className="mt-5 flex items-center gap-2 text-sm text-[var(--text)]">
                  <input type="checkbox" checked={alertsEnabled} onChange={(e) => setAlertsEnabled(e.target.checked)} />
                  Avvisi attivi
                </label>
              </div>
              <button type="button" onClick={saveSettings} disabled={saving || !alertStatus?.canEdit} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Salva configurazione
              </button>
              {!alertStatus?.canEdit && <p className="text-[11px] text-[var(--text-label-soft)]">Solo l&apos;amministratore può modificare la configurazione.</p>}
            </div>
            <div>
              <p className="text-xs font-semibold  text-[var(--text-label)]">Voci attive</p>
              <div className="mt-2 grid max-h-[260px] gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
                {DEADLINE_TYPES.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-2 py-1.5 text-[11px] text-[var(--text)]">
                    <input type="checkbox" checked={activeTypes[item.id] !== false} onChange={(e) => setActiveTypes((current) => ({ ...current, [item.id]: e.target.checked }))} />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-10 text-[var(--text-label)]"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Caricamento...</div>
      ) : tab === "driver" ? (
        <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <form onSubmit={addDriverDoc} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
            <h2 className="mb-3 flex items-center font-semibold text-[var(--text)]"><Plus className="mr-2 h-4 w-4 text-amber-400" /> Scadenza autista</h2>
            <div className="space-y-2">
              <select required value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]">
                <option value="">Autista *</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]">
                  {DRIVER_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
                <input required type="date" value={dataScadenza} onChange={(e) => setDataScadenza(e.target.value)} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
              </div>
              <input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
              <button type="submit" disabled={saving || !userId} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Salva
              </button>
            </div>
          </form>
          <div className="space-y-2">
            {drivers.length === 0 ? <p className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 text-sm text-[var(--text-label-soft)]">Nessuna scadenza autista.</p> : drivers.map((item) => {
              const days = daysLeft(item.dataScadenza);
              return (
                <div key={item.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${urgencyClass(days)}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{item.nome || "Autista"} {item.cognome || ""} · {deadlineLabel(item.tipo)}</p>
                    <p className="text-xs opacity-80">{fmtDate(item.dataScadenza)} · {days < 0 ? `scaduta da ${Math.abs(days)} gg` : `tra ${days} gg`}{item.note ? ` · ${item.note}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`https://wa.me/?text=${encodeURIComponent(`Scadenza ${deadlineLabel(item.tipo)} di ${item.nome ?? ""} ${item.cognome ?? ""}: ${fmtDate(item.dataScadenza)}`)}`} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--surface-border)] px-2 py-1 text-xs font-semibold text-[var(--text)] hover:border-emerald-500">WhatsApp</a>
                    <button type="button" onClick={() => remove("driver", item.id)} className="text-[var(--text-label)] hover:text-red-300" aria-label="Elimina"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : tab === "vehicle" ? (
        <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <form onSubmit={addVehicleDoc} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
            <h2 className="mb-3 flex items-center font-semibold text-[var(--text)]"><Plus className="mr-2 h-4 w-4 text-amber-400" /> Scadenza mezzo</h2>
            <div className="space-y-2">
              <select required value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]">
                <option value="">Mezzo *</option>
                {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.targa} · {vehicle.categoria}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select value={effectiveVehicleTipo} onChange={(e) => setVehicleTipo(e.target.value)} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]">
                  {visibleVehicleTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
                <input required type="date" value={dataScadenza} onChange={(e) => setDataScadenza(e.target.value)} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
              </div>
              <input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
              <button type="submit" disabled={saving || !vehicleId} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Salva
              </button>
            </div>
          </form>
          <div className="space-y-2">
            {vehicleItems.length === 0 ? <p className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 text-sm text-[var(--text-label-soft)]">Nessuna scadenza mezzo.</p> : vehicleItems.map((item) => {
              const days = daysLeft(item.dataScadenza);
              return (
                <div key={`${item.sourceTable}-${item.id}`} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${urgencyClass(days)}`}>
                  <div>
                    <p className="text-sm font-semibold">{item.subjectName} · {item.tipoLabel}</p>
                    <p className="text-xs opacity-80">{fmtDate(item.dataScadenza)} · {days < 0 ? `scaduta da ${Math.abs(days)} gg` : `tra ${days} gg`}{item.note ? ` · ${item.note}` : ""}</p>
                  </div>
                  {item.sourceTable === "VehicleDeadline" ? (
                    <button type="button" onClick={() => remove("vehicle", item.id)} className="text-[var(--text-label)] hover:text-red-300" aria-label="Elimina"><Trash2 className="h-4 w-4" /></button>
                  ) : (
                    <a href="/dashboard/vehicles" className="rounded-lg border border-[var(--surface-border)] px-2 py-1 text-xs font-semibold text-[var(--text)] hover:border-indigo-500">Apri mezzo</a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : tab === "company" ? (
        <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <form onSubmit={addCompanyDoc} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
            <h2 className="mb-3 flex items-center font-semibold text-[var(--text)]"><Plus className="mr-2 h-4 w-4 text-amber-400" /> Scadenza aziendale</h2>
            <div className="space-y-2">
              <select value={companyTipo} onChange={(e) => setCompanyTipo(e.target.value)} className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]">
                {COMPANY_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <input required type="date" value={dataScadenza} onChange={(e) => setDataScadenza(e.target.value)} className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
              <input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
              <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Salva
              </button>
            </div>
          </form>
          <div className="space-y-2">
            {company.length === 0 ? <p className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 text-sm text-[var(--text-label-soft)]">Nessuna scadenza aziendale.</p> : company.map((item) => {
              const days = daysLeft(item.dataScadenza);
              return (
                <div key={item.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${urgencyClass(days)}`}>
                  <div>
                    <p className="text-sm font-semibold">{deadlineLabel(item.tipo)}</p>
                    <p className="text-xs opacity-80">{fmtDate(item.dataScadenza)} · {days < 0 ? `scaduta da ${Math.abs(days)} gg` : `tra ${days} gg`}{item.note ? ` · ${item.note}` : ""}</p>
                  </div>
                  <button type="button" onClick={() => remove("company", item.id)} className="text-[var(--text-label)] hover:text-red-300" aria-label="Elimina"><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <form onSubmit={addBan} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
            <h2 className="mb-3 flex items-center font-semibold text-[var(--text)]"><Plus className="mr-2 h-4 w-4 text-amber-400" /> Nuovo divieto</h2>
            <div className="space-y-2">
              <input required type="date" value={banData} onChange={(e) => setBanData(e.target.value)} className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
              <input placeholder="Regione" value={banRegione} onChange={(e) => setBanRegione(e.target.value)} className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
              <input placeholder="Descrizione (es. divieto domenicale)" value={banDescrizione} onChange={(e) => setBanDescrizione(e.target.value)} className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]" />
              <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Salva
              </button>
              <button type="button" onClick={generateSundays} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:border-amber-500 disabled:opacity-50">
                <CalendarDays className="h-4 w-4" /> Genera 12 domeniche
              </button>
            </div>
          </form>
          <div className="space-y-2">
            {bans.length === 0 ? <p className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5 text-sm text-[var(--text-label-soft)]">Nessun divieto inserito.</p> : bans.map((item) => {
              const days = daysLeft(item.data);
              return (
                <div key={item.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${urgencyClass(days)}`}>
                  <div>
                    <p className="text-sm font-semibold">{fmtDate(item.data)} · {item.regione || "Italia"}</p>
                    <p className="text-xs opacity-80">{item.descrizione || "Divieto mezzi pesanti"}{days >= 0 ? ` · tra ${days} gg` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`https://wa.me/?text=${encodeURIComponent(`Divieto mezzi pesanti ${fmtDate(item.data)} ${item.regione ?? ""}: ${item.descrizione ?? ""}`)}`} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--surface-border)] px-2 py-1 text-xs font-semibold text-[var(--text)] hover:border-emerald-500">WhatsApp</a>
                    <button type="button" onClick={() => removeBan(item.id)} className="text-[var(--text-label)] hover:text-red-300" aria-label="Elimina"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, Loader2, Plus, ShieldAlert, Trash2, Truck, User } from "lucide-react";
import { label } from "@/lib/labels";

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

interface Ban {
  id: string;
  data: string;
  regione: string | null;
  descrizione: string | null;
}

interface Driver {
  id: string;
  nome: string;
  cognome: string;
  role: string;
}

const DRIVER_TYPES = ["PATENTE", "CQC", "CARTA_TACHIGRAFICA", "VISITA_MEDICA", "ADR"];
const COMPANY_TYPES = ["DURC", "POLIZZA_MERCI", "ALBO_AUTOTRASPORTATORI", "ALTRO"];

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
  return "border-slate-800 bg-slate-950/60 text-slate-200";
}

export default function ScadenzePage() {
  const [tab, setTab] = useState<"driver" | "company" | "bans">("driver");
  const [drivers, setDrivers] = useState<DriverDoc[]>([]);
  const [company, setCompany] = useState<CompanyDeadline[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [users, setUsers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [userId, setUserId] = useState("");
  const [tipo, setTipo] = useState("PATENTE");
  const [dataScadenza, setDataScadenza] = useState("");
  const [note, setNote] = useState("");
  const [companyTipo, setCompanyTipo] = useState("DURC");
  const [banData, setBanData] = useState("");
  const [banRegione, setBanRegione] = useState("Emilia-Romagna");
  const [banDescrizione, setBanDescrizione] = useState("");

  const load = async () => {
    try {
      const [dRes, cRes, bRes, uRes] = await Promise.all([
        fetch("/api/deadlines?scope=driver"),
        fetch("/api/deadlines?scope=company"),
        fetch("/api/deadlines/bans"),
        fetch("/api/users"),
      ]);
      const dData = await dRes.json();
      const cData = await cRes.json();
      const bData = await bRes.json();
      const uData = await uRes.json();
      if (dData.items) setDrivers(dData.items);
      if (cData.items) setCompany(cData.items);
      if (bData.items) setBans(bData.items);
      if (uData.users) setUsers(uData.users.filter((u: Driver) => u.role === "AUTISTA"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addDriverDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "driver", userId, tipo, dataScadenza, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore salvataggio");
      setSuccess("Scadenza autista salvata.");
      setDataScadenza("");
      setNote("");
      load();
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
      const res = await fetch("/api/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "company", tipo: companyTipo, dataScadenza, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore salvataggio");
      setSuccess("Scadenza aziendale salvata.");
      setDataScadenza("");
      setNote("");
      load();
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
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (scope: "driver" | "company", id: string) => {
    if (!window.confirm("Eliminare la scadenza?")) return;
    await fetch(`/api/deadlines?id=${id}&scope=${scope}`, { method: "DELETE" });
    load();
  };

  const removeBan = async (id: string) => {
    if (!window.confirm("Eliminare il divieto?")) return;
    await fetch(`/api/deadlines/bans?id=${id}`, { method: "DELETE" });
    load();
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
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    const all = [
      ...drivers.map((d) => daysLeft(d.dataScadenza)),
      ...company.map((c) => daysLeft(c.dataScadenza)),
    ];
    return {
      expired: all.filter((d) => d < 0).length,
      soon: all.filter((d) => d >= 0 && d <= 30).length,
      bans: bans.filter((b) => daysLeft(b.data) >= 0).length,
    };
  }, [drivers, company, bans]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-slate-100">
            <CalendarDays className="mr-2.5 h-6 w-6 text-amber-400" /> Scadenze e divieti
          </h1>
          <p className="mt-1 text-sm text-slate-400">Mezzi, autisti, azienda e calendario divieti mezzi pesanti, con avvisi condivisibili.</p>
        </div>
        <a href="/api/export?type=vehicles" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-indigo-500">
          <Download className="h-4 w-4" /> Esporta mezzi
        </a>
      </div>

      {error && <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-200">{success}</div>}

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-red-300">Scadute</p>
          <p className="mt-1 text-xl font-bold text-red-200">{summary.expired}</p>
        </div>
        <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-300">Entro 30 giorni</p>
          <p className="mt-1 text-xl font-bold text-amber-200">{summary.soon}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Divieti futuri</p>
          <p className="mt-1 text-xl font-bold text-slate-100">{summary.bans}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {[
          { id: "driver", label: "Autisti", icon: User },
          { id: "company", label: "Azienda", icon: ShieldAlert },
          { id: "bans", label: "Divieti mezzi pesanti", icon: Truck },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as typeof tab)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${tab === t.id ? "border-indigo-500 bg-indigo-950/50 text-indigo-200" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-10 text-slate-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Caricamento...</div>
      ) : tab === "driver" ? (
        <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <form onSubmit={addDriverDoc} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="mb-3 flex items-center font-semibold text-slate-100"><Plus className="mr-2 h-4 w-4 text-amber-400" /> Scadenza autista</h2>
            <div className="space-y-2">
              <select required value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                <option value="">Autista *</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                  {DRIVER_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
                </select>
                <input required type="date" value={dataScadenza} onChange={(e) => setDataScadenza(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
              </div>
              <input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
              <button type="submit" disabled={saving || !userId} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Salva
              </button>
            </div>
          </form>
          <div className="space-y-2">
            {drivers.length === 0 ? <p className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-500">Nessuna scadenza autista.</p> : drivers.map((d) => {
              const days = daysLeft(d.dataScadenza);
              return (
                <div key={d.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${urgencyClass(days)}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{d.nome || "Autista"} {d.cognome || ""} · {label(d.tipo)}</p>
                    <p className="text-xs opacity-80">{new Date(d.dataScadenza).toLocaleDateString("it-IT")} · {days < 0 ? `scaduta da ${Math.abs(days)} gg` : `tra ${days} gg`}{d.note ? ` · ${d.note}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Scadenza ${label(d.tipo)} di ${d.nome ?? ""} ${d.cognome ?? ""}: ${new Date(d.dataScadenza).toLocaleDateString("it-IT")}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-200 hover:border-emerald-500"
                    >
                      WhatsApp
                    </a>
                    <button type="button" onClick={() => remove("driver", d.id)} className="text-slate-400 hover:text-red-300" aria-label="Elimina"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : tab === "company" ? (
        <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <form onSubmit={addCompanyDoc} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="mb-3 flex items-center font-semibold text-slate-100"><Plus className="mr-2 h-4 w-4 text-amber-400" /> Scadenza aziendale</h2>
            <div className="space-y-2">
              <select value={companyTipo} onChange={(e) => setCompanyTipo(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                {COMPANY_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
              </select>
              <input required type="date" value={dataScadenza} onChange={(e) => setDataScadenza(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
              <input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
              <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Salva
              </button>
            </div>
          </form>
          <div className="space-y-2">
            {company.length === 0 ? <p className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-500">Nessuna scadenza aziendale.</p> : company.map((c) => {
              const days = daysLeft(c.dataScadenza);
              return (
                <div key={c.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${urgencyClass(days)}`}>
                  <div>
                    <p className="text-sm font-semibold">{label(c.tipo)}</p>
                    <p className="text-xs opacity-80">{new Date(c.dataScadenza).toLocaleDateString("it-IT")} · {days < 0 ? `scaduta da ${Math.abs(days)} gg` : `tra ${days} gg`}{c.note ? ` · ${c.note}` : ""}</p>
                  </div>
                  <button type="button" onClick={() => remove("company", c.id)} className="text-slate-400 hover:text-red-300" aria-label="Elimina"><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <form onSubmit={addBan} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="mb-3 flex items-center font-semibold text-slate-100"><Plus className="mr-2 h-4 w-4 text-amber-400" /> Nuovo divieto</h2>
            <div className="space-y-2">
              <input required type="date" value={banData} onChange={(e) => setBanData(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
              <input placeholder="Regione" value={banRegione} onChange={(e) => setBanRegione(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
              <input placeholder="Descrizione (es. divieto domenicale)" value={banDescrizione} onChange={(e) => setBanDescrizione(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
              <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Salva
              </button>
              <button type="button" onClick={generateSundays} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-amber-500 disabled:opacity-50">
                <CalendarDays className="h-4 w-4" /> Genera 12 domeniche
              </button>
            </div>
          </form>
          <div className="space-y-2">
            {bans.length === 0 ? <p className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-500">Nessun divieto inserito.</p> : bans.map((b) => {
              const days = daysLeft(b.data);
              return (
                <div key={b.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${urgencyClass(days)}`}>
                  <div>
                    <p className="text-sm font-semibold">{new Date(b.data).toLocaleDateString("it-IT")} · {b.regione || "Italia"}</p>
                    <p className="text-xs opacity-80">{b.descrizione || "Divieto mezzi pesanti"}{days >= 0 ? ` · tra ${days} gg` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`https://wa.me/?text=${encodeURIComponent(`Divieto mezzi pesanti ${new Date(b.data).toLocaleDateString("it-IT")} ${b.regione ?? ""}: ${b.descrizione ?? ""}`)}`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-200 hover:border-emerald-500">WhatsApp</a>
                    <button type="button" onClick={() => removeBan(b.id)} className="text-slate-400 hover:text-red-300" aria-label="Elimina"><Trash2 className="h-4 w-4" /></button>
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

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  Route,
  PackageSearch,
  Loader2,
  ShieldCheck,
  Lock,
  Plus,
  ArrowRightLeft,
  Trash2,
  CheckCircle2,
  Search,
} from "lucide-react";
import IncassoRapidoSoon from "@/components/IncassoRapidoSoon";

interface Carico {
  id: string;
  companyId: string;
  kind: "OFFRO" | "CERCO";
  luogoRitiro: string;
  luogoConsegna: string;
  dataRitiro: string;
  dataConsegna: string;
  tipoMerce: string | null;
  pesoKg: number | null;
  volumeM3: number | null;
  vehicleCategory: string | null;
  prezzo: number | null;
  note: string | null;
  status: string;
  companyName: string;
  isMine: boolean;
  companyVerified: boolean;
}

interface Match {
  id: string;
  luogoRitiro: string;
  luogoConsegna: string;
  dataRitiro: string;
  tipoMerce: string | null;
  pesoKg: number | null;
  vehicleCategory: string | null;
  prezzo: number | null;
  companyName: string;
  companyVerified: boolean;
  score: number;
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString("it-IT");
const CATEGORIE = ["FRIGO", "TELONATO", "SPONDA_IDRAULICA", "CISTERNA", "ADR"];

const emptyForm = {
  kind: "OFFRO",
  luogoRitiro: "",
  luogoConsegna: "",
  dataRitiro: "",
  dataConsegna: "",
  tipoMerce: "",
  pesoKg: "",
  volumeM3: "",
  vehicleCategory: "",
  prezzo: "",
  note: "",
};

export default function MarketplacePage() {
  const [carichi, setCarichi] = useState<Carico[] | null>(null);
  const [mioAccount, setMioAccount] = useState<{ verified: boolean; missing: string[] } | null>(null);
  const [filterKind, setFilterKind] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("ATTIVO");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [matches, setMatches] = useState<{ forLoad: Carico | null; items: Match[] } | null>(null);
  const [matching, setMatching] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterKind) params.set("kind", filterKind);
    if (filterStatus) params.set("status", filterStatus);
    if (q) params.set("q", q);
    try {
      const res = await fetch(`/api/marketplace?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setCarichi(data.carichi);
      setMioAccount(data.mioAccount);
    } catch {
      /* silenzioso */
    }
  }, [filterKind, filterStatus, q]);

  useEffect(() => {
    load();
  }, [load]);

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pesoKg: form.pesoKg ? Number(form.pesoKg) : null,
          volumeM3: form.volumeM3 ? Number(form.volumeM3) : null,
          prezzo: form.prezzo ? Number(form.prezzo) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Errore di pubblicazione.");
        return;
      }
      setSuccess("Carico pubblicato sul network.");
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch {
      setError("Errore di rete.");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (c: Carico, status: string) => {
    const res = await fetch(`/api/marketplace/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await load();
  };

  const remove = async (c: Carico) => {
    if (!confirm(`Eliminare il carico ${c.luogoRitiro} → ${c.luogoConsegna}?`)) return;
    const res = await fetch(`/api/marketplace/${c.id}`, { method: "DELETE" });
    if (res.ok) {
      await load();
      if (matches?.forLoad?.id === c.id) setMatches(null);
    }
  };

  const runMatch = async (c: Carico) => {
    setMatching(c.id);
    setMatches(null);
    try {
      const params = new URLSearchParams({
        origine: c.luogoRitiro,
        destinazione: c.luogoConsegna,
        dataRitiro: c.dataRitiro,
      });
      if (c.vehicleCategory) params.set("categoria", c.vehicleCategory);
      const res = await fetch(`/api/marketplace/matches?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMatches({ forLoad: c, items: data.matches });
      }
    } finally {
      setMatching(null);
    }
  };

  if (!carichi) {
    return (
      <div className="flex items-center space-x-2 text-slate-400 text-sm p-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Caricamento borsa carichi...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Borsa Carichi</h1>
          <p className="text-sm text-slate-400 mt-1">
            Carichi pronti o in ricerca vettore, in rete con le aziende verificate.
          </p>
        </div>
        {mioAccount?.verified ? (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-slate-100 font-semibold px-4 py-2 rounded-xl text-sm"
          >
            <Plus className="w-4 h-4" /> <span>Pubblica carico</span>
          </button>
        ) : (
          <Link
            href="/dashboard/integrazioni"
            className="inline-flex items-center space-x-2 bg-slate-800 border border-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-slate-700"
          >
            <ShieldCheck className="w-4 h-4" /> <span>Verifica account per pubblicare</span>
          </Link>
        )}
      </div>

      {!mioAccount?.verified && (
        <div className="flex items-start space-x-3 p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl text-sm text-amber-200">
          <Lock className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">Account in modalità Basic</p>
            <p className="text-xs text-amber-300/80 mt-0.5">
              La visualizzazione dei carichi di rete è disponibile; per pubblicare servono: {mioAccount?.missing?.join(", ")}.
            </p>
          </div>
        </div>
      )}

      <IncassoRapidoSoon />

      {success && (
        <div className="flex items-center space-x-2 text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded-xl px-4 py-2.5">
          <CheckCircle2 className="w-4 h-4" /> {success}
          <button className="ml-auto text-xs underline" onClick={() => setSuccess("")}>
            chiudi
          </button>
        </div>
      )}
      {error && (
        <div className="text-sm text-red-300 bg-red-950/40 border border-red-800/60 rounded-xl px-4 py-2.5">{error}</div>
      )}

      {showForm && (
        <form
          onSubmit={publish}
          className="p-5 bg-slate-900 border border-slate-800 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, kind: "OFFRO" }))}
              className={`flex-1 text-sm font-semibold py-2 rounded-xl border ${
                form.kind === "OFFRO"
                  ? "bg-blue-950 text-blue-200 border-blue-700"
                  : "bg-slate-900 text-slate-400 border-slate-800"
              }`}
            >
              OFFRO CARICO
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, kind: "CERCO" }))}
              className={`flex-1 text-sm font-semibold py-2 rounded-xl border ${
                form.kind === "CERCO"
                  ? "bg-amber-950 text-amber-200 border-amber-700"
                  : "bg-slate-900 text-slate-400 border-slate-800"
              }`}
            >
              CERCO VETTORE
            </button>
          </div>
          <input
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
            placeholder="Luogo ritiro *"
            value={form.luogoRitiro}
            onChange={(e) => setForm((f) => ({ ...f, luogoRitiro: e.target.value }))}
            required
          />
          <input
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
            placeholder="Luogo consegna *"
            value={form.luogoConsegna}
            onChange={(e) => setForm((f) => ({ ...f, luogoConsegna: e.target.value }))}
            required
          />
          <label className="text-xs text-slate-400 flex flex-col">
            Data ritiro *
            <input
              type="date"
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 mt-1"
              value={form.dataRitiro}
              onChange={(e) => setForm((f) => ({ ...f, dataRitiro: e.target.value }))}
              required
            />
          </label>
          <label className="text-xs text-slate-400 flex flex-col">
            Data consegna *
            <input
              type="date"
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 mt-1"
              value={form.dataConsegna}
              onChange={(e) => setForm((f) => ({ ...f, dataConsegna: e.target.value }))}
              required
            />
          </label>
          <input
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
            placeholder="Tipo merce (es. Ortofrutta)"
            value={form.tipoMerce}
            onChange={(e) => setForm((f) => ({ ...f, tipoMerce: e.target.value }))}
          />
          <input
            type="number"
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
            placeholder="Peso kg"
            value={form.pesoKg}
            onChange={(e) => setForm((f) => ({ ...f, pesoKg: e.target.value }))}
          />
          <input
            type="number"
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
            placeholder="Volume m³"
            value={form.volumeM3}
            onChange={(e) => setForm((f) => ({ ...f, volumeM3: e.target.value }))}
          />
          <select
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
            value={form.vehicleCategory}
            onChange={(e) => setForm((f) => ({ ...f, vehicleCategory: e.target.value }))}
          >
            <option value="">Categoria mezzo (opz.)</option>
            {CATEGORIE.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
            placeholder="Prezzo offerta €"
            value={form.prezzo}
            onChange={(e) => setForm((f) => ({ ...f, prezzo: e.target.value }))}
          />
          <input
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 md:col-span-2"
            placeholder="Note (Mc tradizionale, adr, gdo...)"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          />
          <div className="flex items-end space-x-2">
            <button
              disabled={busy}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-slate-100 font-semibold px-4 py-2 rounded-xl text-sm"
            >
              {busy ? "Pubblico..." : "Pubblica"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm text-slate-400 border border-slate-800"
            >
              Annulla
            </button>
          </div>
        </form>
      )}

      {/* Filtri */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { k: "", l: "Tutti" },
          { k: "OFFRO", l: "OFFRO CARICO" },
          { k: "CERCO", l: "CERCO VETTORE" },
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => setFilterKind(f.k)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
              filterKind === f.k
                ? "bg-blue-950 text-blue-200 border-blue-700"
                : "text-slate-400 border-slate-800"
            }`}
          >
            {f.l}
          </button>
        ))}
        <div className="ml-auto flex items-center space-x-2">
          {(() => {
            const mineCount = carichi.filter((c) => c.isMine).length;
            return (
              <button
                onClick={() => setFilterStatus(mineCount ? (filterStatus === "ATTIVO" ? "" : "ATTIVO") : "ATTIVO")}
                className={`text-xs px-3 py-1.5 rounded-full border ${
                  filterStatus === "ATTIVO"
                    ? "bg-slate-900 text-emerald-300 border-emerald-800"
                    : "text-slate-400 border-slate-800"
                }`}
              >
                {filterStatus === "ATTIVO" ? "Solo attivi" : "Tutti gli stati"}
              </button>
            );
          })()}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <Search className="w-4 h-4 text-slate-500 mr-2" />
            <input
              className="bg-transparent text-sm text-slate-100 outline-none w-40"
              placeholder="Cerca..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {carichi.length === 0 && (
        <div className="p-10 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
          <PackageSearch className="w-8 h-8 mx-auto mb-3 text-slate-600" />
          <p className="text-sm">Nessun carico pubblico in rete. Pubblica il primo!</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {carichi.map((c) => (
          <div key={c.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  c.kind === "OFFRO"
                    ? "bg-blue-950 text-blue-300"
                    : "bg-amber-950 text-amber-300"
                }`}
              >
                {c.kind === "OFFRO" ? "OFFRO CARICO" : "CERCO VETTORE"}
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  c.isMine ? "bg-slate-800 text-slate-300" : "bg-emerald-950 text-emerald-300"
                }`}
              >
                {c.isMine ? "MIO" : c.companyVerified ? "NETWORK ✓" : "NETWORK"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <span>{c.luogoRitiro}</span>
              <ArrowRightLeft className="w-4 h-4 text-slate-500" />
              <span>{c.luogoConsegna}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{fmtDate(c.dataRitiro)} → {fmtDate(c.dataConsegna)}</p>

            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-slate-300">
              {c.tipoMerce && (
                <span className="bg-slate-800 px-2 py-0.5 rounded">{c.tipoMerce}</span>
              )}
              {c.pesoKg && (
                <span className="bg-slate-800 px-2 py-0.5 rounded">{c.pesoKg.toLocaleString("it-IT")} kg</span>
              )}
              {c.volumeM3 && (
                <span className="bg-slate-800 px-2 py-0.5 rounded">{c.volumeM3} m³</span>
              )}
              {c.vehicleCategory && (
                <span className="bg-slate-800 px-2 py-0.5 rounded">{c.vehicleCategory}</span>
              )}
              {c.prezzo && (
                <span className="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-semibold">
                  € {c.prezzo.toLocaleString("it-IT")}
                </span>
              )}
            </div>

            {c.note && <p className="mt-2 text-[11px] text-slate-500 italic">{c.note}</p>}
            <p className="mt-2 text-[11px] text-slate-500">
              {c.isMine ? "Print-to-order" : c.companyVerified ? c.companyName : "Azienda del network"}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => runMatch(c)}
                disabled={matching === c.id}
                className="flex-1 inline-flex items-center justify-center space-x-1.5 text-xs font-semibold bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {matching === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Route className="w-3.5 h-3.5" />}
                <span>Match carico vuoto</span>
              </button>
              {c.isMine && (
                <>
                  {c.status === "ATTIVO" && (
                    <button
                      onClick={() => setStatus(c, "COMPLETATO")}
                      className="text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-2 rounded-lg hover:bg-emerald-900"
                    >
                      Chiudi
                    </button>
                  )}
                  <button
                    onClick={() => remove(c)}
                    className="p-2 rounded-lg border border-red-900 text-red-400 hover:bg-red-950"
                    title="Elimina"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Matcher */}
      {matches && (
        <div className="p-5 bg-slate-900 border border-blue-900/50 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-100 flex items-center mb-1">
            <Boxes className="w-5 h-5 mr-2 text-blue-400" />
            Carichi inversi per {matches.forLoad?.luogoRitiro} → {matches.forLoad?.luogoConsegna}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Match deterministico V1: carichi CERCO con percorso inverso (smart return).
          </p>
          {matches.items.length === 0 ? (
            <p className="text-sm text-slate-500">Nessun carico inverso trovato al momento.</p>
          ) : (
            <div className="space-y-2.5">
              {matches.items.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between flex-wrap gap-2 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      {m.luogoRitiro} <ArrowRightLeft className="w-3.5 h-3.5 inline text-slate-500" /> {m.luogoConsegna}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {m.companyName} {m.companyVerified && <span className="text-emerald-400">(verificata)</span>} · {fmtDate(m.dataRitiro)} · score {m.score}
                      {m.pesoKg ? ` · ${m.pesoKg.toLocaleString("it-IT")} kg` : ""}
                    </p>
                  </div>
                  {m.prezzo && (
                    <span className="text-sm font-bold text-emerald-300">€ {m.prezzo.toLocaleString("it-IT")}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
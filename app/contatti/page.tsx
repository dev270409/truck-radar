"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Check, Loader2, Mail, ShieldCheck, Phone, Building2 } from "lucide-react";
import PublicFooter from "@/components/PublicFooter";
import Logo from "@/components/Logo";

export default function ContattiPage() {
  const [form, setForm] = useState({ nome: "", email: "", azienda: "", telefono: "", mezzi: "", messaggio: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error("Errore del server. Riprova tra qualche istante.");
      }
      if (!res.ok) throw new Error(data.error || "Errore nell'invio della richiesta.");
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Errore nell'invio della richiesta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Logo />
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/prezzi" className="text-slate-300 hover:text-white">Prezzi</Link>
          <Link href="/login" className="text-slate-300 hover:text-white">Accedi</Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-12 lg:grid-cols-2 lg:items-start">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-800/60 bg-blue-950/50 px-3 py-1 text-xs font-semibold text-blue-200">
            <CalendarClock className="h-3.5 w-3.5" /> Demo con un esperto
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Prenota una demo di Truck Radar
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
            Analizziamo insieme la tua flotta e ti mostriamo come Truck Radar si collega ai tuoi sistemi,
            riduce i km a vuoto e tiene sotto controllo scadenze e margini.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              "Demo guidata sulla tua tipologia di flotta",
              "Verifica dell'integrazione con GPS/TMS/ERP esistenti",
              "Stima dei km a vuoto recuperabili (Smart Return)",
              "Nessun impegno: valutiamo insieme se siamo il partner giusto",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-slate-200">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Dati in UE, cifrati
            </span>
            <span className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-400" /> Risposta entro 1 giorno lavorativo
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
          {done ? (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-950 text-emerald-400">
                <Check className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-xl font-bold">Richiesta inviata</h2>
              <p className="mt-2 text-sm text-slate-300">
                Grazie! Ti contatteremo al piÃ¹ presto per fissare la demo.
              </p>
              <Link href="/" className="mt-6 inline-block text-sm text-blue-400 hover:text-blue-300">
                Torna alla home
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-800/80 bg-red-950/60 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome e cognome *">
                  <input required value={form.nome} onChange={set("nome")} placeholder="Mario Rossi" className={inputCls} />
                </Field>
                <Field label="Email aziendale *">
                  <input required type="email" value={form.email} onChange={set("email")} placeholder="nome@azienda.it" className={inputCls} />
                </Field>
                <Field label="Azienda">
                  <input value={form.azienda} onChange={set("azienda")} placeholder="Trasporti Rossi Srl" className={inputCls} />
                </Field>
                <Field label="Telefono">
                  <input value={form.telefono} onChange={set("telefono")} placeholder="+39 ..." className={inputCls} />
                </Field>
              </div>
              <Field label="Numero di mezzi">
                <select value={form.mezzi} onChange={set("mezzi")} className={inputCls}>
                  <option value="">Selezionaâ€¦</option>
                  <option value="1-5">1â€“5 mezzi</option>
                  <option value="6-20">6â€“20 mezzi</option>
                  <option value="21-50">21â€“50 mezzi</option>
                  <option value="50+">PiÃ¹ di 50 mezzi</option>
                </select>
              </Field>
              <Field label="Di cosa hai bisogno?">
                <textarea value={form.messaggio} onChange={set("messaggio")} rows={4} placeholder="Es. gestione flotta, DDT, subappalto, integrazione con il nostro GPSâ€¦" className={inputCls} />
              </Field>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                {loading ? "Invio in corsoâ€¦" : "Richiedi la demo"}
              </button>
              <p className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Building2 className="h-3.5 w-3.5" /> Nessun costo, nessun impegno.
              </p>
            </form>
          )}
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}
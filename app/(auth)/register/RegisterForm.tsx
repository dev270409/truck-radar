"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  User,
} from "lucide-react";
import Logo from "@/components/Logo";

type Step = "A" | "B" | "C" | "D";
type Plan = "BASE" | "PRO";

const planPrice: Record<Plan, string> = {
  BASE: "59",
  PRO: "199",
};

const steps = [
  { id: "A" as const, label: "Azienda", icon: Building2 },
  { id: "B" as const, label: "Admin", icon: User },
  { id: "C" as const, label: "Conferma", icon: CheckCircle2 },
];

export default function RegisterForm({ initialPlan }: { initialPlan: Plan }) {
  const [step, setStep] = useState<Step>("A");
  const [selectedPlan, setSelectedPlan] = useState<Plan>(initialPlan);

  const [ragioneSociale, setRagioneSociale] = useState("");
  const [partitaIva, setPartitaIva] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [telefono, setTelefono] = useState("");

  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nextFromCompany = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!ragioneSociale || !partitaIva || !indirizzo || !telefono) {
      setError("Compila tutti i campi dell'azienda per proseguire.");
      return;
    }
    if (!/^\d{11}$|^[A-Z0-9]{16}$/i.test(partitaIva.replace(/\s/g, ""))) {
      setError("Inserisci una Partita IVA (11 cifre) o un Codice Fiscale (16 caratteri).");
      return;
    }
    setStep("B");
  };

  const nextFromAdmin = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!nome || !cognome || !email || !password || !passwordConfirm) {
      setError("Compila tutti i campi dell'amministratore per proseguire.");
      return;
    }
    if (password.length < 8) {
      setError("La password deve contenere almeno 8 caratteri.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Le password non coincidono.");
      return;
    }
    setStep("C");
  };

  const completeRegistration = async () => {
    if (!acceptTerms) {
      setError("Accetta termini e informativa privacy per creare l'account.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ragioneSociale,
          partitaIva: partitaIva.replace(/\s/g, ""),
          indirizzo,
          telefono,
          email,
          password,
          nome,
          cognome,
          plan: selectedPlan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nella registrazione");
      setStep("D");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di connessione durante la registrazione.");
    } finally {
      setLoading(false);
    }
  };

  const stepDone = (id: "A" | "B" | "C") => {
    if (step === "D") return true;
    if (id === "A") return step === "B" || step === "C";
    if (id === "B") return step === "C";
    return false;
  };

  return (
    <div
      data-theme="dark"
      className="register-dark flex min-h-screen flex-col items-center justify-center p-4"
      style={{ background: "var(--bg-grad-a)" }}
    >
      <div className="my-8 w-full max-w-2xl rounded-[14px] border border-slate-800 bg-[var(--surface)] p-6 md:p-8">
        <div className="mb-8 flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center space-x-3">
            <Logo size={40} withWordmark={false} />
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Truck Radar</h1>
              <p className="text-xs text-slate-400">Prova gratuita di 21 giorni</p>
            </div>
          </div>
          <Link href="/login" className="text-xs text-slate-400 transition hover:text-white">
            Hai già un account? <span className="font-semibold text-blue-400">Accedi</span>
          </Link>
        </div>

        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-300">Piano della prova</span>
            <select
              id="trial-plan"
              name="plan"
              value={selectedPlan}
              onChange={(event) => setSelectedPlan(event.target.value as Plan)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            >
              <option value="BASE">BASE · €59 al mese</option>
              <option value="PRO">PRO · €199 al mese</option>
            </select>
          </label>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            21 giorni senza carta. Il piano scelto viene mantenuto dopo la registrazione.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Nessuna carta
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> KYC solo dopo la prova
          </span>
        </div>

        <div className="mb-8 grid grid-cols-3 gap-2">
          {steps.map((item, index) => {
            const Icon = item.icon;
            const active = step === item.id;
            const done = stepDone(item.id);
            return (
              <div
                key={item.id}
                className={`flex flex-col items-center rounded-xl border p-2.5 transition ${
                  active
                    ? "border-blue-500 bg-blue-600/20 text-blue-300"
                    : done
                      ? "border-emerald-800/60 bg-emerald-950/30 text-emerald-400"
                      : "border-slate-800 bg-slate-950/40 text-slate-500"
                }`}
              >
                <div className="mb-1 flex items-center space-x-1.5">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-semibold">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <span className="max-w-full truncate text-xs">{item.label}</span>
              </div>
            );
          })}
        </div>

        {error && (
          <div role="alert" aria-live="polite" className="mb-6 flex items-start space-x-3 rounded-xl border border-red-800/80 bg-red-950/60 p-4 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {step === "A" && (
          <form onSubmit={nextFromCompany} className="space-y-4">
            <h2 className="flex items-center text-lg font-semibold text-slate-200">
              <Building2 className="mr-2 h-5 w-5 text-blue-400" /> Dati aziendali
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-300">Ragione sociale *</span>
                <input
                  name="ragioneSociale"
                  type="text"
                  autoComplete="organization"
                  required
                  value={ragioneSociale}
                  onChange={(event) => setRagioneSociale(event.target.value)}
                  placeholder="Es. Trasporti Italia S.r.l."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-300">P. IVA o codice fiscale *</span>
                <input
                  name="partitaIva"
                  type="text"
                  autoComplete="off"
                  required
                  value={partitaIva}
                  onChange={(event) => setPartitaIva(event.target.value)}
                  placeholder="11 cifre o 16 caratteri"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-300">Sede legale *</span>
                <input
                  name="indirizzo"
                  type="text"
                  autoComplete="street-address"
                  required
                  value={indirizzo}
                  onChange={(event) => setIndirizzo(event.target.value)}
                  placeholder="Indirizzo completo della sede…"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-300">Telefono *</span>
                <input
                  name="telefono"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={telefono}
                  onChange={(event) => setTelefono(event.target.value)}
                  placeholder="Numero con prefisso internazionale…"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                />
              </label>
            </div>
            <div className="flex justify-end border-t border-slate-800 pt-4">
              <button
                type="submit"
                className="flex items-center space-x-2 rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-blue-500"
              >
                <span>Prosegui</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {step === "B" && (
          <form onSubmit={nextFromAdmin} className="space-y-4">
            <h2 className="flex items-center text-lg font-semibold text-slate-200">
              <User className="mr-2 h-5 w-5 text-blue-400" /> Account amministratore
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-300">Nome *</span>
                <input
                  name="nome"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-300">Cognome *</span>
                <input
                  name="cognome"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={cognome}
                  onChange={(event) => setCognome(event.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-slate-300">Email *</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@azienda.it"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-300">Password *</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimo 8 caratteri"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-300">Conferma password *</span>
                <input
                  name="passwordConfirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                />
              </label>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setStep("A")}
                className="flex items-center space-x-2 rounded-xl bg-slate-800 px-4 py-2.5 font-medium text-slate-300 transition hover:bg-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Indietro</span>
              </button>
              <button
                type="submit"
                className="flex items-center space-x-2 rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-blue-500"
              >
                <span>Prosegui</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {step === "C" && (
          <div className="space-y-5">
            <h2 className="flex items-center text-lg font-semibold text-slate-200">
              <CheckCircle2 className="mr-2 h-5 w-5 text-emerald-400" /> Conferma e avvia la prova
            </h2>

            <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm md:grid-cols-2">
              <div>
                <p className="text-[11px] font-medium text-slate-500">Azienda</p>
                <p className="mt-1 font-semibold text-slate-100">{ragioneSociale}</p>
                <p className="text-xs text-slate-400">P. IVA/CF {partitaIva}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Admin</p>
                <p className="mt-1 font-semibold text-slate-100">{nome} {cognome}</p>
                <p className="text-xs text-slate-400">{email}</p>
              </div>
              <div className="md:col-span-2 border-t border-slate-800 pt-3">
                <p className="text-[11px] font-medium text-slate-500">Piano della prova</p>
                <p className="mt-1 font-semibold text-slate-100">
                  {selectedPlan} · €{planPrice[selectedPlan]} al mese dopo i 21 giorni di prova
                </p>
              </div>
              <div className="md:col-span-2 border-t border-slate-800 pt-3">
                <p className="text-[11px] font-medium text-slate-500">Cosa succede ora</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Accedi al piano {selectedPlan} per 21 giorni. Non ti chiediamo documenti adesso: al termine della prova,
                  per continuare, dovrai completare la verifica aziendale (P.IVA/CF) e la verifica identità del legale rappresentante.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900"
              />
              <span>
                Accetto i <Link href="/termini" className="text-blue-400 hover:underline">termini</Link> e l&apos;
                <Link href="/privacy" className="text-blue-400 hover:underline">informativa privacy</Link>.
              </span>
            </label>

            <div className="flex justify-between border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setStep("B")}
                className="flex items-center space-x-2 rounded-xl bg-slate-800 px-4 py-2.5 font-medium text-slate-300 transition hover:bg-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Indietro</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={completeRegistration}
                className="ops-btn ops-btn--primary disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Creazione account...</span>
                  </>
                ) : (
                  <>
                    <span>Crea account e prova 21 giorni</span>
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === "D" && (
          <div className="space-y-6 py-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-700/60 bg-emerald-950 text-emerald-400 shadow-xl shadow-emerald-950">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Account creato</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                <span className="font-semibold text-blue-300">{ragioneSociale}</span> è in prova sul piano {selectedPlan} per 21 giorni.
                Nessun documento richiesto ora.
              </p>
            </div>
            <div className="mx-auto max-w-md space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left text-xs text-slate-300">
              <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-400" /> Prova attiva per 21 giorni sul piano {selectedPlan}.</p>
              <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-400" /> Al giorno 21: verifica P.IVA/CF + identità del legale rappresentante.</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Dopo la verifica puoi attivare l’abbonamento.</p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center space-x-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500"
            >
              <span>Vai al login</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

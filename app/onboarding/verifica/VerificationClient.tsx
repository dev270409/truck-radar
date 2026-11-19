"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Fingerprint,
  Loader2,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import Logo from "@/components/Logo";

interface VerificationStatus {
  trialEndsAt: string | null;
  trialActive: boolean;
  trialExpired: boolean;
  trialDaysLeft: number | null;
  kybStatus: string | null;
  kybVerified: boolean;
  kycStatus: string | null;
  kycVerified: boolean;
  complete: boolean;
  lastError: string | null;
}

interface CompanyInfo {
  ragioneSociale: string;
  partitaIva: string;
  indirizzo: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
}

const kybLabel: Record<string, string> = {
  ATTIVA: "Azienda attiva",
  INATTIVA: "Azienda non attiva",
  NON_TROVATA: "Non trovata",
  NON_CONFIGURATO: "Provider non configurato",
};

const kycLabel: Record<string, string> = {
  verified: "Identità verificata",
  requires_input: "Verifica da completare",
  processing: "Verifica in corso",
  canceled: "Verifica annullata",
  created: "Verifica da iniziare",
};

export default function VerificationClient({
  company,
  initialStatus,
  identityEnabled,
}: {
  company: CompanyInfo;
  initialStatus: VerificationStatus;
  identityEnabled: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState<"kyb" | "identity" | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const refresh = async () => {
    const res = await fetch("/api/onboarding/status");
    const data = await res.json();
    if (res.ok && data.status) setStatus(data.status);
  };

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/onboarding/status");
      const data = await res.json();
      if (res.ok && data.status) setStatus(data.status);
    })();
  }, []);

  const verifyKyb = async () => {
    setBusy("kyb");
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/onboarding/kyb", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verifica aziendale non riuscita");
      setInfo(
        data.verified
          ? "Partita IVA/Codice Fiscale verificato."
          : `Esito: ${kybLabel[data.verification?.status] ?? "non verificato"}. Controlla i dati o riprova.`
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const verifyIdentity = async () => {
    setBusy("identity");
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/onboarding/identity", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verifica identità non disponibile");
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      throw new Error("Il provider non ha restituito un link di verifica.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const trialMessage = status.trialActive
    ? `Prova attiva: ${status.trialDaysLeft ?? 0} giorni rimasti. Puoi completare la verifica anche subito.`
    : status.trialExpired
      ? "La prova è terminata. Completa le verifiche per continuare."
      : "Stato prova non disponibile.";

  return (
    <main data-theme="dark" className="dashboard-dark min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-slate-100">
            <Logo />
          </Link>
          <Link href="/dashboard/account" className="text-xs font-semibold text-slate-400 hover:text-white">
            Account
          </Link>
        </div>

        <header className="ops-card p-6">
          <p className="ops-label">Onboarding aziendale</p>
          <h1 className="font-display mt-1 text-2xl font-bold text-slate-100">Verifica per continuare</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {trialMessage} La verifica aziendale controlla P.IVA/CF; la verifica identità conferma il legale rappresentante.
          </p>
          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Azienda</p>
              <p className="mt-1 font-semibold text-slate-100">{company.ragioneSociale}</p>
              <p className="font-mono text-slate-400">{company.partitaIva}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Sede legale</p>
              <p className="mt-1 text-slate-200">{company.indirizzo}</p>
              <p className="text-slate-500">{company.subscriptionStatus}{status.trialEndsAt ? ` · trial ${new Date(status.trialEndsAt).toLocaleDateString("it-IT")}` : ""}</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {info && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {info}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2">
          <article className="ops-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-950/60 text-sky-300">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-100">Verifica aziendale</h2>
                  <p className="text-[11px] text-slate-500">P.IVA / Codice Fiscale</p>
                </div>
              </div>
              <StatusBadge ok={status.kybVerified} label={status.kybStatus ? kybLabel[status.kybStatus] ?? status.kybStatus : "Da fare"} />
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-400">
              Controlliamo l&apos;azienda su VIES e, se configurato, sul Registro Imprese tramite Openapi.
            </p>
            <button
              type="button"
              onClick={verifyKyb}
              disabled={busy !== null || status.kybVerified}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {busy === "kyb" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {status.kybVerified ? "Verificata" : "Verifica P.IVA/CF"}
            </button>
          </article>

          <article className="ops-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-950/60 text-violet-300">
                  <Fingerprint className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-100">Verifica identità</h2>
                  <p className="text-[11px] text-slate-500">Legale rappresentante</p>
                </div>
              </div>
              <StatusBadge ok={status.kycVerified} label={status.kycStatus ? kycLabel[status.kycStatus] ?? status.kycStatus : "Da fare"} />
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-400">
              Documento e selfie gestiti dal provider KYC. Truck Radar riceve solo l&apos;esito e non conserva le immagini.
            </p>
            {status.lastError && <p className="mt-2 text-[11px] text-amber-300">Ultimo errore: {status.lastError}</p>}
            <button
              type="button"
              onClick={verifyIdentity}
              disabled={busy !== null || status.kycVerified || !identityEnabled}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {busy === "identity" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              {status.kycVerified ? "Verificata" : status.kycStatus === "requires_input" ? "Riprova verifica" : "Verifica identità"}
            </button>
            {!identityEnabled && (
              <p className="mt-2 text-[11px] text-amber-300">
                Provider KYC non attivo. Configura Stripe Identity per abilitare questa verifica.
              </p>
            )}
          </article>
        </section>

        {status.complete ? (
          <section className="rounded-2xl border border-emerald-800/60 bg-emerald-950/30 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
              <div>
                <h2 className="text-sm font-bold text-emerald-100">Verifica completata</h2>
                <p className="mt-1 text-xs leading-5 text-emerald-100/80">
                  Azienda e legale rappresentante verificati. Scegli un piano per continuare con le funzioni complete.
                </p>
                <Link
                  href="/dashboard/abbonamenti"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Scegli il piano <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        ) : status.trialExpired ? (
          <section className="flex items-start gap-3 rounded-2xl border border-amber-800/60 bg-amber-950/30 p-5">
            <ShieldX className="mt-0.5 h-5 w-5 text-amber-300" />
            <div>
              <h2 className="text-sm font-bold text-amber-100">Accesso in pausa</h2>
              <p className="mt-1 text-xs leading-5 text-amber-100/80">
                Completa entrambe le verifiche per riprendere. Se hai bisogno di aiuto, contatta il supporto.
              </p>
            </div>
          </section>
        ) : (
          <section className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <Clock className="mt-0.5 h-5 w-5 text-slate-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-100">Puoi continuare a usare Truck Radar</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                La verifica diventa necessaria alla fine dei 21 giorni. Puoi anticiparla ora senza perdere l&apos;accesso.
              </p>
              <Link href="/dashboard" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-sky-300 hover:text-sky-200">
                Torna alla dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${ok ? "border-emerald-800 bg-emerald-950 text-emerald-300" : "border-slate-700 bg-slate-900 text-slate-400"}`}>
      {label}
    </span>
  );
}

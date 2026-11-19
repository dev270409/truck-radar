"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";

const SHOW_DEMO_CREDS = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDS === "true";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Credenziali non valide. Verifica email e password.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Si è verificato un errore durante l'accesso.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section data-theme="dark" className="hidden flex-col justify-between p-10 lg:flex" style={{ background: "var(--bg-grad-a)" }}>
        <Link href="/" aria-label="Truck Radar — home">
          <Logo />
        </Link>
        <div className="max-w-md">
          <p className="ops-eyebrow">Truck Radar</p>
          <h1 className="ops-title mt-4 text-5xl text-[var(--text)]">
            Ogni viaggio sotto controllo.
          </h1>
          <p className="ops-subtitle mt-5 text-[var(--text-soft)]">
            Flotta, viaggi, DDT, piano di carico e margini in un unico posto.
          </p>
          <div className="mt-8 space-y-3 text-[13px]" style={{ color: "var(--text-soft)" }}>
            {["Scadenze e documenti sotto controllo", "Piano di carico e preventivi collegati", "Dati separati per azienda, in UE"].map((x) => (
              <p key={x} className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" style={{ color: "var(--success)" }} /> {x}
              </p>
            ))}
          </div>
        </div>
        <p className="text-[11px]" style={{ color: "var(--text-label-soft)" }}>© {new Date().getFullYear()} Truck Radar</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden">
            <Link href="/" aria-label="Truck Radar — home"><Logo /></Link>
          </div>
          <div className="mt-8 lg:mt-0">
            <p className="ops-eyebrow">Area azienda</p>
            <h2 className="ops-title mt-3 text-3xl">Accedi a Truck Radar.</h2>
            <p className="ops-subtitle mt-2 text-[14px]">Inserisci le credenziali della tua azienda.</p>
          </div>

          {error && (
            <div role="alert" className="mt-6 rounded-[10px] border px-3 py-2.5 text-[13px]" style={{ borderColor: "color-mix(in oklab, var(--danger) 35%, transparent)", background: "color-mix(in oklab, var(--danger) 8%, transparent)", color: "var(--danger)" }}>
              {error}
            </div>
          )}

          {SHOW_DEMO_CREDS && (
            <div className="mt-6 rounded-[10px] border px-3 py-2.5 text-[12px]" style={{ borderColor: "var(--surface-border)", background: "var(--surface-soft)", color: "var(--text-soft)" }}>
              <p className="font-semibold" style={{ color: "var(--text)" }}>Credenziali demo</p>
              <p className="mt-1 font-mono text-[11px]">admin@demo.com / Demo123!</p>
              <p className="font-mono text-[11px]">autista@demo.com / Demo123!</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className="ops-label">Email aziendale</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@azienda.it"
                className="ops-input mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="password" className="ops-label">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="La tua password"
                className="ops-input mt-1.5"
              />
            </div>
            <button type="submit" disabled={loading} className="ops-btn ops-btn--primary ops-btn--block">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Accesso…</> : <>Accedi <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-[12px]">
            <Link href="/register" className="font-semibold" style={{ color: "var(--brand)" }}>Registra la tua azienda</Link>
            <Link href="/" style={{ color: "var(--text-label)" }}>Torna al sito</Link>
          </div>
          <p className="mt-3 text-[11px]" style={{ color: "var(--text-label)" }}>
            Password dimenticata? Chiedi all&apos;amministratore della tua azienda di reimpostarla.
          </p>

          <p className="mt-8 text-[11px] leading-5" style={{ color: "var(--text-label-soft)" }}>
            Accedendo accetti i <Link href="/termini" className="underline">Termini</Link> e l&apos;
            <Link href="/privacy" className="underline">Informativa privacy</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center" style={{ background: "var(--bg-grad-a)" }}>
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--brand)" }} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

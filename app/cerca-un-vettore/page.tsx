"use client";

import Link from "next/link";
import { Search, ArrowRight, ShieldCheck, FileCheck2, PackageOpen } from "lucide-react";

export default function CercaUnVettorePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <img src="/logo.jpg" alt="Truck Radar" className="h-9 w-9 rounded-xl object-cover" />
          Truck Radar
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-slate-300 hover:text-white">Accedi</Link>
          <Link href="/register" className="rounded-xl bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500">Registra la tua azienda</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-14">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-rose-800/60 bg-rose-950/50 px-3 py-1 text-xs font-semibold text-rose-200">
            <Search className="h-3.5 w-3.5" /> Hai un carico da affidare?
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Cerca un vettore affidabile per i tuoi viaggi.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-400">
            Pubblica i carichi della tua azienda e affida i viaggi solo a vettori verificati del
            Network Truck Radar: documenti in regola, reputazione pubblica e tracciabilità dei subappalti.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-6 py-3.5 text-base font-semibold shadow-lg shadow-rose-900/30 hover:bg-rose-600"
            >
              Crea l&apos;account e pubblica un viaggio <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-6 py-3.5 text-base font-semibold text-slate-200 hover:border-slate-500"
            >
              Accedi come azienda
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <PackageOpen className="h-6 w-6 text-blue-400" />
            <h2 className="mt-4 text-lg font-bold">Pubblica i carichi</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Inserisci origine, destinazione, data, peso e merce. Il carico parte dalla Borsa Carichi del Network.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <h2 className="mt-4 text-lg font-bold">Vettori solo verificati</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Ogni candidato ha account verificato, visura e documenti in regola. La reputazione dei subappalti è pubblica.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <FileCheck2 className="h-6 w-6 text-amber-400" />
            <h2 className="mt-4 text-lg font-bold">Documenti e tracciabilità</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              DDT, stato di consegna e storico del viaggio restano disponibili per la tua azienda.
            </p>
          </article>
        </div>

        <div className="mx-auto mt-14 max-w-3xl rounded-3xl border border-blue-900/60 bg-blue-950/20 p-8 text-center">
          <h2 className="text-2xl font-bold">Il Network ammette solo aziende verificate.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Per pubblicare e affidare viaggi la tua azienda completa il percorso di verifica: dati societari,
            visura e identità del rappresentante, gestiti tramite fornitori specializzati. Il gestionale resta
            utilizzabile subito, senza attestazioni.
          </p>
        </div>
      </section>

      <footer className="border-t border-slate-800 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-slate-500 md:flex-row">
          <span>© {new Date().getFullYear()} Truck Radar · Transport Operating System</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-slate-300">Privacy</Link>
            <Link href="/termini" className="hover:text-slate-300">Termini</Link>
            <Link href="/cookie" className="hover:text-slate-300">Cookie</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
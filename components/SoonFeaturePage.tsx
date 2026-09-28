"use client";

import Link from "next/link";
import { ArrowLeft, Clock, Construction } from "lucide-react";

interface SoonColumn {
  label: string;
  value: string;
}

interface SoonFeaturePageProps {
  title: string;
  subtitle: string;
  description: string;
  /** Righe della tabella dati d'esempio (mostrate come anteprima non reale). */
  columns: string[];
  rows: string[][];
  /** Elenco funzioni che arriveranno. */
  bullets: string[];
  /** Metriche d'esempio in alto. */
  metrics?: SoonColumn[];
}

/**
 * Pagina "In arrivo": NON rimuove funzioni, mostra un'anteprima con dati
 * d'esempio chiaramente etichettati come non reali, senza toccare i dati aziendali.
 */
export default function SoonFeaturePage({
  title,
  subtitle,
  description,
  columns,
  rows,
  bullets,
  metrics,
}: SoonFeaturePageProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Panoramica
          </Link>
          <h1 className="mt-2 flex items-center text-2xl font-bold text-slate-100">
            {title}
            <span className="ml-3 rounded-full border border-amber-800/60 bg-amber-950 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
              Soon
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-800/50 bg-amber-950/20 p-4">
        <p className="flex items-center text-sm font-bold text-amber-100">
          <Construction className="mr-2 h-4 w-4" /> Funzione in arrivo
        </p>
        <p className="mt-1 text-xs leading-5 text-amber-100/80">{description}</p>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-200/70">
          <Clock className="h-3 w-3" /> I dati mostrati sotto sono un&apos;anteprima di esempio, non provengono dalla tua azienda.
        </p>
      </div>

      {metrics && metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 opacity-80">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{m.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-300">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 opacity-90">
          <div className="border-b border-slate-800 px-5 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">Anteprima (dati di esempio)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-950/70 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="px-5 py-3">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-5 py-3">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">Cosa arriverà</h2>
          <ul className="space-y-2 text-sm text-slate-300">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

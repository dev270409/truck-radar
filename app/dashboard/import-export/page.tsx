"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { downloadCsv, toCsv } from "@/lib/csv";

type ImportType = "vehicles" | "trips" | "customers";

const templates: Record<ImportType, { label: string; headers: string[]; example: string[][] }> = {
  vehicles: {
    label: "Mezzi",
    headers: ["targa", "categoria", "portataMaxKg", "volumeMaxM3"],
    example: [["AB123CD", "TELONATO", "24000", "90"]],
  },
  trips: {
    label: "Viaggi",
    headers: ["luogoRitiro", "luogoConsegna", "dataRitiro", "dataConsegna", "tipoMerce", "pesoKg", "volumeM3", "cliente", "prezzo", "costo"],
    example: [["Ferrara", "Bologna", "2026-11-20", "2026-11-20", "Pallet", "12000", "60", "Cliente Demo", "650", "480"]],
  },
  customers: {
    label: "Clienti",
    headers: ["nome", "email", "telefono", "indirizzo", "piva", "note"],
    example: [["Cliente Demo", "cliente@demo.it", "3331234567", "Via Roma 1, Bologna", "12345678901", ""]],
  },
};

export default function ImportExportPage() {
  const [busy, setBusy] = useState<ImportType | null>(null);
  const [result, setResult] = useState<{ type: ImportType; imported: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");

  const handleFile = async (type: ImportType, file: File) => {
    setBusy(type);
    setError("");
    setResult(null);
    try {
      const csv = await file.text();
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, csv }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore import");
      setResult({ type, imported: Number(data.imported ?? 0), errors: Array.isArray(data.errors) ? data.errors : [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const downloadTemplate = (type: ImportType) => {
    const t = templates[type];
    downloadCsv(`modello-${type}.csv`, toCsv(t.headers, t.example));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center text-2xl font-semibold text-[var(--text)]">
          <FileSpreadsheet className="mr-2.5 h-6 w-6 text-indigo-400" /> Import / Export
        </h1>
        <p className="mt-1 text-sm text-[var(--text-label)]">
          Porta dentro i dati dal gestionale che usi già: esporta in CSV, importa in Truck Radar. Le colonne sono flessibili.
        </p>
      </div>

      {error && <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>}

      {result && (
        <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-200">
          Import {templates[result.type].label}: {result.imported} righe create.
          {result.errors.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-xs text-amber-200">
              {result.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(templates) as ImportType[]).map((type) => (
          <section key={type} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
            <h2 className="font-semibold text-[var(--text)]">{templates[type].label}</h2>
            <p className="mt-1 text-xs text-[var(--text-label-soft)]">CSV con intestazione. Colonne riconosciute automaticamente.</p>
            <div className="mt-4 flex flex-col gap-2">
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
                {busy === type ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Importa CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(type, f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <button type="button" onClick={() => downloadTemplate(type)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:border-indigo-500">
                <Download className="h-4 w-4" /> Modello CSV
              </button>
              <a href={`/api/export?type=${type}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:border-indigo-500">
                <Download className="h-4 w-4" /> Esporta esistenti
              </a>
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5">
        <h2 className="font-semibold text-[var(--text)]">Altri export</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["quotes", "Preventivi"],
            ["orders", "Ordini"],
            ["customers", "Clienti"],
            ["costs", "Costi mezzi"],
          ].map(([type, label]) => (
            <a key={type} href={`/api/export?type=${type}`} className="inline-flex items-center gap-2 rounded-lg border border-[var(--surface-border)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:border-indigo-500">
              <Download className="h-4 w-4" /> {label}
            </a>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--text-label-soft)]">
          Per Excel: apri il file in Excel e salva come CSV UTF-8. Dopo l&apos;import controlla sempre i dati, soprattutto targhe, date e importi.
        </p>
      </section>
    </div>
  );
}

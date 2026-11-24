"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Route,
  Upload,
} from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";

interface ParsedLine {
  code: string;
  date: string;
  pickupTime: string;
  description: string;
  customer: string;
  amount: number;
}

interface StatementSummary {
  id: string;
  fileName: string;
  provider: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  declaredTrips: number | null;
  declaredDays: number | null;
  declaredTotal: number | null;
  parsedTrips: number;
  parsedTotal: number;
  parserMode?: string;
}

interface ParseResult {
  statement: StatementSummary;
  lines: ParsedLine[];
  duplicates: string[];
  warnings: string[];
}

interface TripSummary {
  code: string;
  date: string;
  customer: string;
  description: string;
  amount: number;
}

interface Analytics {
  totalEarnings: number;
  tripCount: number;
  activeDays: number;
  avgPerTrip: number;
  avgPerActiveDay: number;
  projectedYear: number;
  forecast: {
    monthsUsed: number;
    statementsUsed: number;
    totalImported: number;
    avgMonthly: number;
    projected12m: number;
    confidence: "BASSA" | "MEDIA" | "ALTA";
    note: string;
  };
  topTrips: TripSummary[];
  bottomTrips: TripSummary[];
  topRevenuePerKm: Array<{ code: string; km: number; amount: number; revenuePerKm: number }>;
  geotab: {
    available: boolean;
    totalKm: number;
    movementKm: number;
    movementCount: number;
    realTripKm: number;
    realTripCount: number;
    matchedKm: number;
    matchedTrips: number;
    unassignedTrips: number;
    unallocatedKm: number;
    emptyKm: number;
    emptyTrips: number;
    unmatchedGeotabTrips: number;
    coveragePct: number;
  };
  warnings: string[];
}

interface AutoMatchSummary {
  matchedVehicles: number;
  matchedDrivers: number;
  emptyTrips: number;
  emptyKm: number;
}

interface ForecastSummary {
  monthsUsed: number;
  statementsUsed: number;
  totalImported: number;
  avgMonthly: number;
  projected12m: number;
  confidence: "BASSA" | "MEDIA" | "ALTA";
  note: string;
}

interface HistoryItem {
  id: string;
  fileName: string;
  provider: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  declaredTrips: number | null;
  parsedTrips: number;
  importedTrips: number;
  parsedTotal: number;
  parserMode: string;
  status: string;
  createdAt: string;
  importedAt: string | null;
}

const eur = (value: number) =>
  `€ ${Number(value).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function prettyDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });
}

export default function ImportaRendicontoPage() {
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [imported, setImported] = useState<{
    imported: number;
    skipped: string[];
    autoMatch?: AutoMatchSummary | null;
  } | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [forecast, setForecast] = useState<ForecastSummary | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/trips/import");
      const data = await res.json();
      if (res.ok) {
        setHistory(Array.isArray(data.items) ? data.items : []);
        setForecast(data.forecast ?? null);
      }
    } catch {
      /* lo storico è un extra: la pagina resta utilizzabile */
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadHistory();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const openHistoryAnalytics = async (id: string) => {
    setAnalyticsLoading(true);
    setAnalytics(null);
    setError("");
    try {
      const res = await fetch(`/api/trips/import/${id}/analytics`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel caricamento dell'analisi.");
      setAnalytics(data.analytics ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const duplicates = useMemo(() => new Set(result?.duplicates ?? []), [result]);

  const selectableCodes = useMemo(
    () => (result?.lines ?? []).filter((line) => !duplicates.has(line.code)).map((line) => line.code),
    [result, duplicates]
  );

  const selectedLines = useMemo(
    () => (result?.lines ?? []).filter((line) => selected.has(line.code)),
    [result, selected]
  );
  const selectedTotal = selectedLines.reduce((sum, line) => sum + line.amount, 0);

  const handleUpload = async (fileUrl: string, fileName: string) => {
    setParsing(true);
    setError("");
    setResult(null);
    setImported(null);
    setAnalytics(null);
    setSelected(new Set());
    try {
      const res = await fetch("/api/trips/import/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl, fileName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nella lettura del PDF.");
      setResult(data);
      setSelected(new Set((data.lines as ParsedLine[]).filter((line) => !data.duplicates.includes(line.code)).map((line) => line.code)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setParsing(false);
    }
  };

  const toggle = (code: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((current) =>
      current.size === selectableCodes.length ? new Set() : new Set(selectableCodes)
    );
  };

  const confirmImport = async () => {
    if (!result || selected.size === 0) return;
    setImporting(true);
    setError("");
    try {
      const res = await fetch("/api/trips/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statementId: result.statement.id, codes: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nell'importazione.");
      setImported({
        imported: data.imported,
        skipped: data.skipped ?? [],
        autoMatch: data.autoMatch ?? null,
      });
      setSelected(new Set());
      setAnalyticsLoading(true);
      try {
        const analyticsRes = await fetch(`/api/trips/import/${result.statement.id}/analytics`);
        const analyticsData = await analyticsRes.json();
        if (analyticsRes.ok) setAnalytics(analyticsData.analytics ?? null);
      } catch {
        /* l'analisi è un extra: l'import è già andato a buon fine */
      } finally {
        setAnalyticsLoading(false);
      }
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/dashboard/trips"
            className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: "var(--text-label)" }}
          >
            <ArrowLeft className="h-3 w-3" /> Torna ai viaggi
          </Link>
          <p className="ops-label">Import automatico</p>
          <h1 className="ops-title mt-1 flex items-center gap-2 text-2xl">
            <FileText className="h-6 w-6" style={{ color: "var(--brand)" }} /> Importa rendiconto viaggi
          </h1>
          <p className="ops-subtitle mt-1 max-w-3xl text-[13px]">
            Carica il PDF del rendiconto periodico del provider (Energy Trucks, TAROS o simili):
            l&apos;ufficio legge codici, date, tratte, committenti e prezzi, poi crea i viaggi in blocco.
          </p>
        </div>
      </div>

      {error && (
        <div
          className="rounded-[12px] border p-3 text-[13px]"
          style={{ borderColor: "var(--danger)", color: "var(--danger)", background: "var(--surface)" }}
        >
          {error}
        </div>
      )}

      {forecast && forecast.monthsUsed > 0 && (
        <section className="ops-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="ops-label">Stima 12 mesi · si aggiorna a ogni rendiconto</p>
            <p className="font-display mt-1 text-2xl font-bold" style={{ color: "var(--text)" }}>
              {eur(forecast.projected12m)}
            </p>
            <p className="mt-1 max-w-2xl text-[11px]" style={{ color: "var(--text-label)" }}>
              {forecast.note}
            </p>
          </div>
          <span className="chip chip-brand">
            {forecast.monthsUsed} mes{forecast.monthsUsed === 1 ? "e" : "i"} · {forecast.confidence.toLowerCase()}
          </span>
        </section>
      )}

      <section className="ops-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4" style={{ borderColor: "var(--surface-border)" }}>
          <div>
            <p className="font-display text-[14px] font-bold" style={{ color: "var(--text)" }}>
              Rendiconti importati
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-label)" }}>
              Storico dei PDF caricati: riapri l&apos;analisi senza reimportare.
            </p>
          </div>
          <span className="chip chip-brand">{history.length}</span>
        </div>

        {historyLoading ? (
          <div className="flex items-center gap-2 p-6 text-[12px]" style={{ color: "var(--text-label)" }}>
            <Loader2 className="h-4 w-4 animate-spin" /> Caricamento storico…
          </div>
        ) : history.length === 0 ? (
          <p className="p-6 text-[12px]" style={{ color: "var(--text-label)" }}>
            Nessun rendiconto ancora importato. Carica il primo PDF qui sotto.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ops-table w-full text-left">
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Provider</th>
                  <th>Viaggi</th>
                  <th className="text-right">Totale</th>
                  <th>Stato</th>
                  <th className="text-right">Analisi</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap text-[12px]" style={{ color: "var(--text)" }}>
                      {item.periodStart && item.periodEnd
                        ? `${prettyDate(item.periodStart)} – ${prettyDate(item.periodEnd)}`
                        : item.fileName}
                    </td>
                    <td className="text-[12px]" style={{ color: "var(--text-soft)" }}>
                      {item.provider ?? "—"}
                      {item.parserMode === "AI" && (
                        <span className="ml-2 chip chip-brand" style={{ fontSize: 8 }}>AI</span>
                      )}
                    </td>
                    <td className="text-[12px]" style={{ color: "var(--text-soft)" }}>
                      {item.importedTrips}/{item.parsedTrips}
                    </td>
                    <td className="text-right font-mono text-[12px]" style={{ color: "var(--text)" }}>
                      {eur(item.parsedTotal)}
                    </td>
                    <td>
                      <span className={`chip ${item.status === "IMPORTED" ? "chip-success" : "chip-warning"}`} style={{ fontSize: 8 }}>
                        {item.status === "IMPORTED" ? "Importato" : "Bozza"}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => void openHistoryAnalytics(item.id)}
                        className="text-[11px] font-semibold"
                        style={{ color: "var(--brand)" }}
                      >
                        Apri analisi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {imported && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border p-4"
          style={{ borderColor: "var(--success)", background: "var(--surface)" }}
        >
          <div className="flex items-start gap-2 text-[13px]" style={{ color: "var(--success)" }}>
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">
                {imported.imported} viaggi creati
                {imported.skipped.length > 0 ? ` · ${imported.skipped.length} già presenti` : ""}
                {imported.autoMatch && imported.autoMatch.matchedVehicles > 0
                  ? ` · ${imported.autoMatch.matchedVehicles} collegati a Geotab`
                  : ""}
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-label)" }}>
                {imported.autoMatch && imported.autoMatch.matchedVehicles > 0
                  ? `${imported.autoMatch.matchedDrivers} autisti assegnati automaticamente. Controlla i mezzi proposti e assegna gli autisti mancanti dalla lista viaggi.`
                  : "Sono in stato “Da assegnare”: usa il pulsante Assegna dalla lista viaggi, con i consigli su mezzo e autista."}
              </p>
            </div>
          </div>
          <Link href="/dashboard/trips" className="ops-btn ops-btn--primary ops-btn--sm">
            Vai ai viaggi <Route className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {analyticsLoading && (
        <div className="ops-card flex items-center gap-2 p-4 text-[12px]" style={{ color: "var(--text-label)" }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Calcolo ricavi e incrocio con i dati Geotab…
        </div>
      )}

      {analytics && (
        <section className="space-y-3">
          <div>
            <p className="ops-label">Analisi</p>
            <h2 className="font-display text-[16px] font-bold" style={{ color: "var(--text)" }}>
              Ricavi e km reali
            </h2>
            <p className="text-[12px]" style={{ color: "var(--text-label)" }}>
              Incrocio tra rendiconto, viaggi assegnati e tracciati Geotab del periodo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard label="Ricavo rendiconto" value={eur(analytics.totalEarnings)} />
            <SummaryCard label="Media per viaggio" value={eur(analytics.avgPerTrip)} />
            <SummaryCard
              label={`Media per giorno attivo (${analytics.activeDays})`}
              value={eur(analytics.avgPerActiveDay)}
            />
            <SummaryCard
              label={`Stima 12 mesi (${analytics.forecast.monthsUsed} mes${analytics.forecast.monthsUsed === 1 ? "e" : "i"}, ${analytics.forecast.confidence.toLowerCase()})`}
              value={eur(analytics.forecast.projected12m)}
            />
          </div>
          <p className="text-[11px]" style={{ color: "var(--text-label)" }}>
            {analytics.forecast.note}
          </p>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="ops-card p-4">
              <p className="ops-label">Km Geotab nel periodo</p>
              <p className="font-display mt-1 text-xl font-bold" style={{ color: "var(--text)" }}>
                {km(analytics.geotab.totalKm)}
              </p>
              <div className="mt-3 space-y-1.5 text-[11px]">
                <AnalysisRow
                  label="Viaggi reali"
                  value={`${analytics.geotab.realTripCount} · ${km(analytics.geotab.realTripKm)}`}
                />
                <AnalysisRow
                  label="Spostamenti (micro-tragitti)"
                  value={`${analytics.geotab.movementCount} · ${km(analytics.geotab.movementKm)}`}
                />
                <AnalysisRow
                  label="Km a vuoto (stima)"
                  value={km(analytics.geotab.emptyKm)}
                  tone="var(--warning)"
                />
                <AnalysisRow
                  label="Viaggi a vuoto"
                  value={String(analytics.geotab.emptyTrips)}
                  tone="var(--warning)"
                />
                <AnalysisRow
                  label="Copertura match rendiconto"
                  value={`${analytics.geotab.coveragePct}%`}
                  tone={analytics.geotab.coveragePct >= 60 ? "var(--success)" : "var(--warning)"}
                />
              </div>
              {!analytics.geotab.available && (
                <p className="mt-3 text-[11px]" style={{ color: "var(--text-label)" }}>
                  Nessun tracciato Geotab nel periodo: sincronizza Geotab per calcolare km e viaggi a vuoto.
                </p>
              )}
              <p className="mt-3 text-[10px]" style={{ color: "var(--text-label-soft)" }}>
                Spostamenti = micro-tragitti sotto 3 km o 8 minuti. I km a vuoto sono i tracciati
                oltre 3 km o 8 minuti non collegati a un viaggio pagato: la stima diminuisce man
                mano che colleghi i viaggi.
              </p>
            </div>

            <div className="ops-card p-4">
              <p className="ops-label">Viaggi pagati di più</p>
              <div className="mt-2 space-y-1.5">
                {analytics.topTrips.map((trip) => (
                  <div key={trip.code} className="flex items-start justify-between gap-2 text-[11px]">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold" style={{ color: "var(--text)" }}>
                        {trip.code} · {trip.customer || "—"}
                      </span>
                      <span className="block truncate" style={{ color: "var(--text-label)" }}>
                        {trip.date} · {trip.description}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono font-semibold" style={{ color: "var(--success)" }}>
                      {eur(trip.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ops-card p-4">
              <p className="ops-label">Viaggi pagati di meno</p>
              <div className="mt-2 space-y-1.5">
                {analytics.bottomTrips.map((trip) => (
                  <div key={trip.code} className="flex items-start justify-between gap-2 text-[11px]">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold" style={{ color: "var(--text)" }}>
                        {trip.code} · {trip.customer || "—"}
                      </span>
                      <span className="block truncate" style={{ color: "var(--text-label)" }}>
                        {trip.date} · {trip.description}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono font-semibold" style={{ color: "var(--text)" }}>
                      {eur(trip.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {analytics.topRevenuePerKm.length > 0 && (
            <div className="ops-card p-4">
              <p className="ops-label">Resa €/km migliore (solo viaggi collegati a Geotab)</p>
              <div className="mt-2 grid gap-1.5 md:grid-cols-2">
                {analytics.topRevenuePerKm.map((row) => (
                  <div key={row.code} className="flex items-center justify-between gap-2 text-[11px]">
                    <span style={{ color: "var(--text-soft)" }}>
                      {row.code} · {row.km.toLocaleString("it-IT")} km
                    </span>
                    <span className="font-mono font-semibold" style={{ color: "var(--text)" }}>
                      {row.revenuePerKm.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/km
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analytics.warnings.map((warning) => (
            <p key={warning} className="text-[11px]" style={{ color: "var(--warning)" }}>
              {warning}
            </p>
          ))}
        </section>
      )}

      {!result && (
        <section className="ops-card p-6">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
            <span
              className="grid h-14 w-14 place-items-center rounded-full"
              style={{ background: "var(--surface-soft)", color: "var(--brand)" }}
            >
              <Upload className="h-7 w-7" />
            </span>
            <div>
              <p className="font-display text-[15px] font-bold" style={{ color: "var(--text)" }}>
                Carica il rendiconto in PDF
              </p>
              <p className="mt-1 text-[12px]" style={{ color: "var(--text-label)" }}>
                Il file resta privato. Prima di creare i viaggi vedi sempre l&apos;anteprima e puoi
                deselezionare le righe da non importare.
              </p>
            </div>
            <UploadButton
              endpoint="tripStatement"
              appearance={{
                button: "ops-btn ops-btn--primary",
                allowedContent: "text-[10px]",
              }}
              onClientUploadComplete={(res) => {
                const file = res[0];
                if (file) void handleUpload(file.url, file.name);
              }}
              onUploadError={(uploadError) => setError(uploadError.message)}
            />
            {parsing && (
              <p className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-label)" }}>
                <Loader2 className="h-4 w-4 animate-spin" /> Lettura del PDF e riconoscimento dei viaggi…
              </p>
            )}
            <div className="mt-2 grid gap-2 text-left text-[11px]" style={{ color: "var(--text-label)" }}>
              <p>1. Carica il PDF mensile del provider.</p>
              <p>2. Controlla codici, date, clienti e prezzi nell&apos;anteprima.</p>
              <p>3. Importa e assegna gli autisti con il pulsante rapido.</p>
            </div>
          </div>
        </section>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard
              label="Provider"
              value={`${result.statement.provider ?? "Rendiconto"}${result.statement.parserMode === "AI" ? " · letto con AI" : ""}`}
            />
            <SummaryCard
              label="Periodo"
              value={
                result.statement.periodStart && result.statement.periodEnd
                  ? `${prettyDate(result.statement.periodStart)} – ${prettyDate(result.statement.periodEnd)}`
                  : "—"
              }
            />
            <SummaryCard label="Viaggi nel PDF" value={String(result.lines.length)} />
            <SummaryCard label="Totale" value={eur(result.statement.parsedTotal)} />
          </div>

          {result.warnings.length > 0 && (
            <div
              className="rounded-[12px] border p-3 text-[12px]"
              style={{ borderColor: "var(--warning)", color: "var(--warning)", background: "var(--surface)" }}
            >
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" /> Controlla prima di importare
              </p>
              <ul className="mt-1 list-inside list-disc">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <section className="ops-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4" style={{ borderColor: "var(--surface-border)" }}>
              <div>
                <p className="font-display text-[14px] font-bold" style={{ color: "var(--text)" }}>
                  Anteprima viaggi
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-label)" }}>
                  {duplicates.size > 0
                    ? `${duplicates.size} righe già importate in precedenza, escluse automaticamente.`
                    : "Nessun duplicato: tutti i codici sono nuovi."}
                </p>
              </div>
              <button type="button" onClick={toggleAll} className="ops-btn ops-btn--secondary ops-btn--sm">
                {selected.size === selectableCodes.length ? "Deseleziona tutto" : "Seleziona tutto"}
              </button>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="ops-table w-full text-left">
                <thead>
                  <tr>
                    <th className="w-10">
                      <input
                        type="checkbox"
                        checked={selectableCodes.length > 0 && selected.size === selectableCodes.length}
                        onChange={toggleAll}
                        aria-label="Seleziona tutti i viaggi"
                      />
                    </th>
                    <th>Codice</th>
                    <th>Data</th>
                    <th>Tratta / descrizione</th>
                    <th>Committente</th>
                    <th className="text-right">Prezzo</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.map((line) => {
                    const isDuplicate = duplicates.has(line.code);
                    return (
                      <tr key={line.code} style={{ opacity: isDuplicate ? 0.5 : 1 }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.has(line.code)}
                            disabled={isDuplicate}
                            onChange={() => toggle(line.code)}
                            aria-label={`Seleziona ${line.code}`}
                          />
                        </td>
                        <td className="font-mono text-[12px]" style={{ color: "var(--text)" }}>{line.code}</td>
                        <td className="whitespace-nowrap text-[12px]" style={{ color: "var(--text-soft)" }}>
                          {prettyDate(line.date)}
                          <span className="block text-[10px]" style={{ color: "var(--text-label)" }}>{line.pickupTime}</span>
                        </td>
                        <td className="text-[12px]" style={{ color: "var(--text-soft)" }}>
                          {line.description}
                          {isDuplicate && (
                            <span className="ml-2 chip chip-warning" style={{ fontSize: 8 }}>già importato</span>
                          )}
                        </td>
                        <td className="text-[12px]" style={{ color: "var(--text-soft)" }}>{line.customer || "—"}</td>
                        <td className="text-right font-mono text-[12px] font-semibold" style={{ color: "var(--text)" }}>
                          {eur(line.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 p-3 md:hidden">
              {result.lines.map((line) => {
                const isDuplicate = duplicates.has(line.code);
                return (
                  <label
                    key={line.code}
                    className="flex items-start gap-2 rounded-[10px] border p-3"
                    style={{ borderColor: "var(--surface-border)", opacity: isDuplicate ? 0.5 : 1 }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(line.code)}
                      disabled={isDuplicate}
                      onChange={() => toggle(line.code)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px]" style={{ color: "var(--text)" }}>{line.code}</span>
                        <span className="font-mono text-[12px] font-semibold" style={{ color: "var(--text)" }}>{eur(line.amount)}</span>
                      </span>
                      <span className="mt-1 block text-[11px]" style={{ color: "var(--text-soft)" }}>{line.description}</span>
                      <span className="mt-1 block text-[10px]" style={{ color: "var(--text-label)" }}>
                        {prettyDate(line.date)} · {line.customer || "—"}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4" style={{ borderColor: "var(--surface-border)" }}>
              <div>
                <p className="text-[11px]" style={{ color: "var(--text-label)" }}>
                  {selected.size} viaggi selezionati
                </p>
                <p className="font-display text-[16px] font-bold" style={{ color: "var(--text)" }}>
                  {eur(selectedTotal)}
                </p>
              </div>
              <button
                type="button"
                onClick={confirmImport}
                disabled={importing || selected.size === 0}
                className="ops-btn ops-btn--primary"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Importa {selected.size} viaggi
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="ops-card p-4">
      <p className="ops-label">{label}</p>
      <p className="font-display mt-1 text-[16px] font-bold" style={{ color: "var(--text)" }}>{value}</p>
    </div>
  );
}

function km(value: number) {
  return `${Number(value).toLocaleString("it-IT", { maximumFractionDigits: 1 })} km`;
}

function AnalysisRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span style={{ color: "var(--text-label)" }}>{label}</span>
      <span className="font-mono font-semibold" style={{ color: tone ?? "var(--text)" }}>{value}</span>
    </div>
  );
}

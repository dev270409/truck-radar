import Link from "next/link";
import { Truck, MapPin, Route, ArrowRight, Navigation } from "lucide-react";
import type { FleetVehicleRow } from "@/lib/fleet";

const GREEN = "var(--success)";
const AMBER = "var(--warning)";
const INFO = "var(--info)";
const BRAND = "var(--brand)";

/**
 * Pannello operativo flotta (dati reali del tenant): mostra per ogni mezzo
 * stato, viaggio attivo e ultima posizione nota. Sostituisce la mappa
 * stilizzata con informazioni effettive dal tracking.
 */
export default function FleetOpsPanel({ rows }: { rows: FleetVehicleRow[] }) {
  const inViaggio = rows.filter((r) => r.tripStatus === "IN_CORSO").length;
  const conPosizione = rows.filter((r) => r.posizione || (r.lat != null && r.lng != null)).length;

  return (
    <div className="glass enter-up p-4 md:p-5" style={{ animationDelay: "120ms" }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-[15px] font-bold" style={{ color: "var(--text)" }}>
            Operativo flotta
          </h2>
          <p className="text-[11px]" style={{ color: "var(--text-label)" }}>
            {inViaggio} in viaggio · {conPosizione}/{rows.length} con posizione nota
          </p>
        </div>
        <Link
          href="/dashboard/flotta"
          className="inline-flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: BRAND }}
        >
          Apri mappa <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <div
          className="rounded-[var(--radius-base)] p-6 text-center text-[13px]"
          style={{ background: "var(--surface-soft)", border: "1px solid var(--glass-border)", color: "var(--text-soft)" }}
        >
          Nessun mezzo in flotta. Aggiungi i tuoi veicoli per vedere qui lo stato operativo.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {rows.slice(0, 6).map((r) => {
            const trip = r.tripStatus === "IN_CORSO";
            return (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-[var(--radius-base)] px-3 py-2.5"
                style={{ background: "var(--surface-soft)", border: "1px solid var(--glass-border)" }}
              >
                <span
                  className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[9px]"
                  style={{ background: `color-mix(in oklch, ${trip ? AMBER : GREEN} 14%, transparent)`, color: trip ? AMBER : GREEN }}
                >
                  <Truck className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[13px] font-bold" style={{ color: "var(--text)" }}>{r.targa}</span>
                    <span className="text-[11px]" style={{ color: "var(--text-label)" }}>{r.categoria}</span>
                  </div>
                  {(r.luogoRitiro || r.luogoConsegna) ? (
                    <p className="flex items-center gap-1 truncate text-[11px]" style={{ color: "var(--text-soft)" }}>
                      <Route className="h-3 w-3" style={{ color: INFO }} />
                      {r.luogoRitiro ?? "—"} <ArrowRight className="h-3 w-3" /> {r.luogoConsegna ?? "—"}
                      {r.driverNome ? ` · ${r.driverNome} ${r.driverCognome ?? ""}` : ""}
                    </p>
                  ) : (
                    <p className="text-[11px]" style={{ color: "var(--text-label-soft)" }}>Nessun viaggio attivo</p>
                  )}
                </div>
                <span className="hidden items-center gap-1 text-[11px] sm:flex" style={{ color: "var(--text-soft)" }}>
                  <MapPin className="h-3 w-3" style={{ color: BRAND }} />
                  {r.posizione ?? (r.lat != null ? `${r.lat.toFixed(2)}, ${r.lng?.toFixed(2)}` : "—")}
                </span>
                <span className={`chip ${trip ? "chip-warning" : "chip-success"}`}>
                  {trip ? "In viaggio" : r.status === "DISPONIBILE" ? "Disponibile" : r.status}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-label-soft)" }}>
        <Navigation className="h-3 w-3" /> Posizioni dal tracking dei viaggi (integrazione GPS/telematica).
      </p>
    </div>
  );
}
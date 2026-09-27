/**
 * Mappa operativa stilizzata (griglia strade fittizia + marker per stato +
 * rotte tratteggiate + etichette città italiane + legenda in vetro).
 * Componente puramente grafico: nessuna dipendenza da provider GPS.
 */
const markers = [
  { x: 26, y: 34, tone: "var(--brand)", label: "Torino" },
  { x: 44, y: 26, tone: "var(--brand)", label: "Milano" },
  { x: 62, y: 44, tone: "var(--accent)", label: "Bologna" },
  { x: 78, y: 66, tone: "var(--danger)", label: "Roma" },
  { x: 40, y: 72, tone: "var(--success)", label: "Genova" },
];

export default function OpsMap() {
  return (
    <div className="glass enter-up overflow-hidden p-4" style={{ animationDelay: "120ms" }}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display text-[15px] font-bold" style={{ color: "var(--text)" }}>
            Mappa operativa
          </h2>
          <p className="text-[11px]" style={{ color: "var(--text-label)" }}>
            Flotta live · aggiornamento continuo
          </p>
        </div>
        <span className="chip chip-success">
          <span className="pulse-dot" /> Live
        </span>
      </div>

      <div
        className="relative overflow-hidden rounded-[var(--radius-card)]"
        style={{
          background: "var(--map-bg)",
          border: "1px solid var(--glass-border)",
          aspectRatio: "16 / 10",
          backgroundImage:
            "linear-gradient(var(--map-grid) 1px, transparent 1px), linear-gradient(90deg, var(--map-grid) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <svg viewBox="0 0 100 62" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <path d="M26 22 L44 17 L62 29 L78 42" fill="none" stroke="var(--brand)" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.7" />
          <path d="M44 17 L40 46" fill="none" stroke="var(--info)" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.7" />
        </svg>

        {markers.map((m) => (
          <span
            key={m.label}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
          >
            <span
              className="grid h-[30px] w-[30px] place-items-center rounded-full"
              style={{ background: m.tone, boxShadow: "0 0 0 3px #fff" }}
            >
              <span className="h-2 w-2 rounded-full bg-white/90" />
            </span>
            <span
              className="absolute left-1/2 mt-1 -translate-x-1/2 whitespace-nowrap font-display text-[10px] font-bold"
              style={{ color: "var(--text)" }}
            >
              {m.label}
            </span>
          </span>
        ))}

        <div
          className="absolute bottom-3 left-3 flex items-center gap-3 rounded-[var(--radius-pill)] px-3 py-1.5"
          style={{ background: "var(--surface-strong)", backdropFilter: "blur(18px)", border: "1px solid var(--glass-border)" }}
        >
          {[
            { c: "var(--brand)", t: "In rotta" },
            { c: "var(--accent)", t: "In carico" },
            { c: "var(--danger)", t: "Fermo" },
            { c: "var(--success)", t: "Consegnato" },
          ].map((l) => (
            <span key={l.t} className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: "var(--text-soft)" }}>
              <span className="h-2 w-2 rounded-full" style={{ background: l.c }} />
              {l.t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
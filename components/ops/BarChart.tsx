/**
 * Grafico a barre per dati reali, senza valori sostitutivi o gradienti.
 * Dati passati dal server (nessuna libreria esterna). Se non ci sono dati
 * mostra uno stato vuoto reale, senza inventare valori.
 */
export default function BarChart({
  title,
  subtitle,
  data,
  emptyMessage = "Nessun dato da mostrare.",
}: {
  title: string;
  subtitle?: string;
  data: { label: string; value: number }[];
  emptyMessage?: string;
}) {
  const hasData = data.length > 0 && data.some((d) => d.value > 0);
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="ops-card p-4 md:p-5">
      <div className="mb-4">
        <h2 className="font-display text-[15px] font-semibold" style={{ color: "var(--text)" }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px]" style={{ color: "var(--text-label)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {!hasData ? (
        <div
          className="flex h-[150px] items-center justify-center rounded-[var(--radius-base)] text-center text-[12px]"
          style={{ background: "var(--surface-soft)", border: "1px dashed var(--glass-border)", color: "var(--text-label)" }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div
          className="flex h-[150px] items-end gap-2"
          role="img"
          aria-label={`Distribuzione dei mezzi per categoria: ${data.map((item) => `${item.label}, ${item.value}`).join("; ")}`}
        >
          {data.map((d) => (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-[4px]"
                  style={{
                    height: `${Math.max((d.value / max) * 100, 4)}%`,
                    background: "var(--brand)",
                    minHeight: 4,
                  }}
                  title={`${d.label}: ${d.value}`}
                />
              </div>
              <span className="text-[11px] font-medium" style={{ color: "var(--text-label)" }}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Grafico a barre verticali sottili con gradiente brand → azzurro cielo.
 * Dati passati dal server (nessuna libreria esterna).
 */
export default function BarChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle?: string;
  data: { label: string; value: number }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="glass enter-up p-4 md:p-5" style={{ animationDelay: "240ms" }}>
      <div className="mb-4">
        <h2 className="font-display text-[15px] font-bold" style={{ color: "var(--text)" }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px]" style={{ color: "var(--text-label)" }}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex h-[150px] items-end gap-2">
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-[4px] transition-all"
                style={{
                  height: `${Math.max((d.value / max) * 100, 4)}%`,
                  background: "linear-gradient(to top, var(--brand), var(--info))",
                  minHeight: 4,
                }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "var(--text-label-soft)" }}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
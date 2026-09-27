/**
 * Card metrica della console operativa (min-height 138px, icona 34px in tinta).
 */
export default function MetricCard({
  label,
  value,
  hint,
  tone,
  icon,
  delay = 0,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  tone: string;
  icon: React.ReactNode;
  delay?: number;
}) {
  return (
    <article className="glass enter-up p-4 md:p-5" style={{ minHeight: 138, animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="ops-label">{label}</p>
          <p className="font-display mt-2 text-[26px] font-bold leading-none tracking-tight" style={{ color: "var(--text)" }}>
            {value}
          </p>
          {hint && <div className="mt-2 text-[11px] font-semibold" style={{ color: tone }}>{hint}</div>}
        </div>
        <span
          className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[10px]"
          style={{ background: `color-mix(in oklch, ${tone} 13%, transparent)`, color: tone }}
        >
          {icon}
        </span>
      </div>
    </article>
  );
}
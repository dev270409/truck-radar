/**
 * Logo "truck-radar": quadrato brand con simbolo radar (archi + croce) e
 * puntino accent in alto a destra. Accanto il wordmark opzionale.
 */
export default function Logo({ size = 42, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="relative grid flex-shrink-0 place-items-center"
        style={{
          width: size,
          height: size,
          borderRadius: 11,
          background: "var(--brand)",
          boxShadow: "0 8px 22px color-mix(in oklch, var(--brand) 28%, transparent)",
        }}
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 12 L12 3.2" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
          <path d="M12 12 L19.4 16.4" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
          <path d="M12 12 L4.6 16.4" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
          <circle cx="12" cy="12" r="2.4" fill="white" />
          <path d="M12 4.6 a7.4 7.4 0 0 1 6.4 3.7" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
          <path d="M4.6 15.3 a7.4 7.4 0 0 0 6.4 4.1" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
        </svg>
        <span
          className="absolute"
          style={{ top: 5, right: 5, width: 7, height: 7, borderRadius: 999, background: "var(--accent)", boxShadow: "0 0 0 2px var(--brand)" }}
        />
      </span>
      {withWordmark && (
        <span className="font-display text-[17px] font-bold tracking-tight" style={{ color: "var(--text)" }}>
          truck-radar
        </span>
      )}
    </span>
  );
}
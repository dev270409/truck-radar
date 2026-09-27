"use client";

/**
 * Logo "Truck-Radar": wordmark geometrico in cui il trattino è il puntino
 * centrale di un radar (cerchi concentrici con spazi uguali). Il simbolo è
 * un radar costruito con anelli regolari. Usa i token semantici del tema.
 */
export default function Logo({
  size = 42,
  withWordmark = true,
  className = "",
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  const ink = "var(--text)";
  const brand = "var(--brand)";
  const accent = "var(--accent)";

  return (
    <span className={`flex items-center gap-2 ${className}`}>
      {/* Simbolo: radar a cerchi con spazi uguali */}
      <span
        className="relative grid flex-shrink-0 place-items-center"
        style={{
          width: size,
          height: size,
          borderRadius: 11,
          background: brand,
          boxShadow: "0 8px 22px color-mix(in oklch, var(--brand) 28%, transparent)",
        }}
      >
        <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 24 24" fill="none" aria-hidden>
          {/* anelli concentrici a spaziatura uguale */}
          <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1" opacity="0.35" />
          <circle cx="12" cy="12" r="6" stroke="white" strokeWidth="1" opacity="0.55" />
          <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1" opacity="0.8" />
          {/* raggio radar */}
          <path d="M12 12 L18.4 5.6" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
          {/* puntino centrale */}
          <circle cx="12" cy="12" r="1.5" fill="white" />
        </svg>
        <span
          className="absolute"
          style={{ top: 5, right: 5, width: 7, height: 7, borderRadius: 999, background: accent, boxShadow: "0 0 0 2px var(--brand)" }}
        />
      </span>

      {withWordmark && (
        <svg
          height={size * 0.5}
          viewBox="0 0 232 26"
          fill="none"
          aria-label="Truck-Radar"
          role="img"
          style={{ overflow: "visible" }}
        >
          {/* "Truck" in Space Grotesk via foreignObject-like text is unreliable;
              usiamo testo reale con font-display del tema. */}
          <text
            x="0"
            y="19"
            fill={ink}
            style={{ fontFamily: "var(--font-space-grotesk), system-ui, sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: "-0.5px" }}
          >
            Truck
          </text>
          {/* trattino = puntino centrale radar + anelli con spazi uguali */}
          <g transform="translate(74 12.5)">
            <circle cx="0" cy="0" r="1.9" fill={accent} />
            <circle cx="0" cy="0" r="4.6" stroke={brand} strokeWidth="0.9" opacity="0.45" />
            <circle cx="0" cy="0" r="7.4" stroke={brand} strokeWidth="0.9" opacity="0.28" />
          </g>
          <text
            x="88"
            y="19"
            fill={ink}
            style={{ fontFamily: "var(--font-space-grotesk), system-ui, sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: "-0.5px" }}
          >
            Radar
          </text>
        </svg>
      )}
    </span>
  );
}
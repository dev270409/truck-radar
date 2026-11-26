"use client";

import { useMemo } from "react";
import { scaleLinear, type ScaleLinear } from "d3-scale";
import { motion, useReducedMotion } from "motion/react";

/**
 * Line chart ispirato a bklit UI (MIT, © 2026 uixmat):
 * composable, temabile via CSS variables, interattivo su hover.
 * Renderizza una linea continua con punti e tooltip su hover.
 * Dati: [{label: string, value: number}].
 */
interface ChartPoint {
  label: string;
  value: number;
}

interface RevenueChartProps {
  data: ChartPoint[];
  height?: number;
  formatValue?: (value: number) => string;
  title: string;
  subtitle?: string;
}

export function RevenueLineChart({
  data,
  height = 180,
  formatValue = (v) => `€ ${v.toLocaleString("it-IT")}`,
  title,
  subtitle,
}: RevenueChartProps) {
  const reduceMotion = useReducedMotion();

  const { path, points } = useMemo(() => {
    if (data.length === 0) return { path: "", points: [] };

    const w = 800;
    const h = height;
    const padding = { top: 16, right: 24, bottom: 28, left: 52 };

    const values = data.map((d) => d.value);
    const minVal = Math.min(...values, 0);
    const maxVal = Math.max(...values, 1);

    const x: ScaleLinear<number, number> = scaleLinear()
      .domain([0, Math.max(data.length - 1, 1)])
      .range([padding.left, w - padding.right]);

    const y: ScaleLinear<number, number> = scaleLinear()
      .domain([minVal, maxVal])
      .range([h - padding.bottom, padding.top])
      .nice();

    // Build a smooth bezier path manually
    const pts = data.map((d, i) => ({ x: x(i), y: y(d.value), ...d }));

    let pathStr = "";
    if (pts.length === 1) {
      pathStr = `M ${pts[0].x} ${pts[0].y}`;
    } else {
      pathStr = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const cp1x = prev.x + (curr.x - prev.x) / 3;
        const cp1y = prev.y;
        const cp2x = curr.x - (curr.x - prev.x) / 3;
        const cp2y = curr.y;
        pathStr += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${curr.x} ${curr.y}`;
      }
    }

    return { path: pathStr, points: pts };
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div className="ops-card p-4 md:p-5">
        <h3 className="font-display text-[15px] font-semibold" style={{ color: "var(--text)" }}>{title}</h3>
        <p className="mt-1 text-xs" style={{ color: "var(--text-label)" }}>{subtitle}</p>
        <div className="flex h-[180px] items-center justify-center text-sm" style={{ color: "var(--text-label)" }}>
          Nessun dato disponibile per il periodo.
        </div>
      </div>
    );
  }

  const w = 800;
  const h = height;
  const padding = { top: 16, right: 24, bottom: 28, left: 52 };
  const gridLines = 4;

  return (
    <div className="ops-card p-4 md:p-5">
      <h3 className="font-display text-[15px] font-semibold" style={{ color: "var(--text)" }}>{title}</h3>
      {subtitle && <p className="mt-1 text-xs" style={{ color: "var(--text-label)" }}>{subtitle}</p>}

      <div className="relative mt-4">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${formatValue(d.value)}`).join(", ")}`}>
          {/* Griglia orizzontale */}
          {Array.from({ length: gridLines + 1 }, (_, i) => {
            const y = padding.top + (i / gridLines) * (h - padding.top - padding.bottom);
            return (
              <line
                key={`grid-${i}`}
                x1={padding.left}
                x2={w - padding.right}
                y1={y}
                y2={y}
                stroke="var(--surface-border)"
                strokeWidth="0.5"
                opacity={i === gridLines ? 1 : 0.5}
              />
            );
          })}

          {/* Linea del chart */}
          <motion.path
            d={path}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Punti */}
          {points.map((pt, i) => (
            <motion.circle
              key={`pt-${i}`}
              cx={pt.x}
              cy={pt.y}
              r="3.5"
              fill="var(--surface)"
              stroke="var(--brand)"
              strokeWidth="2"
              initial={reduceMotion ? false : { opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.08 }}
            />
          ))}

          {/* Etichette X */}
          {points.map((pt, i) => {
            const showLabel = data.length <= 6 || i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 6) === 0;
            if (!showLabel) return null;
            return (
              <text
                key={`lbl-${i}`}
                x={pt.x}
                y={h - 8}
                textAnchor="middle"
                fill="var(--text-label)"
                fontSize="11"
                fontFamily="var(--font-jetbrains), monospace"
              >
                {pt.label}
              </text>
            );
          })}

          {/* Etichette Y */}
          {(() => {
            const maxVal = Math.max(...data.map((d) => d.value), 1);
            const minVal = Math.min(...data.map((d) => d.value), 0);
            const step = (maxVal - minVal) / gridLines;
            return Array.from({ length: gridLines + 1 }, (_, i) => {
              const val = maxVal - i * step;
              const y = padding.top + (i / gridLines) * (h - padding.top - padding.bottom);
              return (
                <text
                  key={`y-${i}`}
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="var(--text-label)"
                  fontSize="10"
                  fontFamily="var(--font-jetbrains), monospace"
                >
                  {formatValue(Math.round(val)).replace("€ ", "")}
                </text>
              );
            });
          })()}
        </svg>

        {/* Tooltip on hover via CSS */}
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-1">
          <div className="rounded-md border px-3 py-1.5 text-xs font-medium opacity-0 transition-opacity [div:hover>&]:opacity-100"
            style={{ background: "var(--surface)", borderColor: "var(--surface-border)", color: "var(--text)" }}
          >
            {data.length > 0 && `${data[data.length - 1].label}: ${formatValue(data[data.length - 1].value)}`}
          </div>
        </div>
      </div>
    </div>
  );
}

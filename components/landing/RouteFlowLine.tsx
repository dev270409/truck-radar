"use client";

import { useEffect, useRef } from "react";

/**
 * Percorso SVG animato con Anime.js: la linea blu si disegna
 * dal rendiconto alla verifica all'assegnazione. Una sola animazione
 * al mount, niente loop. Con `prefers-reduced-motion` la linea è già completa.
 */
export function RouteFlowLine() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const path = svg.querySelector<SVGPathElement>(".route-flow-path");
      if (path) path.style.strokeDashoffset = "0";
      return;
    }

    const path = svg.querySelector<SVGPathElement>(".route-flow-path");
    if (!path) return;

    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;

    let cleanup: (() => void) | undefined;

    import("animejs").then((animeModule) => {
      const anime = (animeModule as Record<string, unknown>).default ?? animeModule;
      const animation = (anime as (opts: Record<string, unknown>) => unknown)({
        targets: path,
        strokeDashoffset: [length, 0],
        duration: 1400,
        easing: "cubicBezier(0.22, 1, 0.36, 1)",
        delay: 250,
        complete: () => {
          path.style.strokeDasharray = "none";
        },
      });
      cleanup = () => {
        if (animation && typeof (animation as { pause?: () => void }).pause === "function") {
          (animation as { pause: () => void }).pause();
        }
      };
    }).catch(() => {
      path.style.strokeDashoffset = "0";
      path.style.strokeDasharray = "none";
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1000 32"
      className="pointer-events-none absolute left-0 top-0 hidden h-8 w-full md:block"
      role="img"
      aria-label="Percorso dal rendiconto importato alla verifica dell'abbinamento e alla conferma del viaggio"
    >
      <path d="M166 16 H834" fill="none" stroke="var(--surface-border)" strokeWidth="2" />
      <path
        d="M166 16 H834"
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2"
        className="route-flow-path"
      />
    </svg>
  );
}

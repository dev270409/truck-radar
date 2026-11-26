"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Visualizzazione del piano di carico: un camion in sezione laterale
 * che si riempie di colli animati. Ogni collo scende, si posizione
 * e aggiorna i metri lineari. Quando il camion è pieno, riparte
 * e il ciclo ricomincia.
 *
 * Motion per React gestisce l'animazione dei colli (drop + settle).
 * Anime.js muove il camion (arrivo, partenza).
 */

interface CargoItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  label: string;
}

const TRUCK_LENGTH = 300;
const TRUCK_HEIGHT = 95;
const TRUCK_Y = 35;
const CARGO_AREA_START = 25;
const CARGO_AREA_LENGTH = 270;
const CARGO_AREA_BOTTOM = TRUCK_Y + TRUCK_HEIGHT - 10;

const CARGO_COLORS = [
  { fill: "var(--brand)", label: "Bancale 1,20 × 0,80" },
  { fill: "var(--accent)", label: "Cassa 0,60 × 0,50" },
  { fill: "var(--success)", label: "Big-bag 1,00 × 1,20" },
  { fill: "var(--info)", label: "Collo 0,80 × 0,60" },
  { fill: "var(--warning)", label: "Rotolo 0,50 × 0,50" },
  { fill: "var(--brand)", label: "Bancale 1,20 × 1,00" },
];

const TRUCK_STEPS = [
  { items: 2, meters: 2.0 },
  { items: 4, meters: 3.8 },
  { items: 6, meters: 5.2 },
];

export function TruckCargoVisual() {
  const reduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const truckRef = useRef<SVGGElement>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "driving" | "reset">("idle");
  const [visibleItems, setVisibleItems] = useState(0);
  const [metersUsed, setMetersUsed] = useState(0);
  const [cargoList, setCargoList] = useState<CargoItem[]>([]);

  // Genera la sequenza di colli da caricare
  const cargoSequence = useMemo(() => {
    const items: CargoItem[] = [];
    let x = CARGO_AREA_START + 5;
    let id = 0;
    for (const step of TRUCK_STEPS) {
      for (let i = 0; i < step.items; i++) {
        const config = CARGO_COLORS[id % CARGO_COLORS.length];
        const w = 38 + (id % 3) * 14;
        const h = 26 + (id % 2) * 16;
        items.push({
          id: `cargo-${id}`,
          x,
          y: CARGO_AREA_BOTTOM - h,
          w,
          h,
          color: config.fill,
          label: config.label,
        });
        x += w + 6;
        id++;
      }
    }
    return items;
  }, []);

  // Gestisce il ciclo: load items → drive → reset
  useEffect(() => {
    if (reduceMotion) {
      const timer = window.setTimeout(() => {
        setVisibleItems(cargoSequence.length);
        setMetersUsed(5.2);
        setPhase("loading");
        setCargoList(cargoSequence);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let running = true;

    const startCycle = () => {
      if (!running) return;
      setCargoList([]);
      setVisibleItems(0);
      setMetersUsed(0);
      setPhase("loading");

      // Camion entra in scena
      if (truckRef.current) {
        import("animejs").then(({ animate }) => {
          if (!running || !truckRef.current || typeof animate !== "function") return;
          animate(truckRef.current, {
            translateX: [80, 0],
            opacity: [0, 1],
            duration: 800,
            easing: "cubicBezier(0.22, 1, 0.36, 1)",
          });
        }).catch(() => {});
      }

      // Aggiunge un collo ogni 600ms
      cargoSequence.forEach((cargo, index) => {
        timeouts.push(
          setTimeout(() => {
            if (!running) return;
            setVisibleItems(index + 1);
            setCargoList(cargoSequence.slice(0, index + 1));
            const stepIndex = TRUCK_STEPS.findIndex(
              (s) => index + 1 <= s.items
            );
            if (stepIndex >= 0) {
              setMetersUsed(TRUCK_STEPS[stepIndex].meters);
            }
          }, 500 + index * 600)
        );
      });

      // Camion pieno → attende → riparte → reset
      const totalLoadTime = 500 + cargoSequence.length * 600;
      timeouts.push(
        setTimeout(() => {
          if (!running) return;
          setPhase("driving");

          if (truckRef.current) {
            import("animejs").then(({ animate }) => {
              if (!running || !truckRef.current || typeof animate !== "function") {
                if (running) timeouts.push(setTimeout(startCycle, 500));
                return;
              }
              animate(truckRef.current, {
                translateX: [0, -400],
                opacity: [1, 0],
                duration: 1200,
                easing: "cubicBezier(0.45, 0, 0.55, 1)",
                complete: () => {
                  if (running) {
                    setPhase("reset");
                    timeouts.push(setTimeout(startCycle, 300));
                  }
                },
              });
            }).catch(() => {
              if (running) {
                timeouts.push(setTimeout(startCycle, 500));
              }
            });
          } else {
            timeouts.push(setTimeout(startCycle, 500));
          }
        }, totalLoadTime + 400)
      );
    };

    startCycle();

    return () => {
      running = false;
      timeouts.forEach(clearTimeout);
    };
  }, [cargoSequence, reduceMotion]);

  const maxMeters = 7.5;
  const progressPct = Math.min((metersUsed / maxMeters) * 100, 100);
  const isFull = metersUsed >= 5.0;

  return (
    <div
      className="relative w-full"
      role="img"
      aria-label={`Piano di carico animato: camion che si carica con ${cargoSequence.length} colli per ${maxMeters} metri lineari`}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 400 160"
        className="w-full"
        style={{ maxHeight: 220 }}
      >
        {/* Suolo */}
        <line x1="0" y1={TRUCK_Y + TRUCK_HEIGHT + 10} x2="400" y2={TRUCK_Y + TRUCK_HEIGHT + 10} stroke="var(--surface-border)" strokeWidth="1" />

        {/* Camion (gruppo animato con Anime.js) */}
        <g ref={truckRef}>
          {/* Rimorchio */}
          <rect
            x={20}
            y={TRUCK_Y}
            width={TRUCK_LENGTH}
            height={TRUCK_HEIGHT}
            rx="6"
            fill="var(--surface-soft)"
            stroke="var(--surface-border)"
            strokeWidth="1.5"
          />

          {/* Linea interno carico */}
          <line
            x1={CARGO_AREA_START}
            y1={TRUCK_Y + 8}
            x2={CARGO_AREA_START}
            y2={CARGO_AREA_BOTTOM}
            stroke="var(--surface-border)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Cabina */}
          <rect
            x={TRUCK_LENGTH + 28}
            y={TRUCK_Y + 12}
            width={55}
            height={TRUCK_HEIGHT - 12}
            rx="8"
            fill="var(--brand)"
          />
          {/* Finestra cabina */}
          <rect
            x={TRUCK_LENGTH + 36}
            y={TRUCK_Y + 20}
            width={32}
            height={22}
            rx="4"
            fill="var(--surface-strong)"
            opacity="0.85"
          />

          {/* Ruote */}
          <circle cx={60} cy={TRUCK_Y + TRUCK_HEIGHT + 5} r="10" fill="var(--text-label)" />
          <circle cx={90} cy={TRUCK_Y + TRUCK_HEIGHT + 5} r="10" fill="var(--text-label)" />
          <circle cx={TRUCK_LENGTH + 45} cy={TRUCK_Y + TRUCK_HEIGHT + 5} r="10" fill="var(--text-label)" />
          <circle cx={TRUCK_LENGTH + 65} cy={TRUCK_Y + TRUCK_HEIGHT + 5} r="10" fill="var(--text-label)" />
        </g>

        {/* Colli animati con Motion */}
        {cargoList.map((cargo, index) => (
          <motion.g
            key={cargo.id}
            initial={reduceMotion ? false : {
              y: -60,
              opacity: 0,
              scale: 0.8,
            }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 0.45,
              ease: [0.22, 1, 0.36, 1],
              delay: index === visibleItems - 1 ? 0 : 0,
            }}
          >
            <rect
              x={cargo.x}
              y={cargo.y}
              width={cargo.w}
              height={cargo.h}
              rx="3"
              fill={cargo.color}
              opacity="0.85"
              stroke="var(--surface-strong)"
              strokeWidth="1"
            />
            {/* Etichetta del collo */}
            <text
              x={cargo.x + cargo.w / 2}
              y={cargo.y + cargo.h / 2 + 3}
              textAnchor="middle"
              fontSize="7"
              fill="var(--surface-strong)"
              fontFamily="var(--font-jetbrains), monospace"
            >
              {(cargo.w / 50).toFixed(1)}m
            </text>
          </motion.g>
        ))}

        {/* Indicatore metri lineari */}
        <g transform={`translate(0, ${TRUCK_Y + TRUCK_HEIGHT + 20})`}>
          <rect x={20} y={0} width={CARGO_AREA_LENGTH} height={4} rx="2" fill="var(--surface-soft)" />
          <motion.rect
            x={20}
            y={0}
            height={4}
            rx="2"
            fill={isFull ? "var(--success)" : "var(--brand)"}
            animate={{ width: (progressPct / 100) * CARGO_AREA_LENGTH }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
          <text
            x={20}
            y={16}
            fontSize="10"
            fill="var(--text-label)"
            fontFamily="var(--font-jetbrains), monospace"
          >
            {metersUsed.toFixed(1)} / {maxMeters} m lineari
          </text>
          <text
            x={CARGO_AREA_LENGTH + 30}
            y={16}
            fontSize="10"
            fill={isFull ? "var(--success)" : "var(--text-label)"}
            fontFamily="var(--font-jetbrains), monospace"
            fontWeight="600"
          >
            {isFull ? "Ci sta" : `${visibleItems} colli`}
          </text>
        </g>
      </svg>

      {/* Stato */}
      <div className="mt-2 flex items-center justify-between text-[11px]" style={{ color: "var(--text-label)" }}>
        <span className="font-mono">
          {phase === "loading" && "Caricamento in corso…"}
          {phase === "driving" && "Carico completato, in partenza…"}
          {phase === "reset" && "Nuovo carico…"}
          {phase === "idle" && "Preparazione…"}
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-medium"
          style={{
            background: isFull ? "color-mix(in oklab, var(--success) 12%, transparent)" : "color-mix(in oklab, var(--brand) 10%, transparent)",
            color: isFull ? "var(--success)" : "var(--brand)",
          }}
        >
          {isFull ? "Ci sta" : "Piano di carico"}
        </span>
      </div>
    </div>
  );
}

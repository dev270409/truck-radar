"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";

/**
 * Camion animato con carico che si riempie — il momento visivo della landing.
 * Motion gestisce il drop spring-physics dei colli.
 * Anime.js muove il camion (arrivo con easing, partenza quando pieno).
 * Ogni collo è disegnato con dettagli reali: pallet con listelli, casse con cinghie.
 */

interface CargoItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: "pallet" | "crate" | "bag" | "roll";
  color: string;
  meters: number;
}

const VIEWBOX_W = 480;
const VIEWBOX_H = 180;

// Camion: cabina a destra, rimorchio al centro
const TRAILER_X = 15;
const TRAILER_W = 330;
const TRAILER_Y = 30;
const TRAILER_H = 105;
const CAB_X = TRAILER_X + TRAILER_W + 12;
const CAB_W = 70;
const CAB_Y = 38;
const CAB_H = 97;
const FLOOR_Y = TRAILER_Y + TRAILER_H - 12; // dove poggiano i colli
const GROUND_Y = 155;

const MAX_METERS = 7.5;

const CARGO_PLAN: Array<Omit<CargoItem, "id" | "x" | "y">> = [
  { w: 52, h: 38, type: "pallet", color: "var(--brand)", meters: 1.2 },
  { w: 42, h: 30, type: "crate", color: "var(--accent)", meters: 0.8 },
  { w: 58, h: 52, type: "bag", color: "var(--success)", meters: 1.2 },
  { w: 48, h: 36, type: "pallet", color: "var(--brand)", meters: 1.0 },
  { w: 36, h: 28, type: "roll", color: "var(--info)", meters: 0.7 },
  { w: 50, h: 40, type: "crate", color: "var(--accent)", meters: 1.0 },
  { w: 44, h: 55, type: "bag", color: "var(--success)", meters: 0.9 },
];

function buildCargoSequence(): CargoItem[] {
  const items: CargoItem[] = [];
  const scale = 0.84;
  let x = TRAILER_X + 8;
  CARGO_PLAN.forEach((plan, index) => {
    const w = Math.round(plan.w * scale);
    items.push({
      ...plan,
      w,
      id: `cargo-${index}`,
      x,
      y: FLOOR_Y - plan.h,
    });
    x += w + 4;
  });
  return items;
}

function CargoGlyph({ item }: { item: CargoItem }) {
  const { type, w, h, color, x, y } = item;
  switch (type) {
    case "pallet":
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx="3" fill={color} opacity="0.9" />
          {/* Listelli del pallet */}
          {[0.2, 0.45, 0.7].map((frac) => (
            <line
              key={frac}
              x1={x + 3} y1={y + h * frac}
              x2={x + w - 3} y2={y + h * frac}
              stroke="var(--surface-strong)" strokeWidth="1" opacity="0.3"
            />
          ))}
          {/* Piedini */}
          <rect x={x + 2} y={y + h - 4} width={8} height={4} fill="var(--text-label)" opacity="0.5" />
          <rect x={x + w - 10} y={y + h - 4} width={8} height={4} fill="var(--text-label)" opacity="0.5" />
        </g>
      );
    case "crate":
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx="2" fill={color} opacity="0.85" />
          {/* Cinghia */}
          <line x1={x + w * 0.35} y1={y} x2={x + w * 0.35} y2={y + h} stroke="var(--surface-strong)" strokeWidth="2" opacity="0.4" />
          {/* Spigolo */}
          <rect x={x} y={y} width={w} height={3} fill="var(--surface-strong)" opacity="0.25" />
        </g>
      );
    case "bag":
      return (
        <g>
          {/* Big-bag: forma arrotondata con fondo pieno */}
          <path
            d={`M ${x} ${y + h} L ${x} ${y + h * 0.3} Q ${x} ${y} ${x + w / 2} ${y} Q ${x + w} ${y} ${x + w} ${y + h * 0.3} L ${x + w} ${y + h} Z`}
            fill={color}
            opacity="0.85"
            rx="4"
          />
          {/* Cicche di sollevamento */}
          <line x1={x + w * 0.3} y1={y} x2={x + w * 0.3} y2={y - 6} stroke={color} strokeWidth="2" />
          <line x1={x + w * 0.7} y1={y} x2={x + w * 0.7} y2={y - 6} stroke={color} strokeWidth="2" />
        </g>
      );
    case "roll":
      return (
        <g>
          {/* Rotolo: cerchio con ombra */}
          <circle cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) / 2 - 1} fill={color} opacity="0.85" />
          <circle cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) / 4} fill="none" stroke="var(--surface-strong)" strokeWidth="1.5" opacity="0.35" />
        </g>
      );
  }
}

const CARGO_SEQUENCE: CargoItem[] = buildCargoSequence();

export function TruckCargoVisual() {
  const reduceMotion = useReducedMotion();
  const truckRef = useRef<SVGGElement>(null);
  // Prima impressione: il camion è già carico. Il ciclo parte dopo qualche secondo.
  const [phase, setPhase] = useState<"ready" | "arriving" | "loading" | "departing" | "idle">("ready");
  const [cycle, setCycle] = useState(0);
  const [cargoIndex, setCargoIndex] = useState(CARGO_SEQUENCE.length);
  const [cargoList, setCargoList] = useState<CargoItem[]>(CARGO_SEQUENCE);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const metersUsed = cargoList.reduce((sum, c) => sum + c.meters, 0);
  const isFull = metersUsed >= 5.0;

  useEffect(() => {
    if (reduceMotion) return;

    let running = true;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    timeoutsRef.current = timeouts;

    const reset = () => {
      setCargoList([]);
      setCargoIndex(0);
      setCycle((c) => c + 1);
      setPhase("idle");
    };

    const loadNext = (index: number) => {
      if (!running || index >= CARGO_SEQUENCE.length) {
        // Camion pieno → parte
        timeouts.push(
          setTimeout(() => {
            if (!running) return;
            setPhase("departing");
            import("animejs").then(({ animate }) => {
              if (!running || !truckRef.current || !animate) return;
              animate(truckRef.current, {
                translateX: [0, -500],
                opacity: [1, 0],
                duration: 1600,
                ease: "inOutQuad",
                complete: () => {
                  if (!running) return;
                  reset();
                  timeouts.push(setTimeout(() => startCycle(), 600));
                },
              });
            }).catch(() => {
              if (!running) return;
              reset();
              timeouts.push(setTimeout(() => startCycle(), 600));
            });
          }, 800)
        );
        return;
      }

      // Aggiunge il collo
      setCargoIndex(index + 1);
      setCargoList(CARGO_SEQUENCE.slice(0, index + 1));

      // Prossimo collo dopo un intervallo variabile
      const delay = 500 + Math.random() * 300;
      timeouts.push(setTimeout(() => loadNext(index + 1), delay));
    };

    const startCycle = () => {
      if (!running) return;
      setPhase("arriving");

      // Camion entra in scena con Anime.js
      import("animejs").then(({ animate }) => {
        if (!running || !truckRef.current || !animate) return;
        animate(truckRef.current, {
          translateX: [120, 0],
          opacity: [0, 1],
          duration: 900,
          ease: "outCubic",
          complete: () => {
            if (!running) return;
            setPhase("loading");
            timeouts.push(setTimeout(() => loadNext(0), 300));
          },
        });
      }).catch(() => {
        if (!running) return;
        setPhase("loading");
        timeouts.push(setTimeout(() => loadNext(0), 300));
      });
    };

    // Lascia vedere il carico pieno per qualche secondo, poi parte.
    timeouts.push(setTimeout(() => loadNext(CARGO_SEQUENCE.length), 2600));

    return () => {
      running = false;
      timeouts.forEach(clearTimeout);
    };
  }, [reduceMotion]);

  return (
    <div
      className="relative w-full min-w-0"
      role="img"
      aria-label="Camion che si carica di colli: un esempio del piano di carico"
    >
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className="block w-full max-w-full"
        style={{ maxHeight: 240 }}
      >
        <defs>
          {/* Ombra ellittica sotto il camion */}
          <radialGradient id="truck-shadow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="var(--text-label)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--text-label)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Suolo */}
        <line x1="0" y1={GROUND_Y} x2={VIEWBOX_W} y2={GROUND_Y} stroke="var(--surface-border)" strokeWidth="1" />

        {/* Camion (gruppo animato con Anime.js) */}
        <g ref={truckRef}>
          {/* Ombra a terra */}
          <ellipse cx={VIEWBOX_W / 2} cy={GROUND_Y} rx={CAB_X + CAB_W - TRAILER_X + 20} ry="6" fill="url(#truck-shadow)" />

          {/* Rimorchio */}
          <rect x={TRAILER_X} y={TRAILER_Y} width={TRAILER_W} height={TRAILER_H} rx="4"
            fill="var(--surface)" stroke="var(--surface-border)" strokeWidth="1.5" />
          {/* Linea tetto rimorchio */}
          <line x1={TRAILER_X + 2} y1={TRAILER_Y + 3} x2={TRAILER_X + TRAILER_W - 2} y2={TRAILER_Y + 3}
            stroke="var(--surface-strong)" strokeWidth="1" opacity="0.5" />
          {/* Porta posteriore */}
          <rect x={TRAILER_X + 2} y={TRAILER_Y + 12} width="4" height={TRAILER_H - 24}
            fill="var(--surface-border)" opacity="0.5" />
          {/* Fascia rifrangente */}
          <rect x={TRAILER_X + 4} y={TRAILER_Y + TRAILER_H - 14} width={TRAILER_W - 8} height="3" rx="1.5"
            fill="var(--warning)" opacity="0.3" />

          {/* Cabina */}
          <path
            d={`M ${CAB_X} ${CAB_Y + CAB_H} L ${CAB_X} ${CAB_Y + 20} Q ${CAB_X} ${CAB_Y} ${CAB_X + 25} ${CAB_Y - 5} Q ${CAB_X + 40} ${CAB_Y - 8} ${CAB_X + 50} ${CAB_Y + 8} L ${CAB_X + CAB_W} ${CAB_Y + 18} L ${CAB_X + CAB_W} ${CAB_Y + CAB_H} Z`}
            fill="var(--brand)"
            rx="4"
          />
          {/* Finestra cabina */}
          <path
            d={`M ${CAB_X + 8} ${CAB_Y + 16} L ${CAB_X + 8} ${CAB_Y + 6} Q ${CAB_X + 8} ${CAB_Y + 2} ${CAB_X + 22} ${CAB_Y} Q ${CAB_X + 35} ${CAB_Y - 2} ${CAB_X + 42} ${CAB_Y + 6} L ${CAB_X + 42} ${CAB_Y + 16} Z`}
            fill="var(--surface-strong)" opacity="0.9"
          />
          {/* Fari */}
          <circle cx={CAB_X + CAB_W - 4} cy={CAB_Y + CAB_H - 20} r="4" fill="var(--warning)" opacity="0.6" />

          {/* Ruote rimorchio */}
          {[
            { cx: TRAILER_X + 40, cy: GROUND_Y - 10 },
            { cx: TRAILER_X + 65, cy: GROUND_Y - 10 },
            { cx: TRAILER_X + 90, cy: GROUND_Y - 10 },
            { cx: CAB_X + 20, cy: GROUND_Y - 10 },
            { cx: CAB_X + 48, cy: GROUND_Y - 10 },
          ].map((wheel, i) => (
            <g key={`wheel-${i}`}>
              <circle cx={wheel.cx} cy={wheel.cy} r="11" fill="var(--text)" opacity="0.8" />
              <circle cx={wheel.cx} cy={wheel.cy} r="5" fill="var(--surface)" opacity="0.6" />
              {/* Battistrada */}
              {[0, 1, 2, 3, 4].map((spoke) => (
                <line
                  key={spoke}
                  x1={wheel.cx + Math.cos((spoke * Math.PI) / 2.5) * 4}
                  y1={wheel.cy + Math.sin((spoke * Math.PI) / 2.5) * 4}
                  x2={wheel.cx + Math.cos((spoke * Math.PI) / 2.5) * 9}
                  y2={wheel.cy + Math.sin((spoke * Math.PI) / 2.5) * 9}
                  stroke="var(--surface)" strokeWidth="1" opacity="0.3"
                />
              ))}
            </g>
          ))}

          {/* Colli animati con Motion — spring physics */}
          <AnimatePresence>
            {cargoList.map((item) => (
              <motion.g
                key={item.id}
                initial={
                  reduceMotion || cycle === 0
                    ? false
                    : { y: -80, opacity: 0, scale: 0.7, rotate: 3 }
                }
                animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 22,
                  mass: 0.8,
                }}
              >
                <CargoGlyph item={item} />
                {/* Etichetta metri */}
                <text
                  x={item.x + item.w / 2}
                  y={item.y + item.h / 2 + 3}
                  textAnchor="middle"
                  fontSize="8"
                  fill="var(--surface-strong)"
                  fontFamily="var(--font-jetbrains), monospace"
                  fontWeight="600"
                >
                  {item.meters.toFixed(1)}m
                </text>
              </motion.g>
            ))}
          </AnimatePresence>
        </g>

        {/* Indicatore metri lineari — fuori dal gruppo camion */}
        <g transform={`translate(0, ${GROUND_Y + 8})`}>
          <rect x={TRAILER_X} y={0} width={TRAILER_W} height={5} rx="2.5"
            fill="var(--surface-soft)" />
          <motion.rect
            x={TRAILER_X}
            y={0}
            height={5}
            rx="2.5"
            fill={isFull ? "var(--success)" : "var(--brand)"}
            initial={false}
            animate={{ width: Math.max((metersUsed / MAX_METERS) * TRAILER_W, 0) }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
          <text
            x={TRAILER_X}
            y={18}
            fontSize="11"
            fill="var(--text-label)"
            fontFamily="var(--font-jetbrains), monospace"
          >
            {metersUsed.toFixed(1)} / {MAX_METERS} m lineari
          </text>
          <text
            x={TRAILER_X + TRAILER_W + 15}
            y={18}
            fontSize="11"
            fill={isFull ? "var(--success)" : "var(--text-label)"}
            fontFamily="var(--font-jetbrains), monospace"
            fontWeight="600"
          >
            {isFull ? "Ci sta" : `${cargoIndex} colli`}
          </text>
        </g>
      </svg>

      {/* Stato operativo */}
      <div
        className="mt-3 flex items-center justify-between font-mono text-[11px]"
        style={{ color: "var(--text-label)" }}
      >
        <span>
          {phase === "ready" && "Carico completo · pronto alla partenza"}
          {phase === "arriving" && "Mezzo in arrivo…"}
          {phase === "loading" && "Caricamento in corso…"}
          {phase === "departing" && "Carico completato · in partenza"}
          {phase === "idle" && "In attesa del mezzo…"}
        </span>
        <span
          className="rounded-md px-2 py-0.5 font-semibold"
          style={{
            background: isFull
              ? "color-mix(in oklab, var(--success) 12%, transparent)"
              : "color-mix(in oklab, var(--brand) 10%, transparent)",
            color: isFull ? "var(--success)" : "var(--brand)",
          }}
        >
          {isFull ? "Piano completato" : "Piano di carico"}
        </span>
      </div>
    </div>
  );
}

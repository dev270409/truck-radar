"use client";

/**
 * @source: Kokonut UI (MIT) — https://github.com/kokonut-labs/kokonutui
 * @author: @dorianbaffier
 * @component: Hold Button (BT-05)
 * @version: 2.0.0
 *
 * Press and hold to confirm. The fill tracks the hold, drains back on
 * early release, and rolls into a drawn checkmark on completion.
 * Accidental clicks cannot trigger the action.
 */

import { cva, type VariantProps } from "class-variance-authority";
import {
  ArchiveIcon,
  BanIcon,
  LogOutIcon,
  type LucideIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import {
  AnimatePresence,
  type AnimationPlaybackControls,
  animate,
  MotionConfig,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

const holdButtonVariants = cva(
  [
    "group/hold relative inline-flex h-10 min-w-44 touch-none select-none items-center justify-center overflow-hidden rounded-lg px-4 font-medium text-sm",
    "border [-webkit-touch-callout:none]",
    "transition-[background-color,border-color,color] duration-150 ease-out",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        red: [
          "border-red-200 bg-red-50 text-red-700 hover:bg-red-100/70",
          "dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15",
          "data-complete:border-red-600 data-complete:bg-red-600 data-complete:text-white",
          "dark:data-complete:border-red-500 dark:data-complete:bg-red-500 dark:data-complete:text-white",
        ],
        green: [
          "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70",
          "dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15",
          "data-complete:border-emerald-600 data-complete:bg-emerald-600 data-complete:text-white",
          "dark:data-complete:border-emerald-500 dark:data-complete:bg-emerald-500 dark:data-complete:text-white",
        ],
        blue: [
          "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100/70",
          "dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/15",
          "data-complete:border-blue-600 data-complete:bg-blue-600 data-complete:text-white",
          "dark:data-complete:border-blue-500 dark:data-complete:bg-blue-500 dark:data-complete:text-white",
        ],
        orange: [
          "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100/70",
          "dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/15",
          "data-complete:border-orange-600 data-complete:bg-orange-600 data-complete:text-white",
          "dark:data-complete:border-orange-500 dark:data-complete:bg-orange-500 dark:data-complete:text-white",
        ],
        grey: [
          "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100/70",
          "dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/8",
          "data-complete:border-zinc-900 data-complete:bg-zinc-900 data-complete:text-white",
          "dark:data-complete:border-zinc-100 dark:data-complete:bg-zinc-100 dark:data-complete:text-zinc-900",
        ],
      },
    },
    defaultVariants: {
      variant: "red",
    },
  }
);

type Variant = NonNullable<VariantProps<typeof holdButtonVariants>["variant"]>;

const VARIANT_DEFAULTS: Record<
  Variant,
  { icon: LucideIcon; label: string; completeLabel: string }
> = {
  red: { icon: Trash2Icon, label: "Tieni premuto per eliminare", completeLabel: "Eliminato" },
  green: { icon: ArchiveIcon, label: "Tieni premuto per archiviare", completeLabel: "Archiviato" },
  blue: { icon: SendIcon, label: "Tieni premuto per inviare", completeLabel: "Inviato" },
  orange: { icon: LogOutIcon, label: "Tieni premuto per uscire", completeLabel: "Uscito" },
  grey: { icon: BanIcon, label: "Tieni premuto per bloccare", completeLabel: "Bloccato" },
};

interface HoldButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof holdButtonVariants> {
  children?: ReactNode;
  holdDuration?: number;
  holdingLabel?: ReactNode;
  completeLabel?: ReactNode;
  resetAfter?: number;
  onHoldComplete?: () => void;
}

type Phase = "idle" | "holding" | "complete";

const HOLD_KEYS = new Set([" ", "Enter"]);
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const LABEL_TRANSITION = { duration: 0.2, ease: EASE_OUT };
const DRAIN_MS = 300;
const LABEL_DELAY_MS = 150;

function DrawnCheck() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 16 16">
      <motion.path
        animate={{ pathLength: 1 }}
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        initial={{ pathLength: 0 }}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        transition={{ duration: 0.3, delay: 0.1, ease: EASE_OUT }}
      />
    </svg>
  );
}

export default function HoldButton({
  className,
  variant = "red",
  holdDuration = 1200,
  holdingLabel = "Continua a tenere premuto",
  completeLabel,
  resetAfter = 1800,
  onHoldComplete,
  children,
  type = "button",
  disabled,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...props
}: HoldButtonProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [showHoldingLabel, setShowHoldingLabel] = useState(false);
  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const progress = useMotionValue(0);
  const animationRef = useRef<AnimationPlaybackControls | null>(null);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onHoldCompleteRef = useRef(onHoldComplete);
  const shouldReduceMotion = useReducedMotion();
  const clipPath = useTransform(
    progress,
    (p) => `inset(0 ${(1 - p) * 100}% 0 0)`
  );

  const defaults = VARIANT_DEFAULTS[variant ?? "red"];
  const Icon = defaults.icon;

  useEffect(() => {
    onHoldCompleteRef.current = onHoldComplete;
  }, [onHoldComplete]);

  useEffect(
    () => () => {
      animationRef.current?.stop();
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
      if (resetRef.current) clearTimeout(resetRef.current);
    },
    []
  );

  const updatePhase = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
    if (labelTimerRef.current) {
      clearTimeout(labelTimerRef.current);
      labelTimerRef.current = null;
    }
    if (next === "holding") {
      labelTimerRef.current = setTimeout(
        () => setShowHoldingLabel(true),
        LABEL_DELAY_MS
      );
    } else {
      setShowHoldingLabel(false);
    }
  };

  const complete = () => {
    updatePhase("complete");
    onHoldCompleteRef.current?.();
    if (resetAfter > 0) {
      resetRef.current = setTimeout(() => {
        resetRef.current = null;
        progress.set(0);
        updatePhase("idle");
      }, resetAfter);
    }
  };

  const startHold = () => {
    if (phaseRef.current !== "idle" || disabled) return;
    updatePhase("holding");
    animationRef.current?.stop();
    const remaining = (1 - progress.get()) * holdDuration;
    animationRef.current = animate(progress, 1, {
      duration: remaining / 1000,
      ease: "linear",
      onComplete: () => {
        if (phaseRef.current === "holding") complete();
      },
    });
  };

  const endHold = () => {
    if (phaseRef.current !== "holding") return;
    updatePhase("idle");
    animationRef.current?.stop();
    animationRef.current = animate(progress, 0, {
      duration: shouldReduceMotion ? 0 : (progress.get() * DRAIN_MS) / 1000,
      ease: EASE_OUT,
    });
  };

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    onPointerDown?.(e);
    if (e.button !== 0) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    startHold();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (HOLD_KEYS.has(e.key)) {
      e.preventDefault();
      if (!e.repeat) startHold();
    }
  };

  const handleKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    onKeyUp?.(e);
    if (HOLD_KEYS.has(e.key)) endHold();
  };

  let label: ReactNode = children ?? defaults.label;
  if (phase === "holding" && showHoldingLabel) {
    label = holdingLabel;
  } else if (phase === "complete") {
    label = completeLabel ?? defaults.completeLabel;
  }

  const labelKey = phase === "holding" && !showHoldingLabel ? "idle" : phase;

  return (
    <MotionConfig reducedMotion="user">
      <button
        {...props}
        aria-disabled={phase === "complete" || undefined}
        className={cn(holdButtonVariants({ variant }), className)}
        data-complete={phase === "complete" || undefined}
        data-holding={phase === "holding" || undefined}
        disabled={disabled}
        onBlur={(e) => {
          onBlur?.(e);
          endHold();
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onPointerCancel={(e) => {
          onPointerCancel?.(e);
          endHold();
        }}
        onPointerDown={handlePointerDown}
        onPointerLeave={(e) => {
          onPointerLeave?.(e);
          endHold();
        }}
        onPointerUp={(e) => {
          onPointerUp?.(e);
          endHold();
        }}
        type={type}
      >
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-current/15 transition-opacity duration-150 group-data-complete/hold:opacity-0"
          style={{ clipPath }}
        />
        <span className="relative flex items-center justify-center overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              className="inline-flex items-center gap-2 whitespace-nowrap"
              exit={{ opacity: 0, y: -10, filter: "blur(2px)" }}
              initial={{ opacity: 0, y: 10, filter: "blur(2px)" }}
              key={labelKey}
              transition={LABEL_TRANSITION}
            >
              {labelKey === "complete" ? (
                <DrawnCheck />
              ) : (
                <Icon aria-hidden="true" className="size-4" />
              )}
              {label}
            </motion.span>
          </AnimatePresence>
        </span>
        <span aria-live="polite" className="sr-only">
          {phase === "complete" ? (completeLabel ?? defaults.completeLabel) : ""}
        </span>
      </button>
    </MotionConfig>
  );
}

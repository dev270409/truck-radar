"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * Hero della landing con micro-interazioni Motion.
 * - Entrata: titolo e sottotitolo scendono con ease-out, il preview si dissolve.
 * - Hover: il bottone primario scala leggermente e cambia tono.
 * - Reduced motion: tutto appare statico.
 */
export function HeroMotionTitle({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.h1
      id="hero-title"
      className="ops-title mt-5 max-w-[13ch] text-balance text-[clamp(2.75rem,5.8vw,5rem)] leading-[0.98]"
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
    >
      {children}
    </motion.h1>
  );
}

export function HeroMotionLead({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.p
      className="ops-subtitle mt-6 max-w-xl text-base leading-7 sm:text-lg"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
    >
      {children}
    </motion.p>
  );
}

export function HeroMotionActions({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="mt-8 flex flex-wrap gap-3"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
    >
      {children}
    </motion.div>
  );
}

export function HeroPrimaryCTA({ href, children }: { href: string; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div whileHover={reduceMotion ? undefined : { scale: 1.03 }} whileTap={reduceMotion ? undefined : { scale: 0.97 }} transition={{ duration: 0.15 }}>
      <Link href={href} className="ops-btn ops-btn--primary">
        {children} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </motion.div>
  );
}

export function HeroPreviewWrapper({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="landing-hero-visual min-w-0"
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * Hero della landing.
 * L'entrata è CSS-first: il contenuto è visibile anche senza JavaScript e non
 * produce mismatch di idratazione con prefers-reduced-motion.
 * Motion resta sulle micro-interazioni del bottone primario.
 */

export function HeroMotionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1
      id="hero-title"
      className="ops-title hero-rise mt-5 max-w-[13ch] text-balance text-[clamp(2.6rem,5.2vw,4.6rem)] leading-[0.98]"
      style={{ animationDelay: "0.05s" }}
    >
      {children}
    </h1>
  );
}

export function HeroMotionLead({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="ops-subtitle hero-rise mt-6 max-w-xl text-base leading-7 sm:text-lg"
      style={{ animationDelay: "0.15s" }}
    >
      {children}
    </p>
  );
}

export function HeroMotionActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="hero-rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "0.25s" }}>
      {children}
    </div>
  );
}

export function HeroPrimaryCTA({ href, children }: { href: string; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { scale: 1.02 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      <Link href={href} className="ops-btn ops-btn--primary">
        {children} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </motion.div>
  );
}

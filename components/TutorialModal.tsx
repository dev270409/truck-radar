"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, ListOrdered, X } from "lucide-react";
import type { Tutorial } from "@/lib/tutorials";

export default function TutorialModal({
  tutorial,
  onClose,
}: {
  tutorial: Tutorial | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!tutorial) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [tutorial, onClose]);

  if (!tutorial) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-3 md:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        className="w-full max-w-4xl overflow-hidden rounded-xl"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--surface-border)",
          boxShadow: "0 30px 100px rgba(0,0,0,0.55)",
        }}
      >
        <div
          className="flex items-start justify-between gap-4 border-b px-4 py-3.5 md:px-6"
          style={{ borderColor: "var(--surface-border)" }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  background: "color-mix(in oklab, var(--brand) 12%, transparent)",
                  color: "var(--brand)",
                }}
              >
                Guida rapida
              </span>
              <span
                className="inline-flex items-center gap-1 text-[11px]"
                style={{ color: "var(--text-label)" }}
              >
                {tutorial.durationLabel} · sottotitoli IT
              </span>
            </div>
            <h2
              id="tutorial-title"
              className="font-display mt-2 truncate text-lg font-semibold"
              style={{ color: "var(--text)" }}
            >
              {tutorial.title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Chiudi la guida"
            className="grid h-9 w-9 flex-none place-items-center rounded-lg border transition-colors hover:opacity-80"
            style={{ borderColor: "var(--surface-border)", color: "var(--text)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="bg-black">
          <video
            key={tutorial.id}
            controls
            autoPlay
            playsInline
            preload="metadata"
            poster={tutorial.poster}
            className="mx-auto block aspect-video w-full max-h-[62vh] object-contain"
          >
            <source src={tutorial.video} type="video/mp4" />
            <track
              default
              kind="captions"
              srcLang="it"
              label="Italiano"
              src={tutorial.captions}
            />
            Il tuo browser non supporta il video. Apri la guida dalla pagina Assistenza.
          </video>
        </div>

        <div
          className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6"
          style={{ borderColor: "var(--surface-border)" }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[13px]" style={{ color: "var(--text-soft)" }}>
              {tutorial.description}
            </p>
            {tutorial.steps.length > 0 && (
              <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {tutorial.steps.map((step, index) => (
                  <li
                    key={step}
                    className="flex items-center gap-1.5 text-[12px]"
                    style={{ color: "var(--text-label)" }}
                  >
                    <span
                      className="grid h-4 w-4 shrink-0 place-items-center rounded-[4px] font-mono text-[9px] font-semibold"
                      style={{
                        background: "color-mix(in oklab, var(--brand) 14%, transparent)",
                        color: "var(--brand)",
                      }}
                    >
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            )}
          </div>
          <Link
            href="/dashboard/assistenza"
            onClick={onClose}
            className="inline-flex flex-none items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-semibold transition-colors"
            style={{
              borderColor: "color-mix(in oklab, var(--brand) 30%, var(--surface-border))",
              color: "var(--brand)",
            }}
          >
            <ListOrdered className="h-3.5 w-3.5" />
            Tutte le guide
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

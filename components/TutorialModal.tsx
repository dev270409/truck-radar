"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
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
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm md:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        className="w-full max-w-4xl overflow-hidden rounded-2xl"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--surface-border)",
          boxShadow: "0 30px 100px rgba(0,0,0,0.55)",
        }}
      >
        <div
          className="flex items-start justify-between gap-4 border-b px-4 py-3.5 md:px-5"
          style={{ borderColor: "var(--surface-border)" }}
        >
          <div className="min-w-0">
            <p className="ops-label">Guida rapida · {tutorial.durationLabel}</p>
            <h2
              id="tutorial-title"
              className="font-display mt-1 truncate text-[17px] font-bold"
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
            className="grid h-9 w-9 flex-none place-items-center rounded-[10px] border transition hover:opacity-80"
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
            className="mx-auto block aspect-video w-full max-h-[68vh] object-contain"
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

        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <p className="text-[12px]" style={{ color: "var(--text-soft)" }}>
            {tutorial.description} I sottotitoli sono disponibili dal tasto CC.
          </p>
          <Link
            href="/dashboard/assistenza"
            onClick={onClose}
            className="inline-flex flex-none items-center gap-1.5 text-[12px] font-semibold"
            style={{ color: "var(--brand)" }}
          >
            Tutte le guide e FAQ
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

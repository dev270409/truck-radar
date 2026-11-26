"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PlayCircle, X } from "lucide-react";
import { getTutorialForPath } from "@/lib/tutorials";

const STORAGE_KEY = "truck-radar-tutorial-dismissed";

/**
 * Banner che appare sulla dashboard la prima volta, invitando
 * l'utente a guardare la guida rapida della pagina corrente.
 * Può essere chiuso e non riappare (localStorage).
 */
export default function TutorialBanner() {
  const pathname = usePathname();
  const tutorial = getTutorialForPath(pathname);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
      } catch {
        setDismissed(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!tutorial || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* storage non disponibile */
    }
    setDismissed(true);
  };

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderColor: "color-mix(in oklab, var(--brand) 25%, var(--surface-border))",
        background: "color-mix(in oklab, var(--brand) 5%, var(--surface))",
      }}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
          style={{
            background: "var(--brand)",
            color: "white",
          }}
        >
          <PlayCircle className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
            Nuovo qui? Guarda come si usa questa pagina
          </p>
          <p className="mt-0.5 text-[12px]" style={{ color: "var(--text-soft)" }}>
            {tutorial.title} · {tutorial.durationLabel} · sottotitoli in italiano
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href="/dashboard/assistenza"
          className="ops-btn ops-btn--primary ops-btn--sm"
        >
          <PlayCircle className="h-3.5 w-3.5" />
          Guarda ora
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Non mostrare più"
          className="grid h-8 w-8 place-items-center rounded-lg border transition-colors hover:opacity-70"
          style={{ borderColor: "var(--surface-border)", color: "var(--text-label)" }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, PlayCircle, Clock } from "lucide-react";
import { getTutorialForPath } from "@/lib/tutorials";
import TutorialModal from "./TutorialModal";

/**
 * Bottone "Come si usa" prominente nella topbar.
 * Mostra il titolo della guida, la durata e un'icona play.
 * Sempre visibile su tutte le dimensioni dello schermo.
 */
export default function TutorialLauncher() {
  const pathname = usePathname();
  const tutorial = getTutorialForPath(pathname);
  const [open, setOpen] = useState(false);

  if (!tutorial) {
    return (
      <Link
        href="/dashboard/assistenza"
        aria-label="Guide e assistenza"
        title="Guide e assistenza"
        className="group inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors"
        style={{
          borderColor: "var(--surface-border)",
          color: "var(--text-soft)",
        }}
      >
        <CircleHelp className="h-4 w-4 shrink-0" style={{ color: "var(--brand)" }} />
        <span className="hidden sm:inline">Guide</span>
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Guarda la guida: ${tutorial.title} (${tutorial.durationLabel})`}
        title={tutorial.title}
        className="group relative inline-flex h-9 items-center gap-2.5 rounded-lg border px-3.5 text-sm font-medium transition-all"
        style={{
          borderColor: "color-mix(in oklab, var(--brand) 35%, var(--surface-border))",
          background: "color-mix(in oklab, var(--brand) 8%, var(--surface))",
          color: "var(--text)",
        }}
      >
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md transition-transform group-hover:scale-110"
          style={{ background: "var(--brand)", color: "white" }}
        >
          <PlayCircle className="h-3.5 w-3.5" />
        </span>
        <span className="flex flex-col items-start leading-none">
          <span className="text-[11px] font-semibold" style={{ color: "var(--text)" }}>
            Come si usa
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[9px]" style={{ color: "var(--text-label)" }}>
            <Clock className="h-2.5 w-2.5" />
            {tutorial.durationLabel}
          </span>
        </span>
      </button>
      <TutorialModal
        tutorial={open ? tutorial : null}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

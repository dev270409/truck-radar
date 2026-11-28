"use client";

import { useState } from "react";
import Image from "next/image";
import { Clock3, ListOrdered, Play } from "lucide-react";
import type { Tutorial } from "@/lib/tutorials";
import TutorialModal from "./TutorialModal";

export default function TutorialLibrary({ tutorials }: { tutorials: Tutorial[] }) {
  const [active, setActive] = useState<Tutorial | null>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tutorials.map((tutorial) => (
          <button
            key={tutorial.id}
            type="button"
            onClick={() => setActive(tutorial)}
            className="ops-card group overflow-hidden text-left transition-colors hover:border-[var(--brand)]"
            aria-label={`Guarda: ${tutorial.title} (${tutorial.durationLabel})`}
          >
            <span className="relative block aspect-video overflow-hidden bg-[var(--surface-soft)]">
              <Image
                src={tutorial.poster}
                alt=""
                fill
                sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
                <Clock3 className="h-3 w-3" aria-hidden="true" />
                {tutorial.durationLabel}
              </span>
              <span
                className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full text-white transition-transform group-hover:scale-110"
                style={{ background: "var(--brand)" }}
              >
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              </span>
            </span>
            <span className="block p-4">
              <span
                className="font-display block text-[14px] font-semibold leading-snug"
                style={{ color: "var(--text)" }}
              >
                {tutorial.title}
              </span>
              <span
                className="mt-1 block text-[12px] leading-relaxed"
                style={{ color: "var(--text-soft)" }}
              >
                {tutorial.description}
              </span>
              {tutorial.steps.length > 0 && (
                <span
                  className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3 text-[11px]"
                  style={{ borderColor: "var(--surface-border)", color: "var(--text-label)" }}
                >
                  <ListOrdered className="h-3 w-3 shrink-0" style={{ color: "var(--brand)" }} aria-hidden="true" />
                  {tutorial.steps.map((step, i) => (
                    <span key={step} className="inline-flex items-center gap-1">
                      <span
                        className="font-mono font-semibold"
                        style={{ color: "var(--brand)" }}
                      >
                        {i + 1}
                      </span>
                      {step}
                    </span>
                  ))}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      <TutorialModal tutorial={active} onClose={() => setActive(null)} />
    </>
  );
}

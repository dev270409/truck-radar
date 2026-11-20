"use client";

import { useState } from "react";
import Image from "next/image";
import { Clock3, Play } from "lucide-react";
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
            className="ops-card group overflow-hidden text-left transition hover:-translate-y-0.5"
            aria-label={`Guarda: ${tutorial.title}`}
          >
            <span className="relative block aspect-video overflow-hidden bg-slate-950">
              <Image
                src={tutorial.poster}
                alt=""
                fill
                sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition duration-300 group-hover:scale-[1.02]"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
                <Clock3 className="h-3 w-3" />
                {tutorial.durationLabel}
              </span>
              <span
                className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full text-white shadow-lg"
                style={{ background: "var(--brand)" }}
              >
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </span>
            </span>
            <span className="block p-4">
              <span
                className="font-display block text-[14px] font-bold leading-snug"
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
            </span>
          </button>
        ))}
      </div>
      <TutorialModal tutorial={active} onClose={() => setActive(null)} />
    </>
  );
}

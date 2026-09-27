"use client";

import { Search } from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

/** Topbar sticky 68px in vetro: logo · ricerca · pill LIVE · tema. */
export default function OpsTopbar({ onMenu }: { onMenu?: () => void }) {
  return (
    <header
      className="sticky top-0 z-40 flex h-[68px] items-center gap-3 px-4 md:px-6"
      style={{
        background: "var(--glass-topbar)",
        backdropFilter: "blur(24px) saturate(150%)",
        WebkitBackdropFilter: "blur(24px) saturate(150%)",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
      <button
        type="button"
        onClick={onMenu}
        aria-label="Apri il menu"
        className="grid h-9 w-9 place-items-center rounded-[var(--radius-pill)] border md:hidden"
        style={{ borderColor: "var(--glass-border)", color: "var(--text)", background: "var(--surface-soft)" }}
      >
        <span className="flex flex-col gap-[3px]">
          <span className="block h-[2px] w-4 rounded" style={{ background: "currentColor" }} />
          <span className="block h-[2px] w-4 rounded" style={{ background: "currentColor" }} />
          <span className="block h-[2px] w-4 rounded" style={{ background: "currentColor" }} />
        </span>
      </button>

      <div className="md:hidden">
        <Logo withWordmark={false} size={36} />
      </div>

      <div className="relative hidden flex-1 max-w-[520px] md:block">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: "var(--text-label-soft)" }}
        />
        <input
          type="search"
          placeholder="Cerca mezzi, viaggi, autisti…"
          className="h-[38px] w-full rounded-[var(--radius-pill)] pl-10 pr-4 text-[13px] outline-none transition"
          style={{
            background: "var(--surface-soft)",
            border: "1px solid var(--glass-border)",
            color: "var(--text)",
          }}
        />
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <span
          className="hidden items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide sm:inline-flex"
          style={{ background: "color-mix(in oklch, var(--success) 12%, transparent)", color: "var(--success)" }}
        >
          <span className="pulse-dot h-1.5 w-1.5 rounded-full" style={{ background: "var(--success)" }} />
          Live
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
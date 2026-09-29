"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

interface SearchResult {
  type: string;
  label: string;
  sub: string;
  href: string;
}

/** Topbar sticky 68px: logo · ricerca funzionante · tema. */
export default function OpsTopbar({ onMenu }: { onMenu?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    setResults([]);
    router.push(href);
  };

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

      <Link href="/dashboard" aria-label="Truck Radar — home">
        <Logo />
      </Link>

      <div ref={boxRef} className="relative ml-auto hidden max-w-[520px] flex-1 md:ml-8 md:block">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: "var(--text-label-soft)" }}
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Cerca mezzi (targa), autisti, viaggi…"
          aria-label="Cerca nella flotta"
          className="h-[38px] w-full rounded-[var(--radius-pill)] pl-10 pr-9 text-[13px] outline-none transition"
          style={{
            background: "var(--surface-soft)",
            border: "1px solid var(--glass-border)",
            color: "var(--text)",
          }}
        />
        {loading && (
          <Loader2
            className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin"
            style={{ color: "var(--text-label-soft)" }}
          />
        )}
        {open && q.trim().length >= 2 && (
          <div
            className="absolute left-0 right-0 top-[46px] z-50 overflow-hidden rounded-[var(--radius-card)]"
            style={{ background: "var(--glass-topbar)", border: "1px solid var(--glass-border)", backdropFilter: "blur(24px)" }}
          >
            {results.length === 0 && !loading ? (
              <p className="px-4 py-3 text-[12px]" style={{ color: "var(--text-label)" }}>
                Nessun risultato per “{q.trim()}”.
              </p>
            ) : (
              <ul className="max-h-[320px] overflow-y-auto">
                {results.map((r, i) => (
                  <li key={`${r.href}-${i}`}>
                    <button
                      type="button"
                      onClick={() => go(r.href)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:opacity-80"
                      style={{ color: "var(--text)" }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold">{r.label}</span>
                        <span className="block truncate text-[11px]" style={{ color: "var(--text-label)" }}>{r.sub}</span>
                      </span>
                      <span className="chip chip-brand" style={{ fontSize: 8 }}>{r.type}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2.5 md:ml-3">
        <ThemeToggle />
      </div>
    </header>
  );
}

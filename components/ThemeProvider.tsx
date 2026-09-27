"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "tr-theme";
const PROMPTED_KEY = "tr-theme-prompted";

interface ThemeContextValue {
  theme: Theme;
  /** true finché l'utente non ha mai scelto: mostra il prompt "una volta". */
  needsChoice: boolean;
  setTheme: (t: Theme) => void;
  toggle: () => void;
  dismissChoice: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [needsChoice, setNeedsChoice] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored: Theme | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    } catch {}
    const preferred: Theme =
      stored ??
      (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setThemeState(preferred);
    applyTheme(preferred);

    let prompted = "1";
    try {
      prompted = localStorage.getItem(PROMPTED_KEY) ?? "0";
    } catch {}
    if (!stored && prompted !== "1") setNeedsChoice(true);
    setReady(true);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
      localStorage.setItem(PROMPTED_KEY, "1");
    } catch {}
    setNeedsChoice(false);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const dismissChoice = useCallback(() => {
    try {
      localStorage.setItem(PROMPTED_KEY, "1");
    } catch {}
    setNeedsChoice(false);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, needsChoice, setTheme, toggle, dismissChoice }}>
      {children}
      {ready && needsChoice && <ThemePrompt />}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve essere usato dentro ThemeProvider");
  return ctx;
}

/* Prompt "una volta": chiede la preferenza solo la prima volta. */
function ThemePrompt() {
  const { setTheme, dismissChoice } = useTheme();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={dismissChoice} aria-hidden />
      <div className="glass-strong relative w-full max-w-sm rounded-[var(--radius-card)] p-6 enter-up">
        <p className="ops-label">Preferenza di visualizzazione</p>
        <h2 className="font-display mt-2 text-lg font-bold" style={{ color: "var(--text)" }}>
          Come preferisci usare Truck Radar?
        </h2>
        <p className="mt-1.5 text-[13px]" style={{ color: "var(--text-soft)" }}>
          Potrai cambiarla in qualsiasi momento dall&apos;app. La salviamo come preferenza predefinita.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className="glass rounded-[var(--radius-base)] px-4 py-4 text-sm font-semibold transition hover:-translate-y-0.5"
            style={{ color: "var(--text)" }}
          >
            ☀️ Chiaro
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className="rounded-[var(--radius-base)] px-4 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            style={{ background: "var(--brand)" }}
          >
            🌙 Scuro
          </button>
        </div>
        <button
          type="button"
          onClick={dismissChoice}
          className="mt-4 w-full text-center text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-label-soft)" }}
        >
          Usa il tema del sistema
        </button>
      </div>
    </div>
  );
}
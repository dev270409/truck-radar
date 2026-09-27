"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

/** Pulsante compatto light/dark. La scelta è persistita da ThemeProvider. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Passa al tema chiaro" : "Passa al tema scuro"}
      title={dark ? "Tema chiaro" : "Tema scuro"}
      className={`grid h-9 w-9 place-items-center rounded-[var(--radius-pill)] border transition hover:-translate-y-0.5 ${className}`}
      style={{ borderColor: "var(--glass-border)", color: "var(--text)", background: "var(--surface-soft)" }}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
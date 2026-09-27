"use client";

import { useState } from "react";
import { X } from "lucide-react";
import OpsTopbar from "./OpsTopbar";
import BottomNav from "./BottomNav";

/**
 * Shell della console operativa: topbar sticky a piena larghezza, sotto il
 * flex sidebar (252px, vetro) + contenuto. Su mobile la sidebar è un drawer
 * e c'è la bottom-nav flottante. La sidebar è server-rendered (children).
 */
export default function DashboardShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <OpsTopbar onMenu={() => setOpen(true)} />

      <div className="flex">
        {/* Backdrop mobile */}
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
        )}

        {/* Sidebar vetro 252px (desktop) / drawer (mobile) */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[252px] transform flex-col overflow-y-auto p-4 transition-transform duration-200 md:sticky md:top-[68px] md:z-auto md:h-[calc(100vh-68px)] md:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{
            background: "var(--glass-sidebar)",
            backdropFilter: "blur(24px) saturate(150%)",
            WebkitBackdropFilter: "blur(24px) saturate(150%)",
            borderRight: "1px solid var(--glass-border)",
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Chiudi il menu"
            className="mb-3 ml-auto grid h-8 w-8 place-items-center rounded-[var(--radius-pill)] border md:hidden"
            style={{ borderColor: "var(--glass-border)", color: "var(--text)" }}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex flex-1 flex-col justify-between" onClick={() => setOpen(false)}>
            {sidebar}
          </div>
        </aside>

        {/* Colonna contenuto */}
        <main className="mx-auto w-full max-w-[1460px] flex-1 px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-10">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
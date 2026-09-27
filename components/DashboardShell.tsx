"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

/**
 * Shell client per la dashboard: gestisce l'apertura/chiusura della sidebar
 * su mobile (drawer) senza impilare il menu sopra il contenuto.
 * La sidebar vera (server-rendered) arriva come children.
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2 font-bold">
          <img src="/logo.jpg" alt="" className="h-8 w-8 rounded-lg object-cover" />
          Truck Radar
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Apri il menu"
          className="rounded-lg border border-slate-700 p-2 text-slate-200 hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <div className="flex flex-col md:flex-row">
        {/* Backdrop mobile */}
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar: drawer su mobile, colonna fissa su desktop */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 transform overflow-y-auto bg-slate-900 border-r border-slate-800 p-4 transition-transform duration-200 md:static md:z-auto md:w-64 md:h-screen md:sticky md:top-0 md:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Chiudi il menu"
            className="mb-3 ml-auto flex rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800 md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
          {/* Chiude il drawer al click su un link */}
          <div onClick={() => setOpen(false)}>{sidebar}</div>
        </aside>

        <main className="flex-1 bg-slate-950 p-6 md:p-10 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
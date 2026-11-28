"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Lock, Sparkles, X } from "lucide-react";
import { permissionForPath, type PermissionMap } from "@/lib/permissions-catalog";
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
  user,
  trial,
  permissions,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  user: { nome: string; cognome: string; email: string; role: string };
  trial?: { active: boolean; daysLeft: number | null };
  permissions?: Partial<PermissionMap>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const requiredFeature = permissionForPath(pathname);
  const allowed = !requiredFeature || permissions?.[requiredFeature] === true;

  return (
    <div className="min-h-screen">
      <OpsTopbar onMenu={() => setOpen(true)} user={user} permissions={permissions} />

      {trial?.active && (
        <div
          className="border-b px-4 py-2.5 md:px-8"
          style={{
            borderColor: "var(--glass-border)",
            background: "color-mix(in oklab, var(--brand) 7%, var(--glass-topbar))",
          }}
        >
          <div className="mx-auto flex max-w-[1460px] flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px]">
            <Sparkles className="h-4 w-4 flex-none" style={{ color: "var(--brand)" }} />
            <p style={{ color: "var(--text-soft)" }}>
              <span className="font-semibold" style={{ color: "var(--text)" }}>Prova gratuita</span>
              {trial.daysLeft !== null ? ` · ${trial.daysLeft} giorni rimasti` : " attiva"}
              {" · tutte le funzioni sono attive"}
            </p>
            <Link
              href="/dashboard/assistenza#guide"
              className="inline-flex items-center gap-1 text-[12px] font-semibold"
              style={{ color: "var(--brand)" }}
            >
              Guarda le guide
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Backdrop mobile */}
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/40  md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
        )}

        {/* Sidebar (desktop) / drawer (mobile) */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[252px] transform flex-col overflow-y-auto p-4 transition-transform duration-200 md:sticky md:top-16 md:z-auto md:h-[calc(100vh-64px)] md:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{
            background: "var(--glass-sidebar)",
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
        <main className="mx-auto w-full min-w-0 max-w-[1460px] flex-1 px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-10">
          {allowed ? (
            children
          ) : (
            <div className="ops-card mx-auto mt-10 max-w-xl p-6 text-center">
              <div
                className="mx-auto grid h-12 w-12 place-items-center rounded-xl"
                style={{ background: "var(--surface-soft)", color: "var(--brand)" }}
              >
                <Lock className="h-5 w-5" />
              </div>
              <h1 className="font-display mt-4 text-xl font-semibold" style={{ color: "var(--text)" }}>
                Permesso non attivo
              </h1>
              <p className="mt-2 text-[13px]" style={{ color: "var(--text-soft)" }}>
                Il tuo account non ha accesso a questa sezione. Chiedi a un amministratore
                di aggiornare i permessi dalla pagina Autisti e team.
              </p>
              <Link href="/dashboard" className="ops-btn ops-btn--primary ops-btn--sm mt-5">
                Torna alla Panoramica
              </Link>
            </div>
          )}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { CreditCard, LifeBuoy, LogOut, Settings2, UserRound } from "lucide-react";

export default function UserMenu({
  user,
  canSettings = true,
  canBilling = true,
}: {
  user: { nome: string; cognome: string; email: string; role: string };
  canSettings?: boolean;
  canBilling?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = `${user.nome?.[0] ?? ""}${user.cognome?.[0] ?? ""}`.toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Apri profilo e impostazioni"
        aria-expanded={open}
        title={`${user.nome} ${user.cognome}`}
        className="grid h-9 w-9 place-items-center rounded-full font-display text-[12px] font-bold text-white shadow-sm"
        style={{ background: "var(--brand)" }}
      >
        {initials}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-xl"
          style={{ background: "var(--surface)", border: "1px solid var(--surface-border)", boxShadow: "var(--surface-shadow)" }}
        >
          <div className="border-b p-3" style={{ borderColor: "var(--surface-border)" }}>
            <p className="truncate text-[13px] font-semibold" style={{ color: "var(--text)" }}>
              {user.nome} {user.cognome}
            </p>
            <p className="truncate text-[11px]" style={{ color: "var(--text-label)" }}>{user.email}</p>
            <span className="chip chip-brand mt-2">{user.role}</span>
          </div>

          <div className="p-1.5">
            <Link
              href="/dashboard/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium transition hover:opacity-80"
              style={{ color: "var(--text)" }}
            >
              <UserRound className="h-3.5 w-3.5" style={{ color: "var(--text-label)" }} />
              Profilo e password
            </Link>
            {canSettings && (
              <Link
                href="/dashboard/impostazioni"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium transition hover:opacity-80"
                style={{ color: "var(--text)" }}
              >
                <Settings2 className="h-3.5 w-3.5" style={{ color: "var(--text-label)" }} />
                Impostazioni e menu
              </Link>
            )}
            <Link
              href="/dashboard/assistenza"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium transition hover:opacity-80"
              style={{ color: "var(--text)" }}
            >
              <LifeBuoy className="h-3.5 w-3.5" style={{ color: "var(--text-label)" }} />
              Assistenza e guide
            </Link>
            {canBilling && (
              <Link
                href="/dashboard/abbonamenti"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium transition hover:opacity-80"
                style={{ color: "var(--text)" }}
              >
                <CreditCard className="h-3.5 w-3.5" style={{ color: "var(--text-label)" }} />
                Abbonamento
              </Link>
            )}
          </div>

          <div className="border-t p-1.5" style={{ borderColor: "var(--surface-border)" }}>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-semibold text-red-300 transition hover:bg-red-950/30"
            >
              <LogOut className="h-3.5 w-3.5" />
              Esci
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

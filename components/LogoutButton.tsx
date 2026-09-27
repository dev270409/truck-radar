"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-base)] px-3 py-2 text-[12px] font-semibold transition"
      style={{
        background: "var(--surface-soft)",
        border: "1px solid var(--glass-border)",
        color: "var(--text-label)",
      }}
    >
      <LogOut className="h-3.5 w-3.5" />
      <span>Disconnetti</span>
    </button>
  );
}

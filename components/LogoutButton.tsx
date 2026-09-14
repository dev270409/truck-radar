"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-slate-900 hover:bg-red-950/60 border border-slate-800 hover:border-red-800 text-slate-400 hover:text-red-300 rounded-xl text-xs font-semibold transition"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span>Disconnetti</span>
    </button>
  );
}

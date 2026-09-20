"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

export default function NotificationsBadge() {
  const [totale, setTotale] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/notifiche");
        if (!res.ok) return;
        const data = await res.json();
        if (active && typeof data.totale === "number") setTotale(data.totale);
      } catch {
        /* silenzioso */
      }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  return (
    <Link
      href="/dashboard/notifiche"
      className="relative flex w-9 h-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
      title="Notifiche"
      aria-label="Notifiche"
    >
      <Bell className="w-4.5 h-4.5" />
      {totale > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
          {totale > 99 ? "99+" : totale}
        </span>
      )}
    </Link>
  );
}
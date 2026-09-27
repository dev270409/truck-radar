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
      className="relative grid h-9 w-9 place-items-center rounded-[var(--radius-pill)] transition"
      style={{ background: "var(--surface-soft)", border: "1px solid var(--glass-border)", color: "var(--text)" }}
      title="Notifiche"
      aria-label="Notifiche"
    >
      <Bell className="h-[18px] w-[18px]" />
      {totale > 0 && (
        <span
          className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
          style={{ background: "var(--danger)" }}
        >
          {totale > 99 ? "99+" : totale}
        </span>
      )}
    </Link>
  );
}
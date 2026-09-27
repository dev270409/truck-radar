"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Car, Route, MapPin, Users } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Panoramica", icon: LayoutDashboard },
  { href: "/dashboard/vehicles", label: "Mezzi", icon: Car },
  { href: "/dashboard/trips", label: "Viaggi", icon: Route },
  { href: "/dashboard/flotta", label: "Mappa", icon: MapPin },
  { href: "/dashboard/users", label: "Team", icon: Users },
];

/** Bottom-nav flottante in vetro per mobile (5 voci a pillola). */
export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-1 rounded-[var(--radius-pill)] px-2 py-2 md:hidden"
      style={{
        background: "var(--glass-topbar)",
        backdropFilter: "blur(24px) saturate(150%)",
        WebkitBackdropFilter: "blur(24px) saturate(150%)",
        border: "1px solid var(--glass-border)",
        boxShadow: "0 14px 40px color-mix(in oklch, var(--brand) 18%, transparent)",
      }}
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-[var(--radius-pill)] px-1 py-1.5 text-[9px] font-bold uppercase tracking-wide transition"
            style={
              active
                ? { background: "var(--brand)", color: "#fff" }
                : { color: "var(--text-label)" }
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
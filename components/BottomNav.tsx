"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Route, Boxes, FileText, PackageCheck } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/trips", label: "Viaggi", icon: Route },
  { href: "/dashboard/carico", label: "Carico", icon: Boxes },
  { href: "/dashboard/preventivi", label: "Preventivi", icon: FileText },
  { href: "/dashboard/ordini", label: "Ordini", icon: PackageCheck },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-1 rounded-[14px] px-2 py-2 md:hidden"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--surface-border)",
        boxShadow: "var(--surface-shadow)",
      }}
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="flex flex-1 flex-col items-center gap-1 rounded-[10px] px-1 py-1.5 text-[9px] font-semibold transition"
            style={
              active
                ? { background: "color-mix(in oklab, var(--brand) 14%, transparent)", color: "var(--brand)" }
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

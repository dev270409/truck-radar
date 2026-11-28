import Link from "next/link";

export default function TripSubnav({ active }: { active: "trips" | "giri" }) {
  return (
    <div className="inline-flex rounded-xl border border-[var(--surface-border)] bg-[var(--surface-soft)] p-1">
      <Link
        href="/dashboard/trips"
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          active === "trips" ? "bg-sky-600 text-white" : "text-[var(--text-label)] hover:text-[var(--text)]"
        }`}
      >
        Viaggi
      </Link>
      <Link
        href="/dashboard/giri"
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          active === "giri" ? "bg-sky-600 text-white" : "text-[var(--text-label)] hover:text-[var(--text)]"
        }`}
      >
        Giri e costi
      </Link>
    </div>
  );
}

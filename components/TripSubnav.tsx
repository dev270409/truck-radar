import Link from "next/link";

export default function TripSubnav({ active }: { active: "trips" | "giri" }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950/60 p-1">
      <Link
        href="/dashboard/trips"
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          active === "trips" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-slate-200"
        }`}
      >
        Viaggi
      </Link>
      <Link
        href="/dashboard/giri"
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          active === "giri" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-slate-200"
        }`}
      >
        Giri e costi
      </Link>
    </div>
  );
}

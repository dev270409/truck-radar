"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Route,
  Loader2,
  MapPin,
  ArrowRight,
  Truck,
  Package,
  CalendarDays,
  Play,
  Flag,
} from "lucide-react";

interface Trip {
  id: string;
  luogoRitiro: string;
  luogoConsegna: string;
  dataRitiro: string;
  dataConsegna: string;
  tipoMerce: string;
  pesoKg: number;
  volumeM3: number;
  cliente?: string | null;
  note?: string | null;
  status: string;
  vehicle?: { id: string; targa: string; categoria: string } | null;
}

const statusStyles: Record<string, string> = {
  DA_ASSEGNARE: "bg-slate-950 text-slate-300 border border-slate-700",
  ASSEGNATO: "bg-indigo-950 text-indigo-300 border border-indigo-800/60",
  IN_CORSO: "bg-amber-950 text-amber-300 border border-amber-800/60",
  COMPLETATO: "bg-emerald-950 text-emerald-300 border border-emerald-800/60",
  ANNULLATO: "bg-red-950 text-red-300 border border-red-800/60",
  SUBAPPALTATO: "bg-purple-950 text-purple-300 border border-purple-800/60",
};

export default function AutistaTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/autista/trips");
      const data = await res.json();
      if (data.trips) setTrips(data.trips);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatus = async (trip: Trip, toStatus: string) => {
    setSavingId(trip.id);
    setError("");
    try {
      const res = await fetch(`/api/autista/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: toStatus,
          eventNote:
            toStatus === "IN_CORSO"
              ? "Partito verso la destinazione."
              : "Consegnato al cliente.",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nell'aggiornamento");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center">
          <Route className="w-6 h-6 mr-2.5 text-blue-400" /> I miei Viaggi
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Viaggi assegnati a te: parti e registra la consegna.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Caricamento viaggi...</span>
        </div>
      ) : trips.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
          Nessun viaggio assegnato a te al momento.
        </div>
      ) : (
        trips.map((t) => (
          <div
            key={t.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${statusStyles[t.status] ?? statusStyles.DA_ASSEGNARE}`}
              >
                {t.status.replace("_", " ")}
              </span>
              {t.vehicle && (
                <span className="text-xs font-mono text-slate-400 flex items-center">
                  <Truck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  {t.vehicle.targa}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase text-slate-500 font-semibold flex items-center">
                    <MapPin className="w-3 h-3 mr-1 text-emerald-400" /> Ritiro
                  </p>
                  <p className="text-sm font-semibold text-slate-100 capitalize">{t.luogoRitiro}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500" />
                <div className="text-right">
                  <p className="text-[11px] uppercase text-slate-500 font-semibold flex items-center justify-end">
                    Consegna <MapPin className="w-3 h-3 ml-1 text-rose-400" />
                  </p>
                  <p className="text-sm font-semibold text-slate-100 capitalize">{t.luogoConsegna}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <span className="flex items-center">
                  <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                  {new Date(t.dataRitiro).toLocaleDateString("it-IT")}
                </span>
                <span className="flex items-center">
                  <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                  {new Date(t.dataConsegna).toLocaleDateString("it-IT")}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center">
                  <Package className="w-3.5 h-3.5 mr-1.5" />
                  {t.tipoMerce}
                </span>
                <span>{t.pesoKg} kg · {t.volumeM3} m³</span>
              </div>

              {t.cliente && (
                <p className="text-xs text-slate-500">
                  Cliente: <span className="text-slate-300">{t.cliente}</span>
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
              {t.status === "ASSEGNATO" && (
                <button
                  onClick={() => handleStatus(t, "IN_CORSO")}
                  disabled={savingId === t.id}
                  className="flex-1 flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold py-3 rounded-xl transition disabled:opacity-60"
                >
                  {savingId === t.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  <span>Parti</span>
                </button>
              )}
              {t.status === "IN_CORSO" && (
                <button
                  onClick={() => handleStatus(t, "COMPLETATO")}
                  disabled={savingId === t.id}
                  className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-3 rounded-xl transition disabled:opacity-60"
                >
                  {savingId === t.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Flag className="w-4 h-4" />
                  )}
                  <span>Consegna</span>
                </button>
              )}
              <Link
                href={`/dashboard/autista/${t.id}`}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition text-center"
              >
                Dettaglio
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
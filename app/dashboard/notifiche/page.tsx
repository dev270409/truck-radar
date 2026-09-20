"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  FileText,
  ShieldCheck,
  Route,
  Wallet,
  Car,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface Notifica {
  id: string;
  tipo: string;
  gravita: "alta" | "media";
  titolo: string;
  dettaglio: string;
  link: string;
  data?: string | null;
}

const tipoIcon: Record<string, { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  VIAGGIO: { icon: Route, cls: "text-blue-400" },
  DOCUMENTO: { icon: Car, cls: "text-amber-400" },
  KYC: { icon: ShieldCheck, cls: "text-indigo-400" },
  PRELEVO: { icon: Wallet, cls: "text-emerald-400" },
  DDT: { icon: FileText, cls: "text-rose-400" },
};

export default function NotifichePage() {
  const [notifiche, setNotifiche] = useState<Notifica[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/notifiche");
        const data = await res.json();
        if (active && Array.isArray(data.notifiche)) setNotifiche(data.notifiche);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const alerte = notifiche.filter((n) => n.gravita === "alta");
  const info = notifiche.filter((n) => n.gravita === "media");

  const renderCard = (n: Notifica) => {
    const meta = tipoIcon[n.tipo] ?? { icon: Bell, cls: "text-slate-400" };
    const Icon = meta.icon;
    return (
      <Link
        key={n.id}
        href={n.link}
        className={`block p-4 rounded-2xl border transition hover:bg-slate-900 ${
          n.gravita === "alta"
            ? "bg-red-950/40 border-red-800/60"
            : "bg-slate-900 border-slate-800"
        }`}
      >
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-xl bg-slate-950 ${meta.cls}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-100">{n.titolo}</p>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  n.gravita === "alta"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {n.gravita}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{n.dettaglio}</p>
            {n.data && (
              <p className="text-[11px] font-mono text-slate-500 mt-1.5">
                {new Date(n.data).toLocaleString("it-IT")}
              </p>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 mt-1 shrink-0" />
        </div>
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Caricamento notifiche...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center">
          <Bell className="w-6 h-6 mr-2.5 text-blue-400" /> Notifiche
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Alert attivi in tempo reale su documenti, viaggi, KYC ed economia.
        </p>
      </div>

      {notifiche.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <Bell className="w-8 h-8 mx-auto text-emerald-400 mb-3" />
          <p className="text-slate-300 font-semibold">Nessuna notifica attiva.</p>
          <p className="text-sm text-slate-500 mt-1">Tutto è sotto controllo.</p>
        </div>
      ) : (
        <>
          {alerte.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase text-red-400 tracking-wide mb-3">
                Da risolvere ({alerte.length})
              </h2>
              <div className="space-y-3">{alerte.map(renderCard)}</div>
            </section>
          )}
          {info.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase text-slate-500 tracking-wide mb-3">
                In evidenza ({info.length})
              </h2>
              <div className="space-y-3">{info.map(renderCard)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
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
    const meta = tipoIcon[n.tipo] ?? { icon: Bell, cls: "text-[var(--text-label)]" };
    const Icon = meta.icon;
    return (
      <Link
        key={n.id}
        href={n.link}
        className={`block p-4 rounded-xl border transition hover:bg-[var(--surface-soft)] ${
          n.gravita === "alta"
            ? "bg-red-950/40 border-red-800/60"
            : "bg-[var(--surface)] border-[var(--surface-border)]"
        }`}
      >
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-xl bg-[var(--surface-soft)] ${meta.cls}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text)]">{n.titolo}</p>
              <span
                className={`text-[11px] font-semibold  px-2 py-0.5 rounded ${
                  n.gravita === "alta"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-[var(--surface-strong)] text-[var(--text-label)]"
                }`}
              >
                {n.gravita}
              </span>
            </div>
            <p className="text-xs text-[var(--text-label)] mt-1">{n.dettaglio}</p>
            {n.data && (
              <p className="text-[11px] font-mono text-[var(--text-label-soft)] mt-1.5">
                {new Date(n.data).toLocaleString("it-IT")}
              </p>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-[var(--text-label-soft)] mt-1 shrink-0" />
        </div>
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-[var(--text-label)] flex items-center justify-center space-x-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Caricamento notifiche...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)] flex items-center">
          <Bell className="w-6 h-6 mr-2.5 text-blue-400" /> Notifiche
        </h1>
        <p className="text-sm text-[var(--text-label)] mt-1">
          Alert attivi in tempo reale su documenti, viaggi, KYC ed economia.
        </p>
      </div>

      {notifiche.length === 0 ? (
        <div className="p-8 text-center bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
          <Bell className="w-8 h-8 mx-auto text-emerald-400 mb-3" />
          <p className="text-[var(--text-soft)] font-semibold">Nessuna notifica attiva.</p>
          <p className="text-sm text-[var(--text-label-soft)] mt-1">Tutto è sotto controllo.</p>
        </div>
      ) : (
        <>
          {alerte.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold  text-red-400  mb-3">
                Da risolvere ({alerte.length})
              </h2>
              <div className="space-y-3">{alerte.map(renderCard)}</div>
            </section>
          )}
          {info.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold  text-[var(--text-label-soft)]  mb-3">
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
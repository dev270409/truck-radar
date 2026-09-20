"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Loader2, Star, Truck, Users, Award, ShieldCheck } from "lucide-react";

interface NetworkCompany {
  companyId: string;
  name: string;
  partitaIva: string;
  indirizzo: string | null;
  vehicles: number;
  drivers: number;
  reputation: number;
  reviewsCount: number;
  badges: string[];
  isMine: boolean;
}

const badgeLabel: Record<string, string> = {
  ACCOUNT_VERIFICATO: "Verificato",
  PRIMO_VIAGGIO: "1° viaggio",
  FRECCIA: "Freccia",
  PUNTUALITA_ELEVATA: "Puntualità",
  DOCUMENTAZIONE_OK: "Doc. OK",
  REPUTAZIONE_TOP: "Top",
  SMART_RETURN: "Smart Return",
  SUBAPPALTO_OK: "Network",
};

export default function NetworkPage() {
  const [directory, setDirectory] = useState<NetworkCompany[] | null>(null);

  useEffect(() => {
    fetch("/api/network")
      .then((r) => r.json())
      .then((d) => setDirectory(d.directory ?? []))
      .catch(() => undefined);
  }, []);

  if (!directory) {
    return (
      <div className="flex items-center space-x-2 text-slate-400 text-sm p-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Caricamento network...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <Globe className="w-6 h-6 mr-2.5 text-blue-400" /> Network
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Directory delle aziende verificate con reputazione e badge.
            {directory.length} aziende nel network.
          </p>
        </div>
        <Link href="/dashboard/reviews" className="inline-flex items-center space-x-2 bg-amber-950/50 hover:bg-amber-950 border border-amber-800/60 text-amber-200 text-sm font-semibold px-4 py-2.5 rounded-xl transition">
          <Star className="w-4 h-4" />
          <span>Recensioni e reputazione</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {directory.map((c) => (
          <div
            key={c.companyId}
            className={`p-5 bg-slate-900 border rounded-2xl ${c.isMine ? "border-emerald-700/70" : "border-slate-800"}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100">{c.name}</h3>
              {c.isMine && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  TU
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">P.IVA {c.partitaIva}</p>
            {c.indirizzo && <p className="text-xs text-slate-500">{c.indirizzo}</p>}

            <div className="mt-3 flex items-center space-x-4 text-xs text-slate-400">
              <span className="flex items-center">
                <Star className="w-3.5 h-3.5 mr-1 text-amber-400" />
                <b className="text-slate-100">{c.reputation.toFixed(1)}</b>
                <span className="ml-1">({c.reviewsCount})</span>
              </span>
              <span className="flex items-center">
                <Truck className="w-3.5 h-3.5 mr-1 text-emerald-400" /> {c.vehicles}
              </span>
              <span className="flex items-center">
                <Users className="w-3.5 h-3.5 mr-1 text-blue-400" /> {c.drivers}
              </span>
            </div>

            {c.badges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.badges.map((b) => (
                  <span
                    key={b}
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60 inline-flex items-center"
                  >
                    <Award className="w-3 h-3 mr-1" /> {badgeLabel[b] ?? b}
                  </span>
                ))}
              </div>
            )}

            {c.isMine && (
              <div className="mt-3 flex items-center space-x-2 text-[11px] text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Profilo pubblico nel network</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

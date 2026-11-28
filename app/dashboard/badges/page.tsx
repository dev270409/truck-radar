"use client";

import { useEffect, useState } from "react";
import { Award, Loader2, CheckCircle2, Lock } from "lucide-react";

interface Badge {
  code: string;
  label: string;
  description: string;
  level: "base" | "pro" | "top";
  earnedAt: string | null;
}

const levelCls = (l: string) =>
  l === "top"
    ? "border-amber-500/70 bg-amber-950/40 text-amber-300"
    : l === "pro"
      ? "border-blue-600/70 bg-blue-950/40 text-blue-300"
      : "border-[var(--surface-border)] bg-[var(--surface-strong)] text-[var(--text-soft)]";

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[] | null>(null);

  useEffect(() => {
    fetch("/api/badges")
      .then((r) => r.json())
      .then((d) => setBadges(d.badges ?? []))
      .catch(() => undefined);
  }, []);

  if (!badges) {
    return (
      <div className="flex items-center space-x-2 text-[var(--text-label)] text-sm p-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Calcolo badge...
      </div>
    );
  }

  const earned = badges.filter((b) => b.earnedAt).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)] flex items-center">
            <Award className="w-6 h-6 mr-2.5 text-amber-400" /> Badge
          </h1>
          <p className="text-sm text-[var(--text-label)] mt-1">
            Badge automatici su criteri misurabili — nessuna assegnazione manuale.
          </p>
        </div>
        <span className="text-sm font-semibold text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 px-4 py-2 rounded-xl">
          {earned} / {badges.length} ottenuti
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {badges.map((b) => {
          const has = !!b.earnedAt;
          return (
            <div
              key={b.code}
              className={`p-5 bg-[var(--surface)] border rounded-xl ${has ? "border-emerald-800/60" : "border-[var(--surface-border)] opacity-70"}`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${levelCls(b.level)}`}>
                  {has ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Lock className="w-5 h-5 text-[var(--text-label-soft)]" />}
                </div>
                <span className="text-[11px]  font-semibold px-2 py-0.5 rounded bg-[var(--surface-strong)] text-[var(--text-label)]">
                  {b.level}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-[var(--text)]">{b.label}</h3>
              <p className="mt-1 text-xs text-[var(--text-label)]">{b.description}</p>
              <p className="mt-3 text-[11px] font-mono text-[var(--text-label-soft)]">
                {b.code}
              </p>
              <p className={`mt-1 text-xs font-semibold ${has ? "text-emerald-300" : "text-[var(--text-label-soft)]"}`}>
                {has
                  ? `Ottenuto il ${new Date(b.earnedAt!).toLocaleDateString("it-IT")}`
                  : "Da sbloccare"}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-[var(--text-label-soft)]">
        I badge sono visibili pubblicamente nel Network (profilo semipubblico con reputazione).
      </p>
    </div>
  );
}
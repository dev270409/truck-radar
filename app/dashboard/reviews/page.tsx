"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Star,
  MessageSquareQuote,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { label } from "@/lib/labels";

interface Recensione {
  id: string;
  tripId: string;
  role: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerName: string;
}

interface DaValutare {
  tripId: string;
  counterCompanyId: string;
  role: string;
  route?: string;
  dataRitiro?: string;
}

export default function ReviewsPage() {
  const [rep, setRep] = useState<{ avg: number; count: number } | null>(null);
  const [recensioni, setRecensioni] = useState<Recensione[]>([]);
  const [daValutare, setDaValutare] = useState<DaValutare[]>([]);
  const [altre, setAltre] = useState<DaValutare[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/reviews");
      if (!res.ok) return;
      const d = await res.json();
      setRep(d.reputazione);
      setRecensioni(d.recensioni ?? []);
      setDaValutare(d.daValutare ?? []);
      setAltre(d.precedentementeValutate ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (t: DaValutare) => {
    setSubmitting(t.tripId);
    setMsg("");
    const rating = ratings[t.tripId] ?? 0;
    if (rating < 1) {
      setMsg("Seleziona un punteggio (1-5 stelle).");
      setSubmitting(null);
      return;
    }
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: t.tripId, rating, comment: comments[t.tripId] ?? "" }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg(d.error ?? "Errore.");
        return;
      }
      setMsg("Recensione inviata. Verrà pubblicata dopo 7 giorni (finestra blind).");
      await load();
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-[var(--text-label)] text-sm p-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Caricamento recensioni...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)] flex items-center">
            <Star className="w-6 h-6 mr-2.5 text-amber-400" /> Recensioni
          </h1>
          <p className="text-sm text-[var(--text-label)] mt-1">
            Recensioni blind bidirezionali VETTORE↔COMMITTENTE dopo il subappalto (pubbliche dopo 7 giorni).
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between p-6 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
        <div>
          <p className="text-xs font-semibold text-[var(--text-label)] ">La tua reputazione</p>
          <div className="flex items-center space-x-2 mt-1">
            <h2 className="text-3xl font-semibold text-[var(--text)]">{rep?.avg.toFixed(1) ?? "—"}</h2>
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${Math.round(rep?.avg ?? 0) >= i ? "fill-current" : "opacity-25"}`}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-[var(--text-label-soft)] mt-1">{rep?.count ?? 0} recensioni pubblicate</p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-purple-300 bg-purple-950/40 border border-purple-800/60 rounded-xl px-4 py-2.5">
          <Sparkles className="w-4 h-4" />
          <span>Reputazione usata dai suggerimenti del network (subappalto).</span>
        </div>
      </div>

      {msg && (
        <p className="text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded-xl px-4 py-2.5">{msg}</p>
      )}

      {daValutare.length === 0 && altre.length === 0 && (
        <div className="p-8 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl text-center text-[var(--text-label)]">
          <MessageSquareQuote className="w-8 h-8 mx-auto mb-3 text-[var(--text-label-soft)]" />
          <p className="text-sm">
            Nessun trasporto subappaltato da recensire.
          </p>
        </div>
      )}

      {daValutare.length > 0 && (
        <div className="p-6 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
          <h3 className="text-base font-semibold text-[var(--text)] mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2 text-amber-400" /> Da recensire
          </h3>
          <div className="space-y-4">
            {daValutare.map((t) => (
              <div key={t.tripId} className="bg-[var(--surface-soft)] border border-[var(--surface-border)] rounded-xl p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-[var(--text)]">{t.route ?? "Trasporto"}</span>
                  <span className="text-[11px] font-semibold  px-2 py-0.5 rounded bg-indigo-950 text-indigo-300">
                    Tu: {label(t.role)}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      onClick={() => setRatings((m) => ({ ...m, [t.tripId]: i }))}
                      className={`${(ratings[t.tripId] ?? 0) >= i ? "text-amber-400" : "text-[var(--text-label-soft)]"} `}
                    >
                      <Star className={`w-6 h-6 ${(ratings[t.tripId] ?? 0) >= i ? "fill-current" : ""}`} />
                    </button>
                  ))}
                  <span className="text-xs text-[var(--text-label-soft)] ml-2">
                    {ratings[t.tripId] ? `${ratings[t.tripId]}/5` : "seleziona"}
                  </span>
                </div>
                <textarea
                  className="mt-3 w-full bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] h-20"
                  placeholder="Commento (facoltativo)"
                  value={comments[t.tripId] ?? ""}
                  onChange={(e) => setComments((m) => ({ ...m, [t.tripId]: e.target.value }))}
                />
                <button
                  onClick={() => submit(t)}
                  disabled={submitting === t.tripId}
                  className="mt-3 inline-flex items-center space-x-2 text-sm font-semibold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl"
                >
                  {submitting === t.tripId ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Invia recensione blind</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {recensioni.length > 0 && (
        <div className="p-6 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
          <h3 className="text-base font-semibold text-[var(--text)] mb-4">Recensioni su di te</h3>
          <ul className="space-y-3">
            {recensioni.map((r) => (
              <li key={r.id} className="bg-[var(--surface-soft)] border border-[var(--surface-border)] rounded-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className={`w-4 h-4 ${r.rating >= i ? "fill-current" : "opacity-25"}`} />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-[var(--text)]">{r.reviewerName}</span>
                    <span className="text-[11px]  font-semibold px-2 py-0.5 rounded bg-[var(--surface-strong)] text-[var(--text-label)]">
                      {label(r.role)}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-label-soft)]">
                    {new Date(r.createdAt).toLocaleDateString("it-IT")}
                  </span>
                </div>
                {r.comment && <p className="mt-2 text-sm text-[var(--text-soft)]">{r.comment}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {altre.length > 0 && (
        <div className="p-6 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
          <h3 className="text-base font-semibold text-[var(--text)] mb-2 flex items-center">
            <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-400" /> Già recensiti
          </h3>
          <ul className="space-y-2">
            {altre.map((t) => (
              <li key={t.tripId} className="text-sm text-[var(--text-label)] flex items-center justify-between bg-[var(--surface-soft)] border border-[var(--surface-border)] rounded-xl px-4 py-2.5">
                <span>{t.route ?? "Trasporto"}</span>
                <span className="text-[11px]  font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300">fatto</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-[var(--text-label-soft)]">
        Come funziona: dopo la conferma di un subappalto entrambe le parti possono recensire.
        La recensione resta nascosta 7 giorni (blind) e viene poi pubblicata automaticamente.
      </p>
    </div>
  );
}
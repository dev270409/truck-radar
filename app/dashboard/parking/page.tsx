"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MapPin,
  Loader2,
  ShieldCheck,
  Sun,
  Utensils,
  ShowerHead,
  Wifi,
  Plus,
  Star,
  CloudSun,
  Trash2,
} from "lucide-react";

interface ParkingArea {
  id: string;
  companyId: string;
  name: string;
  address: string;
  city: string | null;
  security: boolean;
  illuminated: boolean;
  restaurant: boolean;
  showers: boolean;
  wifi: boolean;
  ratingAvg: number;
  feedbackCount: number;
  myRating: number | null;
}

const empty: ParkingArea = {
  id: "",
  companyId: "",
  name: "",
  address: "",
  city: null,
  security: false,
  illuminated: false,
  restaurant: false,
  showers: false,
  wifi: true,
  ratingAvg: 0,
  feedbackCount: 0,
  myRating: null,
};

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center space-x-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= Math.round(value) ? "text-amber-400 fill-amber-400" : "text-slate-600"}`}
        />
      ))}
    </div>
  );
}

export default function ParkingPage() {
  const [areas, setAreas] = useState<ParkingArea[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ParkingArea>({ ...empty, name: "", address: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const load = useCallback(() => {
    fetch("/api/parking")
      .then((r) => r.json())
      .then((d) => setAreas(d.areas ?? []))
      .catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  const submit = async () => {
    if (!form.name.trim() || !form.address.trim()) {
      setMsg("Nome e indirizzo obbligatori.");
      return;
    }
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/parking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        address: form.address,
        city: form.city,
        security: form.security,
        illuminated: form.illuminated,
        restaurant: form.restaurant,
        showers: form.showers,
        wifi: form.wifi,
      }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.status === 201) {
      setShowForm(false);
      setForm({ ...empty });
      load();
    } else {
      setMsg(d.error ?? "Errore.");
    }
  };

  const rate = async (areaId: string) => {
    const rating = ratings[areaId];
    if (!rating) return;
    const r = await fetch(`/api/parking/${areaId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    if (r.status === 201) load();
  };

  const remove = async (areaId: string) => {
    const r = await fetch(`/api/parking/${areaId}`, { method: "DELETE" });
    if (r.status === 200) load();
  };

  const amenity = (ok: boolean, Icon: any, label: string) => (
    <span
      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded inline-flex items-center ${
        ok ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60" : "bg-slate-800 text-slate-500"
      }`}
    >
      <Icon className={`w-3 h-3 mr-1 ${ok ? "text-emerald-400" : "text-slate-600"}`} />
      {label}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <MapPin className="w-6 h-6 mr-2.5 text-emerald-400" /> Aree di Sosta
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Community (§47): parcheggi segnalati dalle aziende con sicurezza, servizi e feedback degli autisti.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" /> Segnala area
        </button>
      </div>

      {msg && <p className="text-sm text-rose-300">{msg}</p>}

      {showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-5 bg-slate-900 border border-slate-700 rounded-2xl">
          <input
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-slate-100 text-sm"
            placeholder="Nome (es. Sosta Monte Bianco)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-slate-100 text-sm"
            placeholder="Indirizzo"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <input
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-slate-100 text-sm"
            placeholder="Città (opzionale)"
            value={form.city ?? ""}
            onChange={(e) => setForm({ ...form, city: e.target.value || null })}
          />
          <div className="flex items-center justify-between text-xs text-slate-300">
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={form.security} onChange={(e) => setForm({ ...form, security: e.target.checked })} />
              <span>Sicurezza</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={form.illuminated} onChange={(e) => setForm({ ...form, illuminated: e.target.checked })} />
              <span>Illuminata</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={form.showers} onChange={(e) => setForm({ ...form, showers: e.target.checked })} />
              <span>Docce</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={form.restaurant} onChange={(e) => setForm({ ...form, restaurant: e.target.checked })} />
              <span>Ristorazione</span>
            </label>
          </div>
          <div className="flex space-x-3 md:col-span-2">
            <button
              onClick={submit}
              disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Salva area"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm text-slate-400 hover:text-slate-200 px-3"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {!areas ? (
        <div className="flex items-center space-x-2 text-slate-400 text-sm p-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Caricamento aree...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {areas.map((a) => (
            <div key={a.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-100">{a.name}</h3>
                <button onClick={() => remove(a.id)} title="Rimuovi (solo se l'hai creata tu)">
                  <Trash2 className="w-4 h-4 text-slate-600 hover:text-rose-400" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{a.address}</p>
              {a.city && <p className="text-xs text-slate-500 flex items-center"><CloudSun className="w-3 h-3 mr-1" />{a.city}</p>}

              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <Stars value={a.ratingAvg} />
                <span className="text-slate-500">{a.feedbackCount} feedback</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {amenity(a.security, ShieldCheck, "Sicurezza")}
                {amenity(a.illuminated, Sun, "Illuminata")}
                {amenity(a.showers, ShowerHead, "Docce")}
                {amenity(a.restaurant, Utensils, "Ristor")}
                {amenity(a.wifi, Wifi, "WiFi")}
              </div>

              {a.myRating ? (
                <p className="mt-3 text-[11px] text-emerald-300">
                  Hai valutato {a.myRating}/5
                </p>
              ) : (
                <div className="mt-3 flex items-center space-x-1">
                  <span className="text-[11px] text-slate-500 mr-1">Valuta:</span>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      onClick={() => rate(a.id)}
                      onMouseEnter={() => setRatings((m) => ({ ...m, [a.id]: i }))}
                    >
                      <Star
                        className={`w-4 h-4 ${i <= (ratings[a.id] ?? 0) ? "text-amber-400 fill-amber-400" : "text-slate-600"}`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
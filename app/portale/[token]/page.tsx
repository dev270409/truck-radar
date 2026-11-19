"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2, Package, Send, Truck } from "lucide-react";

interface PortalInfo {
  brandName: string;
  brandColor: string;
  companyName: string | null;
  phone: string | null;
}

export default function PortalePage() {
  const { token } = useParams<{ token: string }>();
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [goods, setGoods] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [volumeM3, setVolumeM3] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch(`/api/public/portal/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Portale non disponibile");
        setPortal(data.portal);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/public/portal/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          pickup,
          delivery,
          goods,
          weightKg: Number(weightKg || 0),
          volumeM3: Number(volumeM3 || 0),
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore invio ordine");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  }

  if (!portal) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-200">
        <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-amber-400" />
          <h1 className="text-lg font-bold">Portale non disponibile</h1>
          <p className="mt-2 text-sm text-slate-400">{error || "Il link non è attivo. Contatta il tuo vettore."}</p>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-200">
        <div className="max-w-md rounded-2xl border border-emerald-800 bg-emerald-950/30 p-8 text-center" style={{ borderColor: portal.brandColor }}>
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-400" />
          <h1 className="text-xl font-bold text-slate-100">Richiesta inviata</h1>
          <p className="mt-2 text-sm text-slate-300">
            {portal.brandName} ha ricevuto il tuo ordine. Ti ricontatteremo per la conferma.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-200">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl text-slate-950" style={{ background: portal.brandColor }}>
            <Truck className="h-6 w-6" />
          </span>
          <div>
            <p className="text-lg font-bold text-slate-100">{portal.brandName}</p>
            <p className="text-xs text-slate-400">Ordina un trasporto o chiedi un preventivo</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>}

        <form onSubmit={submit} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <input required placeholder="Nome e cognome *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" />
            <input type="email" placeholder="Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" />
            <input required placeholder="Luogo di ritiro *" value={pickup} onChange={(e) => setPickup(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" />
            <input required placeholder="Luogo di consegna *" value={delivery} onChange={(e) => setDelivery(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" />
            <input placeholder="Tipo merce" value={goods} onChange={(e) => setGoods(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Peso kg" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" />
              <input type="number" placeholder="Volume m³" value={volumeM3} onChange={(e) => setVolumeM3(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" />
            </div>
            <textarea placeholder="Note (orari, bancali, esigenze particolari)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 md:col-span-2" />
          </div>
          <button type="submit" disabled={sending} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50" style={{ background: portal.brandColor }}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Invia richiesta
          </button>
          <p className="mt-3 text-center text-[11px] text-slate-500">
            I dati vengono inviati solo a {portal.companyName || portal.brandName}. Non vengono usati per pubblicità.
          </p>
        </form>
      </div>
    </main>
  );
}

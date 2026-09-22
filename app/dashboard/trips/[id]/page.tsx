"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Route,
  Loader2,
  ArrowLeft,
  MapPin,
  ArrowRight,
  Truck,
  User,
  Euro,
  CalendarDays,
  Package,
  History,
  Save,
  StickyNote,
  FileText,
  Handshake,
  Star,
  Share2,
  Copy,
  Check,
  Link2,
} from "lucide-react";

interface SubSuggestion {
  companyId: string;
  name: string;
  partitaIva: string;
  vehicles: number;
  compatibili: number;
  capacityKg: number;
  capacitaOk: boolean;
  rating: number | null;
  reviewsCount: number;
}

interface SubProposal {
  id: string;
  tripId: string;
  carrierCompanyId: string;
  price: number | null;
  status: string;
  createdAt: string;
  carrier: { ragioneSociale: string; partitaIva: string } | null;
}

interface TripEvent {
  id: string;
  fromStatus: string;
  toStatus: string;
  note?: string | null;
  createdAt: string;
}

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
  prezzo?: number | null;
  costo?: number | null;
  note?: string | null;
  status: string;
  vehicle?: { id: string; targa: string; categoria: string } | null;
  driver?: { id: string; nome: string; cognome: string } | null;
  events: TripEvent[];
}

interface Driver {
  id: string;
  nome: string;
  cognome: string;
  role: string;
}

interface Vehicle {
  id: string;
  targa: string;
  categoria: string;
}

interface DdtDocument {
  id: string;
  tipo: string;
  fileUrl: string;
  note?: string | null;
  createdBy: string;
  createdAt: string;
}

interface TrackEvent {
  id: string;
  eventType: string;
  posizione?: string | null;
  note?: string | null;
  createdAt: string;
}

interface TripShare {
  id: string;
  tripId: string;
  token: string;
  enabled: boolean;
  note: string | null;
  createdAt: string;
  url: string;
  trip: string;
}

const statusStyles: Record<string, string> = {
  DA_ASSEGNARE: "bg-slate-950 text-slate-300 border border-slate-700",
  ASSEGNATO: "bg-indigo-950 text-indigo-300 border border-indigo-800/60",
  IN_CORSO: "bg-amber-950 text-amber-300 border border-amber-800/60",
  COMPLETATO: "bg-emerald-950 text-emerald-300 border border-emerald-800/60",
  ANNULLATO: "bg-red-950 text-red-300 border border-red-800/60",
  SUBAPPALTATO: "bg-purple-950 text-purple-300 border border-purple-800/60",
};

const nextTransitions: Record<string, string[]> = {
  DA_ASSEGNARE: ["ASSEGNATO", "ANNULLATO"],
  ASSEGNATO: ["IN_CORSO", "ANNULLATO", "SUBAPPALTATO"],
  IN_CORSO: ["COMPLETATO", "ANNULLATO"],
  COMPLETATO: [],
  ANNULLATO: [],
  SUBAPPALTATO: [],
};

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [cliente, setCliente] = useState("");
  const [prezzo, setPrezzo] = useState("");
  const [costo, setCosto] = useState("");
  const [note, setNote] = useState("");
  const [eventNote, setEventNote] = useState("");
  const [documents, setDocuments] = useState<DdtDocument[]>([]);
  const [trackEvents, setTrackEvents] = useState<TrackEvent[]>([]);
  const [subSuggestions, setSubSuggestions] = useState<SubSuggestion[]>([]);
  const [subProposals, setSubProposals] = useState<SubProposal[]>([]);
  const [subPrices, setSubPrices] = useState<Record<string, string>>({});
  const [subMsg, setSubMsg] = useState("");
  const [shares, setShares] = useState<TripShare[]>([]);
  const [shareMsg, setShareMsg] = useState("");
  const [shareNote, setShareNote] = useState("");
  const [creatingShare, setCreatingShare] = useState(false);
  const [copiedShare, setCopiedShare] = useState<string | null>(null);

  const loadShares = async () => {
    try {
      const res = await fetch(`/api/trip-shares?tripId=${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setShares(data.shares ?? []);
    } catch {
      /* silenzioso */
    }
  };

  const createShare = async () => {
    setCreatingShare(true);
    setShareMsg("");
    try {
      const res = await fetch("/api/trip-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: id, note: shareNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShareMsg(data.error ?? "Errore.");
        return;
      }
      setShareMsg("Link di tracking creato. Invialo al committente.");
      setShareNote("");
      await loadShares();
    } finally {
      setCreatingShare(false);
    }
  };

  const toggleShare = async (s: TripShare) => {
    setShareMsg("");
    const res = await fetch("/api/trip-shares", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, enabled: !s.enabled }),
    });
    if (res.ok) await loadShares();
  };

  const deleteShare = async (s: TripShare) => {
    setShareMsg("");
    const res = await fetch(`/api/trip-shares?id=${s.id}`, { method: "DELETE" });
    if (res.ok) await loadShares();
  };

  const copyShare = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedShare(url);
      setTimeout(() => setCopiedShare(null), 1500);
    } catch {
      /* silenzioso */
    }
  };

  const loadSubcontracts = async () => {
    try {
      const res = await fetch(`/api/subcontract?tripId=${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setSubSuggestions(data.suggerimenti ?? []);
      setSubProposals(data.proposte ?? []);
    } catch {
      /* silenzioso */
    }
  };

  const propose = async (sugg: SubSuggestion) => {
    setSubMsg("");
    const price = subPrices[sugg.companyId] ?? "";
    const res = await fetch(`/api/subcontract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripId: id,
        carrierCompanyId: sugg.companyId,
        price: price ? Number(price) : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSubMsg(data.error ?? "Errore nella proposta.");
      return;
    }
    setSubMsg(`Proposta inviata a ${sugg.name}.`);
    await loadSubcontracts();
  };

  const subAction = async (prop: SubProposal, action: "CONFERMA" | "RIFIUTA") => {
    setSubMsg("");
    const res = await fetch(`/api/subcontract/${prop.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSubMsg(data.error ?? "Errore.");
      return;
    }
    setSubMsg(
      action === "CONFERMA"
        ? `Subappalto confermato: il viaggio è ora SUBAPPALTATO.`
        : "Proposta rifiutata."
    );
    if (action === "CONFERMA" && data.trip) setTrip(data.trip);
    await load();
    await loadSubcontracts();
  };

  const load = async () => {
    try {
      const [resTrip, resV, resU, resDocs, resTrack] = await Promise.all([
        fetch(`/api/trips/${id}`),
        fetch("/api/vehicles"),
        fetch("/api/users"),
        fetch(`/api/trips/${id}/documents`),
        fetch(`/api/trips/${id}/tracking`),
      ]);
      const dataTrip = await resTrip.json();
      const dataV = await resV.json();
      const dataU = await resU.json();
      const dataDocs = await resDocs.json();
      const dataTrack = await resTrack.json();

      if (dataTrip.trip) {
        const t = dataTrip.trip as Trip;
        setTrip(t);
        setVehicleId(t.vehicle?.id ?? "");
        setDriverId(t.driver?.id ?? "");
        setCliente(t.cliente ?? "");
        setPrezzo(t.prezzo != null ? String(t.prezzo) : "");
        setCosto(t.costo != null ? String(t.costo) : "");
        setNote(t.note ?? "");
      }
      if (dataV.vehicles) setVehicles(dataV.vehicles);
      if (dataU.users) setDrivers(dataU.users.filter((u: Driver) => u.role === "AUTISTA"));
      if (dataDocs.documents) setDocuments(dataDocs.documents);
      if (dataTrack.events) setTrackEvents(dataTrack.events);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadSubcontracts();
    loadShares();
  }, [id]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/trips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleId || null,
          driverId: driverId || null,
          cliente,
          prezzo: prezzo || null,
          costo: costo || null,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio");
      setSuccess("Dati viaggio salvati.");
      setTrip(data.trip);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (toStatus: string) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/trips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: toStatus, eventNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel cambio stato");
      setSuccess(`Stato aggiornato a ${toStatus}.`);
      setEventNote("");
      setTrip(data.trip);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Caricamento viaggio...</span>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="p-12 text-center text-slate-500">
        Viaggio non trovato o non accessibile.
      </div>
    );
  }

  const margin = trip.prezzo != null ? trip.prezzo - (trip.costo ?? 0) : null;
  const allowed = nextTransitions[trip.status] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/trips"
            className="inline-flex items-center text-xs text-slate-400 hover:text-slate-200 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Torna ai viaggi
          </Link>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <Route className="w-6 h-6 mr-2.5 text-blue-400" />
            {trip.luogoRitiro} → {trip.luogoConsegna}
          </h1>
          <p className="text-sm text-slate-400 mt-1">{trip.tipoMerce}</p>
        </div>
        <span className={`text-xs font-bold px-4 py-2 rounded-full ${statusStyles[trip.status]}`}>
          {trip.status.replace("_", " ")}
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs rounded-xl">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info generali */}
        <div className="lg:col-span-2 space-y-6">
          {/* Route info */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-blue-400" /> Tratta e Pianificazione
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-300 uppercase mb-1">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Ritiro
                </label>
                <p className="text-sm text-slate-100 font-medium capitalize">{trip.luogoRitiro}</p>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  {new Date(trip.dataRitiro).toLocaleString("it-IT")}
                </p>
              </div>
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-300 uppercase mb-1">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-rose-400" /> Consegna
                </label>
                <p className="text-sm text-slate-100 font-medium capitalize">{trip.luogoConsegna}</p>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  {new Date(trip.dataConsegna).toLocaleString("it-IT")}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-4">
              <div className="flex items-start space-x-2">
                <Package className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-[11px] uppercase text-slate-500 font-semibold">Merce</p>
                  <p className="text-sm text-slate-200">{trip.tipoMerce}</p>
                  <p className="text-xs text-slate-400">
                    {trip.pesoKg} kg · {trip.volumeM3} m³
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <CalendarDays className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-[11px] uppercase text-slate-500 font-semibold">Cliente</p>
                  <p className="text-sm text-slate-200">{trip.cliente || "—"}</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Euro className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-[11px] uppercase text-slate-500 font-semibold">Margine</p>
                  <p className={`text-sm font-bold ${margin != null && margin >= 0 ? "text-emerald-300" : "text-slate-200"}`}>
                    {margin != null ? `€ ${margin.toFixed(2)}` : "—"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Ricavo € {trip.prezzo ?? 0} · Costo € {trip.costo ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Assegnazione */}
          <form onSubmit={handleAssign} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
              <Truck className="w-5 h-5 mr-2 text-emerald-400" /> Assegnazione & Economia
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-300 uppercase mb-1">
                  <Truck className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Mezzo assegnato
                </label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-100 outline-none font-mono text-xs"
                >
                  <option value="">-- Nessun mezzo --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.targa} · {v.categoria}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-300 uppercase mb-1">
                  <User className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Autista assegnato
                </label>
                <select
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-100 outline-none text-xs"
                >
                  <option value="">-- Nessun autista --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nome} {d.cognome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Cliente
                </label>
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Prezzo (€)
                  </label>
                  <input
                    type="number"
                    value={prezzo}
                    onChange={(e) => setPrezzo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Costo (€)
                  </label>
                  <input
                    type="number"
                    value={costo}
                    onChange={(e) => setCosto(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center text-xs font-semibold text-slate-300 uppercase mb-1">
                  <StickyNote className="w-3.5 h-3.5 mr-1 text-slate-400" /> Note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-100 outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-800 mt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold flex items-center space-x-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Salva Dati</span>
              </button>
            </div>
          </form>

          {/* Cambio stato */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
              <ArrowRight className="w-5 h-5 mr-2 text-blue-400" /> Variazioni di stato
            </h3>
            {allowed.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nessuna transizione disponibile per lo stato corrente.
              </p>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={eventNote}
                  onChange={(e) => setEventNote(e.target.value)}
                  placeholder="Nota per questa variazione (opzionale)"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  {allowed.map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatus(st)}
                      disabled={saving}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                        st === "ANNULLATO"
                          ? "bg-red-950/60 text-red-300 border border-red-800/60 hover:bg-red-900/60"
                          : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                    >
                      {st === "ASSEGNATO" ? "Segna Assegnato" : st.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        {/* Documenti DDT */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-emerald-400" /> Documenti DDT
            </h3>
            {documents.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nessun documento DDT inviato dall'autista.
              </p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 capitalize">{doc.tipo}</p>
                        {doc.note && <p className="text-xs text-slate-400 truncate">{doc.note}</p>}
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {new Date(doc.createdAt).toLocaleString("it-IT")}
                        </p>
                      </div>
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-emerald-300 hover:underline shrink-0"
                    >
Apri
                  </a>
                </li>
              ))}
            </ul>
          )}
          </div>

          {/* Tracking */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-blue-400" /> Tracking consegna
            </h3>
            {trackEvents.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nessun evento di tracking da parte dell'autista.
              </p>
            ) : (
              <>
                <div className="mb-4 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <p className="text-[11px] uppercase text-slate-500 font-semibold">Ultima posizione</p>
                  <p className="text-sm font-semibold text-slate-100 capitalize">
                    {trackEvents[trackEvents.length - 1].posizione || "—"}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                    {new Date(trackEvents[trackEvents.length - 1].createdAt).toLocaleString("it-IT")}
                  </p>
                </div>
                <ol className="relative border-l border-slate-800 ml-2 space-y-4">
                  {trackEvents.map((ev) => (
                    <li key={ev.id} className="ml-4">
                      <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-blue-300">
                          {ev.eventType.replace("_", " ")}
                        </span>
                        {ev.posizione && <span className="text-xs text-slate-300">{ev.posizione}</span>}
                      </div>
                      {ev.note && <p className="text-xs text-slate-400 mt-0.5">{ev.note}</p>}
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {new Date(ev.createdAt).toLocaleString("it-IT")}
                      </p>
                    </li>
                  ))}
                </ol>
</>
          )}
        </div>

        {/* Vista Committente (§53) */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <h3 className="text-base font-bold text-slate-100 mb-1 flex items-center">
            <Share2 className="w-5 h-5 mr-2 text-sky-400" /> Vista Committente
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Condividi con il committente una pagina di tracking (posizione, stato consegna, DDT) senza dargli accesso al pannello.
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input
              type="text"
              value={shareNote}
              onChange={(e) => setShareNote(e.target.value)}
              placeholder="Nota per il committente (opzionale)"
              className="flex-1 min-w-52 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-2 text-slate-100 outline-none text-sm"
            />
            <button
              onClick={createShare}
              disabled={creatingShare}
              className="text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl disabled:opacity-50 flex items-center space-x-1.5"
            >
              {creatingShare ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              <span>Genera link</span>
            </button>
          </div>

          {shareMsg && (
            <p className="mb-3 text-xs text-sky-300 bg-sky-950/40 border border-sky-800/60 rounded-xl px-3 py-2">
              {shareMsg}
            </p>
          )}

          {shares.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nessun link condiviso per questo viaggio.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {shares.map((s) => (
                <li key={s.id} className="flex items-center justify-between flex-wrap gap-2 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-slate-300 break-all">{s.url}</p>
                    {s.note && <p className="text-[11px] text-slate-400 mt-0.5">{s.note}</p>}
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      creato il {new Date(s.createdAt).toLocaleString("it-IT")} ·{" "}
                      <span className={s.enabled ? "text-emerald-400" : "text-red-400"}>
                        {s.enabled ? "attivo" : "disattivato"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyShare(s.url)}
                      className="text-xs bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg"
                      title="Copia link"
                    >
                      {copiedShare === s.url ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-sky-300 hover:underline px-2 py-1.5"
                    >
                      Apri anteprima
                    </a>
                    <button
                      onClick={() => toggleShare(s)}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${
                        s.enabled
                          ? "bg-amber-950 text-amber-300 border-amber-800/60 hover:bg-amber-900"
                          : "bg-emerald-950 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900"
                      }`}
                    >
                      {s.enabled ? "Disattiva" : "Riattiva"}
                    </button>
                    <button
                      onClick={() => deleteShare(s)}
                      className="text-xs font-semibold bg-red-950 text-red-300 border border-red-800/60 hover:bg-red-900 px-2.5 py-1.5 rounded-lg"
                    >
                      Elimina
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Subappalto & Vettori */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
            <Handshake className="w-5 h-5 mr-2 text-purple-400" /> Subappalto & Vettori
          </h3>

          {trip.status === "SUBAPPALTATO" ? (
            <div className="p-3 bg-purple-950/60 border border-purple-800 text-purple-200 text-sm rounded-xl">
              <p className="font-semibold">Viaggio subappaltato a vettore esterno.</p>
              <p className="text-xs text-purple-300/80 mt-1">
                {subProposals.find((p) => p.status === "CONFERMATO")?.carrier?.ragioneSociale ??
                  "Vettore del network"}
                {" · "}
                {subProposals.find((p) => p.status === "CONFERMATO")?.price != null
                  ? `€ ${subProposals.find((p) => p.status === "CONFERMATO")?.price}`
                  : "prezzo da accordi privati"}
              </p>
            </div>
          ) : (
            <>
              {subProposals.length > 0 && (
                <div className="space-y-2 mb-5">
                  {subProposals.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between flex-wrap gap-2 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-100">
                          {p.carrier?.ragioneSociale ?? "Vettore"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {p.price != null ? `€ ${p.price.toLocaleString("it-IT")}` : "prezzo da definire"} ·{" "}
                          {new Date(p.createdAt).toLocaleString("it-IT")}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            p.status === "CONFERMATO"
                              ? "bg-emerald-950 text-emerald-300"
                              : p.status === "RIFIUTATO"
                                ? "bg-red-950 text-red-300"
                                : "bg-amber-950 text-amber-300"
                          }`}
                        >
                          {p.status}
                        </span>
                        {p.status === "PROPOSTO" && (
                          <>
                            <button
                              onClick={() => subAction(p, "CONFERMA")}
                              className="text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1.5 rounded-lg hover:bg-emerald-900"
                            >
                              Conferma
                            </button>
                            <button
                              onClick={() => subAction(p, "RIFIUTA")}
                              className="text-xs font-semibold bg-red-950 text-red-300 border border-red-800 px-3 py-1.5 rounded-lg hover:bg-red-900"
                            >
                              Rifiuta
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {subMsg && (
                <p className="mb-4 text-xs text-purple-300 bg-purple-950/40 border border-purple-800/60 rounded-xl px-3 py-2">
                  {subMsg}
                </p>
              )}

              {subSuggestions.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nessun vettore verificato disponibile sul network per questo viaggio.
                </p>
              ) : (
                <>
                  <p className="text-xs text-slate-400 mb-3">
                    Suggerimenti dal network (solo analisi: la decisione resta tua). Scegli un vettore e proponi il subappalto.
                  </p>
                  <div className="space-y-2.5">
                    {subSuggestions.map((s) => (
                      <div
                        key={s.companyId}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-100">
                              {s.name}
                              {s.rating != null && (
                                <span className="ml-2 inline-flex items-center text-amber-300">
                                  <Star className="w-3.5 h-3.5 mr-0.5" />
                                  {s.rating.toFixed(1)}
                                  {s.reviewsCount > 0 && ` (${s.reviewsCount})`}
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              P.IVA {s.partitaIva} · {s.vehicles} mezzi disponibili, {s.compatibili} compatibili · cap. {s.capacityKg.toLocaleString("it-IT")} kg
                              {!s.capacitaOk && (
                                <span className="ml-2 text-red-400 font-semibold">capacità insufficiente</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2.5 flex items-center space-x-2">
                          <input
                            type="number"
                            placeholder="Prezzo €"
                            className="w-32 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-100"
                            value={subPrices[s.companyId] ?? ""}
                            onChange={(e) =>
                              setSubPrices((m) => ({ ...m, [s.companyId]: e.target.value }))
                            }
                          />
                          <button
                            onClick={() => propose(s)}
                            disabled={!s.capacitaOk}
                            className="text-xs font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg"
                          >
                            Proponi subappalto
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

        {/* Timeline eventi */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl h-fit">
          <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
            <History className="w-5 h-5 mr-2 text-blue-400" /> Cronologia
          </h3>
          {trip.events.length === 0 ? (
            <p className="text-sm text-slate-500">Nessun evento registrato.</p>
          ) : (
            <ol className="relative border-l border-slate-800 ml-2 space-y-5">
              {trip.events.map((ev) => (
                <li key={ev.id} className="ml-4">
                  <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <div className="flex items-center space-x-2 text-xs">
                    <span className={`font-bold px-2 py-0.5 rounded ${statusStyles[ev.fromStatus]}`}>
                      {ev.fromStatus.replace("_", " ")}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span className={`font-bold px-2 py-0.5 rounded ${statusStyles[ev.toStatus]}`}>
                      {ev.toStatus.replace("_", " ")}
                    </span>
                  </div>
                  {ev.note && <p className="text-xs text-slate-400 mt-1">{ev.note}</p>}
                  <p className="text-[11px] font-mono text-slate-500 mt-1">
                    {new Date(ev.createdAt).toLocaleString("it-IT")}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
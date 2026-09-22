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
  Package,
  CalendarDays,
  Play,
  Flag,
  History,
  StickyNote,
  FileText,
  Upload,
  ClipboardCheck,
  Send,
} from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";

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
  note?: string | null;
  status: string;
  vehicle?: { id: string; targa: string; categoria: string; portataMaxKg: number; volumeMaxM3: number } | null;
  events: TripEvent[];
}

interface DdtDocument {
  id: string;
  tipo: string;
  fileUrl: string;
  note?: string | null;
  createdAt: string;
}

interface TrackEvent {
  id: string;
  eventType: string;
  posizione?: string | null;
  note?: string | null;
  createdAt: string;
}

const statusStyles: Record<string, string> = {
  DA_ASSEGNARE: "bg-slate-950 text-slate-300 border border-slate-700",
  ASSEGNATO: "bg-indigo-950 text-indigo-300 border border-indigo-800/60",
  IN_CORSO: "bg-amber-950 text-amber-300 border border-amber-800/60",
  COMPLETATO: "bg-emerald-950 text-emerald-300 border border-emerald-800/60",
  ANNULLATO: "bg-red-950 text-red-300 border border-red-800/60",
  SUBAPPALTATO: "bg-purple-950 text-purple-300 border border-purple-800/60",
};

export default function AutistaTripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [eventNote, setEventNote] = useState("");

  // DDT state
  const [documents, setDocuments] = useState<DdtDocument[]>([]);
  const [ddtTipo, setDdtTipo] = useState("FOTO");
  const [ddtNote, setDdtNote] = useState("");
  const [ddtFileUrl, setDdtFileUrl] = useState("");
  const [ddtUploading, setDdtUploading] = useState(false);

  // Tracking state
  const [trackEvents, setTrackEvents] = useState<TrackEvent[]>([]);
  const [trackTipo, setTrackTipo] = useState("POSIZIONE");
  const [trackPosizione, setTrackPosizione] = useState("");
  const [trackNote, setTrackNote] = useState("");
  const [trackSaving, setTrackSaving] = useState(false);

  // Inspection checklist state
  const [inspectTemplate, setInspectTemplate] = useState<{ id: string; name: string; items: { label: string }[] } | null>(null);
  const [inspectChecks, setInspectChecks] = useState<Record<string, boolean>>({});
  const [inspectNote, setInspectNote] = useState("");
  const [inspectSaving, setInspectSaving] = useState(false);
  const [inspectSent, setInspectSent] = useState(false);
  const [inspectError, setInspectError] = useState("");

  const load = async () => {
    try {
      const res = await fetch(`/api/autista/trips/${id}`);
      const data = await res.json();
      if (data.trip) setTrip(data.trip);
      const resDocs = await fetch(`/api/trips/${id}/documents`);
      const dataDocs = await resDocs.json();
      if (dataDocs.documents) setDocuments(dataDocs.documents);
      const resTrack = await fetch(`/api/trips/${id}/tracking`);
      const dataTrack = await resTrack.json();
      if (dataTrack.events) setTrackEvents(dataTrack.events);
      const resInsp = await fetch("/api/inspections?action=template");
      const dataInsp = await resInsp.json();
      if (dataInsp.template) {
        setInspectTemplate(dataInsp.template);
        const checks: Record<string, boolean> = {};
        dataInsp.template.items.forEach((i: { label: string }) => {
          checks[i.label] = true;
        });
        setInspectChecks(checks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleStatus = async (toStatus: string) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/autista/trips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: toStatus, eventNote: eventNote || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nell'aggiornamento");
      setSuccess(
        toStatus === "IN_CORSO"
          ? "Viaggio iniziato. Buon viaggio!"
          : "Consegna registrata. Viaggio completato."
      );
      setEventNote("");
      setTrip(data.trip);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDdtUpload = async () => {
    setError("");
    setSuccess("");
    if (!ddtFileUrl) {
      setError("Seleziona prima un file.");
      return;
    }
    setDdtUploading(true);
    try {
      const res = await fetch(`/api/trips/${id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: ddtTipo, fileUrl: ddtFileUrl, note: ddtNote || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nell'invio del DDT");
      setSuccess("Documento DDT inviato. L'ufficio può consultarlo subito.");
      setDdtFileUrl("");
      setDdtNote("");
      setDocuments((prev) => [...prev, data.document]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDdtUploading(false);
    }
  };

  const handleTrackSend = async () => {
    setError("");
    setSuccess("");
    if (trackTipo === "POSIZIONE" && (!trackPosizione || trackPosizione.length < 2)) {
      setError("Indica la posizione (es. Autogrill Roma Nord).");
      return;
    }
    setTrackSaving(true);
    try {
      const res = await fetch(`/api/trips/${id}/tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: trackTipo,
          posizione: trackPosizione || null,
          note: trackNote || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nell'invio del tracking");
      setSuccess("Aggiornamento tracking inviato.");
      setTrackEvents((prev) => [...prev, data.event]);
      setTrackPosizione("");
      setTrackNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTrackSaving(false);
    }
  };

  const handleInspectionSend = async () => {
    setInspectError("");
    if (!inspectTemplate || !trip?.vehicle) {
      setInspectError("Template o veicolo non disponibile.");
      return;
    }
    const items = inspectTemplate.items.map((i) => ({
      label: i.label,
      ok: inspectChecks[i.label] !== false,
    }));
    setInspectSaving(true);
    try {
      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: trip.vehicle.id,
          tripId: trip.id,
          templateId: inspectTemplate.id,
          items,
          note: inspectNote || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nell'invio della check-list");
      setInspectSent(true);
      setSuccess("Check-list pre-partenza inviata alla sede.");
    } catch (err) {
      setInspectError(err instanceof Error ? err.message : String(err));
    } finally {
      setInspectSaving(false);
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
      <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl max-w-md mx-auto">
        Viaggio non trovato o non assegnato a te.
      </div>
    );
  }

  const isAssigned = trip.status === "ASSEGNATO";
  const isInCorso = trip.status === "IN_CORSO";
  const actionable = isAssigned || isInCorso;

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div>
        <Link
          href="/dashboard/autista"
          className="inline-flex items-center text-xs text-slate-400 hover:text-slate-200 mb-2 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Torna ai miei viaggi
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <Route className="w-6 h-6 mr-2.5 text-blue-400" />
            {trip.luogoRitiro} → {trip.luogoConsegna}
          </h1>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusStyles[trip.status]}`}>
            {trip.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs rounded-xl">
          {success}
        </div>
      )}

      {/* Azione principale */}
      {actionable ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-100">
            {isAssigned ? "Pronto a partire?" : "Merce consegnata?"}
          </h3>
          <input
            type="text"
            value={eventNote}
            onChange={(e) => setEventNote(e.target.value)}
            placeholder="Nota per l'aggiornamento (opzionale)"
            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-slate-100 outline-none text-sm"
          />
          {isAssigned ? (
            <button
              onClick={() => handleStatus("IN_CORSO")}
              disabled={saving}
              className="w-full flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold py-3.5 rounded-xl transition disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>Parti con il carico</span>
            </button>
          ) : (
            <button
              onClick={() => handleStatus("COMPLETATO")}
              disabled={saving}
              className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-3.5 rounded-xl transition disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
              <span>Registra consegna</span>
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-sm text-slate-400">
          Nessuna azione disponibile per questo viaggio.
        </div>
      )}

      {/* Dettagli */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase text-slate-500 font-semibold flex items-center">
              <MapPin className="w-3 h-3 mr-1 text-emerald-400" /> Ritiro
            </p>
            <p className="text-sm font-semibold text-slate-100 capitalize">{trip.luogoRitiro}</p>
            <p className="text-xs font-mono text-slate-400">
              {new Date(trip.dataRitiro).toLocaleString("it-IT")}
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500" />
          <div className="text-right">
            <p className="text-[11px] uppercase text-slate-500 font-semibold flex items-center justify-end">
              Consegna <MapPin className="w-3 h-3 ml-1 text-rose-400" />
            </p>
            <p className="text-sm font-semibold text-slate-100 capitalize">{trip.luogoConsegna}</p>
            <p className="text-xs font-mono text-slate-400">
              {new Date(trip.dataConsegna).toLocaleString("it-IT")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-sm">
          <div className="flex items-start space-x-2">
            <Package className="w-4 h-4 text-slate-400 mt-0.5" />
            <div>
              <p className="text-[11px] uppercase text-slate-500 font-semibold">Merce</p>
              <p className="text-slate-200">{trip.tipoMerce}</p>
              <p className="text-xs text-slate-400">
                {trip.pesoKg} kg · {trip.volumeM3} m³
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <Truck className="w-4 h-4 text-slate-400 mt-0.5" />
            <div>
              <p className="text-[11px] uppercase text-slate-500 font-semibold">Mezzo</p>
              {trip.vehicle ? (
                <>
                  <p className="text-slate-200 font-mono text-xs">{trip.vehicle.targa}</p>
                  <p className="text-xs text-slate-400">
                    {trip.vehicle.categoria} · {trip.vehicle.portataMaxKg} kg max
                  </p>
                </>
              ) : (
                <p className="text-slate-400">—</p>
              )}
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <CalendarDays className="w-4 h-4 text-slate-400 mt-0.5" />
            <div>
              <p className="text-[11px] uppercase text-slate-500 font-semibold">Cliente</p>
              <p className="text-slate-200">{trip.cliente || "—"}</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <StickyNote className="w-4 h-4 text-slate-400 mt-0.5" />
            <div>
              <p className="text-[11px] uppercase text-slate-500 font-semibold">Note</p>
              <p className="text-slate-300">{trip.note || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* DDT digitale */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-emerald-400" /> DDT Digitale
        </h3>

        {(trip.status === "IN_CORSO" || trip.status === "COMPLETATO") && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {["FOTO", "FIRMA", "DOCUMENTO"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDdtTipo(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    ddtTipo === t
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {t === "FOTO" ? "Foto" : t === "FIRMA" ? "Firma" : "Documento"}
                </button>
              ))}
            </div>
            <UploadButton
              endpoint="ddtPhoto"
              onClientUploadComplete={(res) => {
                const url = res?.[0]?.url;
                if (url) setDdtFileUrl(url);
                setSuccess("File caricato. Conferma l'invio del documento.");
              }}
              onUploadError={(err: Error) => setError(`Upload fallito: ${err.message}`)}
            />
            {ddtFileUrl && (
              <a
                href={ddtFileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-xs text-emerald-300 hover:underline"
              >
                <Upload className="w-3.5 h-3.5 mr-1" /> File selezionato — anteprima
              </a>
            )}
            <input
              type="text"
              value={ddtNote}
              onChange={(e) => setDdtNote(e.target.value)}
              placeholder="Nota (opzionale)"
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-100 outline-none text-sm"
            />
            <button
              onClick={handleDdtUpload}
              disabled={ddtUploading}
              className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-3 rounded-xl transition disabled:opacity-60"
            >
              {ddtUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              <span>Invia DDT all'ufficio</span>
            </button>
          </div>
        )}

        {documents.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nessun documento DDT per questo viaggio.
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
                  </div>
                </div>
                <div className="flex items-center space-x-3 shrink-0">
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(doc.createdAt).toLocaleDateString("it-IT")}
                  </span>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-emerald-300 hover:underline"
                  >
                    Apri
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tracking */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-blue-400" /> Tracking consegna
        </h3>

        {trip.status === "IN_CORSO" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                { k: "POSIZIONE", l: "Posizione" },
                { k: "CARICO", l: "Carico" },
                { k: "SOSTA", l: "Sosta" },
                { k: "SCARICO", l: "Scarico" },
                { k: "STATO_CONSEGNA", l: "Consegna" },
              ].map((t) => (
                <button
                  key={t.k}
                  type="button"
                  onClick={() => setTrackTipo(t.k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    trackTipo === t.k
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={trackPosizione}
              onChange={(e) => setTrackPosizione(e.target.value)}
              placeholder="Posizione (es. Milano, Autogrill — indirizzo)"
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-slate-100 outline-none text-sm"
            />
            <input
              type="text"
              value={trackNote}
              onChange={(e) => setTrackNote(e.target.value)}
              placeholder="Nota (opzionale)"
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-slate-100 outline-none text-sm"
            />
            <button
              onClick={handleTrackSend}
              disabled={trackSaving}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-3 rounded-xl transition disabled:opacity-60"
            >
              {trackSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              <span>Aggiorna posizione / stato</span>
            </button>
          </div>
        )}

        {(isAssigned || isInCorso) && inspectTemplate && (
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-emerald-300 flex items-center">
                <ClipboardCheck className="w-4 h-4 mr-2" /> {inspectTemplate.name}
              </h4>
              {inspectSent && (
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                  INVIATA
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Conferma ogni voce prima della partenza. Almeno una voce non ok genera un esito critico.
            </p>
            <div className="space-y-2">
              {inspectTemplate.items.map((item) => (
                <label
                  key={item.label}
                  className="flex items-start justify-between gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer"
                >
                  <span className="text-sm text-slate-200">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={inspectChecks[item.label] !== false}
                    onChange={(e) =>
                      setInspectChecks((prev) => ({ ...prev, [item.label]: e.target.checked }))
                    }
                    className="w-4 h-4 mt-0.5 accent-emerald-500"
                  />
                </label>
              ))}
            </div>
            <input
              type="text"
              value={inspectNote}
              onChange={(e) => setInspectNote(e.target.value)}
              placeholder="Note o criticità (opzionale)"
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-slate-100 outline-none text-sm"
            />
            {inspectError && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">{inspectError}</div>
            )}
            <button
              onClick={handleInspectionSend}
              disabled={inspectSaving || inspectSent}
              className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-3 rounded-xl transition disabled:opacity-60"
            >
              {inspectSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{inspectSent ? "Check-list inviata" : "Invia check-list pre-partenza"}</span>
            </button>
          </div>
        )}

        {trackEvents.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun evento di tracking.</p>
        ) : (
          <ol className="relative border-l border-slate-800 ml-2 space-y-4">
            {trackEvents.map((ev) => (
              <li key={ev.id} className="ml-4">
                <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-blue-500" />
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-blue-300">{ev.eventType.replace("_", " ")}</span>
                  {ev.posizione && <span className="text-xs text-slate-300">{ev.posizione}</span>}
                </div>
                {ev.note && <p className="text-xs text-slate-400 mt-0.5">{ev.note}</p>}
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  {new Date(ev.createdAt).toLocaleString("it-IT")}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
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
  );
}
import Link from "next/link";
import {
  Truck,
  MapPin,
  ArrowRight,
  Package,
  ShieldCheck,
  FileText,
  Route,
  Clock,
  Loader2,
} from "lucide-react";
import { db } from "@/lib/db";
import { getTripShareByToken } from "@/lib/trip-share";
import { listTrackingEvents } from "@/lib/raw-tables";

const statusStyles: Record<string, string> = {
  DA_ASSEGNARE: "bg-slate-950 text-slate-300 border border-slate-700",
  ASSEGNATO: "bg-indigo-950 text-indigo-300 border border-indigo-800/60",
  IN_CORSO: "bg-amber-950 text-amber-300 border border-amber-800/60",
  COMPLETATO: "bg-emerald-950 text-emerald-300 border border-emerald-800/60",
  ANNULLATO: "bg-red-950 text-red-300 border border-red-800/60",
  SUBAPPALTATO: "bg-purple-950 text-purple-300 border border-purple-800/60",
};

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const share = await getTripShareByToken(token);

  if (!share) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl">
          <ShieldCheck className="w-10 h-10 mx-auto text-red-400 mb-3" />
          <h1 className="text-lg font-bold">Link non valido o disattivato</h1>
          <p className="text-sm text-slate-400 mt-2">
            Il link di tracking non è più attivo. Contatta il vettore per un nuovo link.
          </p>
          <Link href="/" className="inline-block mt-4 text-sm text-blue-400 hover:text-blue-300">
            Torna alla home
          </Link>
        </div>
      </main>
    );
  }

  // Vista committente: SOLO i dati autorizzati del viaggio condiviso, con isolamento tenant.
  const trip = await db.trip.findFirst({
    where: { id: share.tripId },
    include: { vehicle: true, driver: true },
  });

  if (!trip) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl">
          <p className="text-sm text-slate-400">Spedizione non trovata.</p>
        </div>
      </main>
    );
  }

  const tracking = await listTrackingEvents(share.companyId, trip.id);
  const documents = (await db.$queryRawUnsafe(
    `SELECT "tipo", "fileUrl", "note", "createdAt" FROM "TripDocument" WHERE "tripId" = $1 AND "companyId" = $2 ORDER BY "createdAt" DESC`,
    trip.id,
    share.companyId
  )) as Array<{ tipo: string; fileUrl: string; note: string | null; createdAt: Date }>;

  const last = tracking.length > 0 ? tracking[tracking.length - 1] : null;
  const completed = trip.status === "COMPLETATO";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs">Pagina ufficiale di tracking spedizione</span>
          </div>
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-200">
            Truck Radar
          </Link>
        </div>

        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">
                Spedizione: {trip.luogoRitiro} <ArrowRight className="w-5 h-5 inline text-slate-500" /> {trip.luogoConsegna}
              </h1>
              <p className="text-sm text-slate-400 mt-1 flex items-center">
                <Package className="w-3.5 h-3.5 mr-1.5" /> {trip.tipoMerce} · {trip.pesoKg} kg · {trip.volumeM3} m³
              </p>
            </div>
            <span className={`text-xs font-bold px-4 py-2 rounded-full ${statusStyles[trip.status]}`}>
              {trip.status.replace("_", " ")}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div>
              <p className="text-[11px] uppercase text-slate-500 font-semibold">Ultima posizione</p>
              <p className="text-xl font-bold text-blue-300 mt-1 flex items-center">
                <MapPin className="w-5 h-5 mr-1.5 text-blue-400" />
                {last?.posizione || (completed ? "Consegnata" : "In attesa del primo aggiornamento")}
              </p>
              {last && (
                <p className="text-xs font-mono text-slate-500 mt-1">
                  {new Date(last.createdAt).toLocaleString("it-IT")}
                  {last.note ? ` · ${last.note}` : ""}
                </p>
              )}
            </div>
            <div>
              <p className="text-[11px] uppercase text-slate-500 font-semibold">Stato consegna</p>
              <p className="text-xl font-bold text-emerald-300 mt-1 flex items-center">
                <Clock className="w-5 h-5 mr-1.5 text-emerald-400" />
                {completed ? "Consegnata al destinatario" : trip.status === "IN_CORSO" ? "In viaggio verso il destinatario" : trip.status === "ASSEGNATO" ? "Assegnata, partenza imminente" : "In preparazione"}
              </p>
            </div>
          </div>

          {trip.vehicle?.targa && (
            <p className="text-xs text-slate-400 mt-4 flex items-center">
              <Truck className="w-3.5 h-3.5 mr-1.5" /> Mezzo: {trip.vehicle.targa}
              {trip.driver ? ` · Autista: ${trip.driver.nome} ${trip.driver.cognome}` : ""}
            </p>
          )}
        </div>

        {tracking.length > 0 && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl mt-6">
            <h2 className="text-sm font-bold text-slate-100 mb-4 flex items-center">
              <Route className="w-4 h-4 mr-2 text-blue-400" /> Avanzamento della spedizione
            </h2>
            <ol className="relative border-l border-slate-800 ml-2 space-y-4">
              {tracking.map((ev) => (
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
          </div>
        )}

        {documents.length > 0 && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl mt-6">
            <h2 className="text-sm font-bold text-slate-100 mb-4 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-emerald-400" /> Documenti di consegna (DDT)
            </h2>
            <ul className="space-y-2">
              {documents.map((doc, i) => (
                <li key={i} className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-slate-100 capitalize">{doc.tipo}</p>
                    {doc.note && <p className="text-xs text-slate-400">{doc.note}</p>}
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                      {new Date(doc.createdAt).toLocaleString("it-IT")}
                    </p>
                  </div>
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-300 hover:underline">
                    Apri
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[11px] text-slate-500 mt-8">
          Informazioni messe a disposizione dal vettore secondo le autorizzazioni e i contratti in essere.
        </p>
      </div>
    </main>
  );
}
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTenantDb } from "@/lib/tenant";
import { db } from "@/lib/db";
import type { Vehicle, VehicleDocument } from "@prisma/client";
import {
  Car,
  Users,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  FileWarning,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";
import VerificationCard from "@/components/VerificationCard";
import StripeCheckoutCard from "@/components/StripeCheckoutCard";
import ComingSoonCard from "@/components/ComingSoonCard";

const daysUntil = (iso: Date) =>
  Math.ceil((iso.getTime() - Date.now()) / 86400000);

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.companyId) return null;
  if (session.user.role === "AUTISTA") {
    redirect("/dashboard/autista");
  }

  const tenantDb = getTenantDb(session.user.companyId);

  const [company, vehicles, users, kycDocs] = await Promise.all([
    db.company.findUnique({ where: { id: session.user.companyId } }),
    tenantDb.vehicles.findMany({ include: { documents: true } }) as Promise<
      Array<Vehicle & { documents: VehicleDocument[] }>
    >,
    tenantDb.users.findMany(),
    tenantDb.kycDocuments.findMany(),
  ]);

  const availableVehicles = vehicles.filter((v) => v.status === "DISPONIBILE").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          Benvenuto, {session.user.nome}! 👋
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Panoramica generale della flotta e delle operazioni per{" "}
          <span className="text-blue-300 font-semibold">{company?.ragioneSociale}</span>.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Vehicles */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Veicoli Totali</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{vehicles.length}</h3>
              <p className="text-xs text-emerald-400 mt-1 font-medium">
                {availableVehicles} Disponibili
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-950/80 border border-emerald-800/60 rounded-xl flex items-center justify-center text-emerald-400">
              <Car className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Users */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Utenti Registrati</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{users.length}</h3>
              <p className="text-xs text-indigo-400 mt-1 font-medium">
                {users.filter((u) => u.role === "AUTISTA").length} Autisti
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-950/80 border border-indigo-800/60 rounded-xl flex items-center justify-center text-indigo-400">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Subscription Status */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stato Abbonamento</p>
              <h3 className="text-xl font-bold text-amber-300 mt-1 uppercase">{company?.subscriptionStatus}</h3>
              <p className="text-xs text-slate-400 mt-1">30 Giorni di Prova</p>
            </div>
            <div className="w-12 h-12 bg-amber-950/80 border border-amber-800/60 rounded-xl flex items-center justify-center text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* KYC Document Status */}
        <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stato Verifica KYC</p>
              {(() => {
                const pending = kycDocs.filter((d) => d.status === "IN_ATTESA").length;
                const rejected = kycDocs.filter((d) => d.status === "RIFIUTATO").length;
                const done = kycDocs.length - pending - rejected;
                if (kycDocs.length > 0 && pending === 0 && rejected === 0) {
                  return (
                    <>
                      <h3 className="text-xl font-bold text-emerald-300 mt-1">VERIFICATA</h3>
                      <p className="text-xs text-slate-400 mt-1">{done} Documenti Approvati</p>
                    </>
                  );
                }
                return (
                  <>
                    <h3
                      className={`text-xl font-bold mt-1 ${rejected > 0 ? "text-red-300" : "text-amber-300"}`}
                    >
                      {pending > 0 ? "IN ATTESA" : "RIFIUTATA"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {pending} in attesa · {done} verificati{pending > 0 ? " · Vai alla verifica" : ""}
                    </p>
                  </>
                );
              })()}
            </div>
            <a
              href="/dashboard/kyc"
              className="w-12 h-12 bg-blue-950/80 border border-blue-800/60 rounded-xl flex items-center justify-center text-blue-400 hover:bg-blue-900 transition"
              title="Gestisci KYC"
            >
              <FileCheck className="w-6 h-6" />
            </a>
          </div>
        </div>
      </div>

      <StripeCheckoutCard />

      <ComingSoonCard
        title="Telemetria e diagnostica motore"
        description="Dati motore, consumi e guasti in tempo reale via GPS/OBU (come il modulo Engine/Fault di MyGeotab)."
        icon="radar"
        color="blue"
        details={
          <>
            <p>Collegando un telemetra GPS/OBU otterrai in tempo reale: consumi carburante e chilometri reali, fault/guasti di motore con codice DTC. Richiede integrazione provider GPS/telemetria (FASE 3, §9 del paper).</p>
          </>
        }
      />

      <ComingSoonCard
        title="Videosorveglianza a bordo (Dashcam AI)"
        description="Clip video e telecamere per la flotta per sicurezza e gestione sinistri (come il modulo video di MyGeotab)."
        icon="video"
        color="violet"
      />

      <ComingSoonCard
        title="Carte carburante e IFTA"
        description="Gestione carburante, card controllo e calcolo tasse (IFTA) nei viaggi internazionali."
        icon="fuel"
        color="amber"
      />

      <ComingSoonCard
        title="Fleet Radar AI"
        description="Alert intelligenti: velocità, deviazioni di rotta e anomalie di guida basate su regole configurabili."
        icon="network"
        color="red"
      />

      {/* Vehicle Documents Expiry Section */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
          <FileWarning className="w-5 h-5 mr-2 text-amber-400" /> Scadenze Documenti Veicoli
        </h3>

        {(() => {
          const expiring = vehicles
            .flatMap((v) => (v.documents ?? []).map((d) => ({ ...d, targa: v.targa })))
            .filter((d) => daysUntil(new Date(d.dataScadenza)) <= 30)
            .sort((a, b) => new Date(a.dataScadenza).getTime() - new Date(b.dataScadenza).getTime());

          if (expiring.length === 0) {
            return (
              <div className="flex items-center space-x-2 text-sm text-emerald-300 bg-emerald-950/50 border border-emerald-800/60 rounded-xl p-4">
                <CheckCircle2 className="w-5 h-5" />
                <span>Nessun documento in scadenza nei prossimi 30 giorni.</span>
              </div>
            );
          }

          const hasExpired = expiring.some((d) => daysUntil(new Date(d.dataScadenza)) < 0);

          return (
            <div
              className={`rounded-xl border p-4 space-y-2.5 ${
                hasExpired ? "border-red-800/60 bg-red-950/40" : "border-amber-800/60 bg-amber-950/40"
              }`}
            >
              <p className={`text-sm font-bold ${hasExpired ? "text-red-200" : "text-amber-200"}`}>
                {expiring.length} documento{expiring.length > 1 ? "i" : ""}{" "}
                {hasExpired ? "scaduto/i o in scadenza" : "in scadenza entro 30 giorni"}
              </p>
              <div className="space-y-1.5">
                {expiring.map((d) => {
                  const days = daysUntil(new Date(d.dataScadenza));
                  const badge =
                    days < 0
                      ? "bg-red-950 text-red-300 border border-red-800/60"
                      : "bg-amber-950 text-amber-300 border border-amber-800/60";
                  return (
                    <div
                      key={d.id}
                      className="flex items-center justify-between text-sm bg-slate-950/80 border border-slate-800/80 rounded-lg px-3 py-2"
                    >
                      <span className="font-mono font-bold text-slate-100">{d.targa}</span>
                      <span className="text-slate-300">{d.tipo}</span>
                      <span className="text-xs text-slate-400 flex items-center space-x-1">
                        <CalendarClock className="w-3 h-3" />
                        <span>{new Date(d.dataScadenza).toLocaleDateString("it-IT")}</span>
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badge}`}>
                        {days < 0 ? "SCADUTO" : `ENTRO ${days} G`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Verified Account */}
      <VerificationCard />

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicles Overview Card */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
            <Car className="w-5 h-5 mr-2 text-emerald-400" /> Veicoli della Flotta Aziendale
          </h3>

          <div className="space-y-3">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between"
              >
                <div>
                  <span className="font-mono font-bold text-sm text-slate-100 mr-2">{v.targa}</span>
                  <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {v.categoria}
                  </span>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Portata: {v.portataMaxKg}kg | Vol: {v.volumeMaxM3}m³
                  </div>
                </div>

                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    v.status === "DISPONIBILE"
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                      : "bg-amber-950 text-amber-300 border border-amber-800/60"
                  }`}
                >
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Company KYC Documents Overview Card */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2 text-blue-400" /> Documenti Legali & KYC
          </h3>

          <div className="space-y-3">
            {kycDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-200">{doc.tipo}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-xs">
                    {doc.fileName}
                  </p>
                </div>

                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-800/60">
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

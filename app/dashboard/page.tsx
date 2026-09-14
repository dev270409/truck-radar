import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { db } from "@/lib/db";
import {
  Car,
  Users,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  TrendingUp,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.companyId) return null;

  const tenantDb = getTenantDb(session.user.companyId);

  const [company, vehicles, users, kycDocs] = await Promise.all([
    db.company.findUnique({ where: { id: session.user.companyId } }),
    tenantDb.vehicles.findMany({ include: { documents: true } }),
    tenantDb.users.findMany(),
    tenantDb.kycDocuments.findMany(),
  ]);

  const availableVehicles = vehicles.filter((v) => v.status === "DISPONIBILE").length;
  const maintenanceVehicles = vehicles.filter((v) => v.status === "IN_MANUTENZIONE").length;

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
              <h3 className="text-xl font-bold text-blue-300 mt-1">IN ATTESA</h3>
              <p className="text-xs text-slate-400 mt-1">{kycDocs.length} Documenti Inviati</p>
            </div>
            <div className="w-12 h-12 bg-blue-950/80 border border-blue-800/60 rounded-xl flex items-center justify-center text-blue-400">
              <FileCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

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

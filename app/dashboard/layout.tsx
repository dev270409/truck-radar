import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  Truck,
  LayoutDashboard,
  Users,
  Clock,
  Car,
  Route,
  ShieldCheck,
  Cloud,
  Boxes,
  Handshake,
  Globe,
  MapPin,
  Settings,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import NotificationsBadge from "@/components/NotificationsBadge";
import { listApiConnections } from "@/lib/raw-tables";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.companyId) {
    redirect("/login");
  }

  const company = await db.company.findUnique({
    where: { id: session.user.companyId },
    select: { ragioneSociale: true, subscriptionStatus: true, partitaIva: true },
  });

  let accountVerificato = false;
  try {
    const [kycAll, apiConns] = await Promise.all([
      db.kycDocument.findMany({
        where: { companyId: session.user.companyId },
        select: { status: true },
      }),
      listApiConnections(session.user.companyId),
    ]);
    const kycPending = kycAll.filter(
      (k) => k.status === "IN_ATTESA" || k.status === "RIFIUTATO"
    ).length;
    const apiSynced = apiConns.filter((c) => c.status === "SYNCED").length;
    accountVerificato =
      company?.subscriptionStatus === "ACTIVE" && kycPending === 0 && apiSynced >= 1;
  } catch {
    accountVerificato = false;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 md:h-screen md:sticky md:top-0 overflow-y-auto bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4">
        <div>
          {/* Brand & Tenant Info */}
          <div className="flex items-center space-x-3 pb-5 mb-6 border-b border-slate-800">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-bold text-sm text-slate-100 truncate">
                {company?.ragioneSociale || "LogiFlow SaaS"}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                P.IVA: {company?.partitaIva || "N/A"}
              </p>
            </div>
          </div>

          {/* Subscription Status Tag */}
          <div className="mb-5 px-3 py-2 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300">
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> Piano Azienda
              </span>
              <span className="font-bold uppercase text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-200">
                {company?.subscriptionStatus || "TRIAL"}
              </span>
            </div>
            {session.user.role !== "AUTISTA" && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-800/40">
                <span className="flex items-center">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-blue-400" /> Account
                </span>
                <span
                  className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded ${
                    accountVerificato
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-700/40 text-slate-400"
                  }`}
                >
                  {accountVerificato ? "Verificato" : "Basic"}
                </span>
              </div>
            )}
          </div>

          {/* Navigation: primary work is kept separate from occasional administration. */}
          <nav className="space-y-1 text-sm font-medium">
            <div className="flex items-center justify-between pr-3 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Menu</span>
              <NotificationsBadge />
            </div>
            {session.user.role === "AUTISTA" ? (
              <Link
                href="/dashboard/autista"
                className="flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-200 hover:bg-blue-900/60 transition"
              >
                <Route className="w-4 h-4 text-blue-400" />
                <span>I Miei Viaggi</span>
              </Link>
            ) : (
              <>
                <p className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Operatività</p>
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  <LayoutDashboard className="w-4 h-4 text-blue-400" />
                  <span>Panoramica</span>
                </Link>

                <Link
                  href="/dashboard/vehicles"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  <Car className="w-4 h-4 text-emerald-400" />
                  <span>Mezzi</span>
                </Link>

                <Link
                  href="/dashboard/users"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Autisti e team</span>
                </Link>

                <Link
                  href="/dashboard/trips"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  <Route className="w-4 h-4 text-blue-400" />
                  <span>Viaggi</span>
                </Link>

                <p className="px-3 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Network</p>
                <Link
                  href="/dashboard/marketplace"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  <Boxes className="w-4 h-4 text-violet-400" />
                  <span>Borsa Carichi</span>
                </Link>

                <Link
                  href="/dashboard/smart-return"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  <Handshake className="w-4 h-4 text-emerald-400" />
                  <span>Smart Return</span>
                </Link>

                <Link
                  href="/dashboard/network"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span>Network</span>
                </Link>

                <Link
                  href="/dashboard/parking"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Aree di Sosta</span>
                </Link>

                <p className="px-3 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Configurazione</p>
                {session.user.role === "ADMIN" && (
                  <Link
                    href="/dashboard/integrazioni"
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
                  >
                    <Cloud className="w-4 h-4 text-blue-400" />
                    <span>Integrazioni</span>
                  </Link>
                )}

                <Link
                  href="/dashboard/reporti"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  <Settings className="w-4 h-4 text-indigo-400" />
                  <span>Report e impostazioni</span>
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* User Profile & Logout */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {session.user.nome} {session.user.cognome}
              </p>
              <span className="inline-block text-[10px] font-bold text-blue-400 bg-blue-950/80 px-1.5 py-0.5 rounded">
                {session.user.role}
              </span>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-950 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

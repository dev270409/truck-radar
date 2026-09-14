import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  Truck,
  LayoutDashboard,
  Users,
  ShieldCheck,
  LogOut,
  Clock,
  Car,
  FileText,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4">
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
          <div className="mb-6 px-3 py-2 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-center justify-between text-xs text-amber-300">
            <span className="flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> Piano Azienda
            </span>
            <span className="font-bold uppercase text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-200">
              {company?.subscriptionStatus || "TRIAL"}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-sm font-medium">
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
              <span>Gestione Veicoli</span>
            </Link>

            <Link
              href="/dashboard/users"
              className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Gestione Utenti</span>
            </Link>
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

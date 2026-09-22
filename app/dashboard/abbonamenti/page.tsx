import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  CreditCard,
  ShieldCheck,
  Sparkles,
  ReceiptText,
  CalendarCheck,
  CircleCheck,
  TriangleAlert,
  KeyRound,
  Files,
  ArrowUpRight,
} from "lucide-react";
import StripeCheckoutCard from "@/components/StripeCheckoutCard";

const eur = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);

const fmt = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }) : "—";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    TRIAL: "bg-amber-950 text-amber-300 border border-amber-800/60",
    ACTIVE: "bg-emerald-950 text-emerald-300 border border-emerald-800/60",
    EXPIRED: "bg-red-950 text-red-300 border border-red-800/60",
    CANCELED: "bg-slate-800 text-slate-400 border border-slate-700",
    PAST_DUE: "bg-amber-950 text-amber-300 border border-amber-800/60",
  };
  return map[status] ?? "bg-slate-800 text-slate-400 border border-slate-700";
}

export default async function AbbonamentiPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");
  if (session.user.role === "AUTISTA") redirect("/dashboard/autista");

  const canManage = session.user.role === "ADMIN" || session.user.role === "UFFICIO";

  const [company, subscription, payments, kyc] = await Promise.all([
    db.company.findUnique({ where: { id: session.user.companyId } }),
    db.subscription.findFirst({
      where: { companyId: session.user.companyId },
      orderBy: { createdAt: "desc" },
    }),
    db.transaction.findMany({
      where: { companyId: session.user.companyId, type: "SUBSCRIPTION" },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.kycDocument.findMany({ where: { companyId: session.user.companyId } }),
  ]);

  const kycOk =
    kyc.length > 0 && kyc.every((k) => k.status === "VERIFICATO");

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center">
          <CreditCard className="w-6 h-6 mr-2.5 text-sky-400" /> Abbonamento
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Piano, fatturazione e storico dei pagamenti dell&apos;azienda{" "}
          <span className="text-slate-200 font-semibold">{company?.ragioneSociale}</span>.
        </p>
      </div>

      {/* Riepilogo piano corrente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center">
                <Sparkles className="w-4 h-4 mr-1.5 text-indigo-300" /> Piano attuale
              </span>
            </div>
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${statusBadge(company?.subscriptionStatus ?? "TRIAL")}`}>
              {company?.subscriptionStatus ?? "TRIAL"}
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-slate-100">{company?.subscriptionPlan ?? "BASE"}</p>
              <p className="text-xs text-slate-400 mt-1">
                {company?.subscriptionPlan === "PRO"
                  ? "Borsa carichi, subappalto e Smart Return completi."
                  : "Per piccole flotte e avvio del network."}
              </p>
            </div>
            {company?.trialEndsAt && company.subscriptionStatus === "TRIAL" && (
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase text-amber-400 tracking-wide">Trial termina</p>
                <p className="text-sm text-slate-200 font-semibold">{fmt(company.trialEndsAt)}</p>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <p className="text-slate-500 mb-1 flex items-center"><CalendarCheck className="w-3.5 h-3.5 mr-1.5" /> Periodo corrente</p>
              <p className="font-semibold text-slate-200">
                {subscription ? `${fmt(subscription.currentPeriodStart)} → ${fmt(subscription.currentPeriodEnd)}` : "Nessuna sessione attiva"}
              </p>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <p className="text-slate-500 mb-1 flex items-center"><KeyRound className="w-3.5 h-3.5 mr-1.5" /> Customer Stripe</p>
              <p className="font-mono text-slate-300 truncate">{subscription?.stripeCustomerId ?? "Non ancora attivo"}</p>
            </div>
          </div>
        </div>

        {/* Stato account verificato */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1.5 text-blue-400" /> Account verificato
            </span>
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${kycOk ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60" : "bg-amber-950 text-amber-300 border border-amber-800/60"}`}>
              {kycOk ? "Verificato" : "In attesa"}
            </span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {kycOk
              ? "Documentazione KYC approvata: l'account è idoneo all'attivazione del piano a pagamento e alle funzioni Network."
              : "La verifica KYC deve essere completata prima dell'attivazione a pagamento funzionale."}
          </p>
          <div className="mt-3 flex items-center space-x-2 text-xs text-slate-400">
            <Files className="w-4 h-4 text-blue-400" />
            <span>{kyc.length} documenti KYC ({kyc.filter((k) => k.status === "VERIFICATO").length} verificati)</span>
          </div>
        </div>
      </div>

      {/* Gestione abbonamento */}
      {canManage ? (
        <StripeCheckoutCard />
      ) : (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-start space-x-3">
          <CircleCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-300">
            Solo l&apos;Admin o un utente Ufficio può gestire l&apos;abbonamento.
          </p>
        </div>
      )}

      {/* Storico pagamenti */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center">
          <ReceiptText className="w-5 h-5 mr-2 text-sky-400" /> Storico pagamenti
        </h3>

        {payments.length === 0 ? (
          <div className="text-center py-6">
            <TriangleAlert className="w-8 h-8 mx-auto text-amber-400 mb-3" />
            <p className="text-sm text-slate-400">
              Nessun pagamento registrato. I pagamenti Stripe appariranno qui
              automaticamente dopo la scadenza di ogni periodo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <th className="py-2.5 pr-4">Data</th>
                  <th className="py-2.5 pr-4">Tipo</th>
                  <th className="py-2.5 pr-4">Stato</th>
                  <th className="py-2.5 text-right">Importo</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((t) => (
                  <tr key={t.id} className="border-b border-slate-800/60 text-sm">
                    <td className="py-3 pr-4 text-slate-300">{fmt(t.createdAt)}</td>
                    <td className="py-3 pr-4 text-slate-200 font-medium">{t.type}</td>
                    <td className="py-3 pr-4">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-semibold text-slate-100">{eur(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Note ritorno dal checkout */}
      <p className="text-xs text-slate-500 flex items-center">
        <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" />
        Il pagamento avviene su Stripe: i fondi non passano mai dai conti Truck Radar.
      </p>
    </div>
  );
}

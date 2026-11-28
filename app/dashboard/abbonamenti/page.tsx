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
import { label } from "@/lib/labels";

const eur = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);

const fmt = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }) : "—";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    TRIAL: "bg-amber-950 text-amber-300 border border-amber-800/60",
    ACTIVE: "bg-emerald-950 text-emerald-300 border border-emerald-800/60",
    EXPIRED: "bg-red-950 text-red-300 border border-red-800/60",
    CANCELED: "bg-[var(--surface-strong)] text-[var(--text-label)] border border-[var(--surface-border)]",
    PAST_DUE: "bg-amber-950 text-amber-300 border border-amber-800/60",
  };
  return map[status] ?? "bg-[var(--surface-strong)] text-[var(--text-label)] border border-[var(--surface-border)]";
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
        <h1 className="text-2xl font-semibold text-[var(--text)] flex items-center">
          <CreditCard className="w-6 h-6 mr-2.5 text-sky-400" /> Abbonamento
        </h1>
        <p className="text-sm text-[var(--text-label)] mt-1">
          Piano, fatturazione e storico dei pagamenti dell&apos;azienda{" "}
          <span className="text-[var(--text)] font-semibold">{company?.ragioneSociale}</span>.
        </p>
      </div>

      {/* Riepilogo piano corrente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-[var(--text-label)]   flex items-center">
                <Sparkles className="w-4 h-4 mr-1.5 text-indigo-300" /> Piano attuale
              </span>
            </div>
            <span className={`text-[11px] font-semibold  px-2.5 py-1 rounded-full ${statusBadge(company?.subscriptionStatus ?? "TRIAL")}`}>
              {company?.subscriptionStatus ?? "TRIAL"}
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-semibold text-[var(--text)]">{company?.subscriptionPlan ?? "BASE"}</p>
              <p className="text-xs text-[var(--text-label)] mt-1">
                {company?.subscriptionPlan === "PRO"
                  ? "Fino a 50 mezzi e 50 autisti."
                  : "Fino a 15 mezzi e 15 autisti."}
              </p>
            </div>
            {company?.trialEndsAt && company.subscriptionStatus === "TRIAL" && (
              <div className="text-right">
                <p className="text-[11px] font-semibold  text-amber-400 ">Trial termina</p>
                <p className="text-sm text-[var(--text)] font-semibold">{fmt(company.trialEndsAt)}</p>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[var(--surface-soft)] border border-[var(--surface-border)] rounded-xl p-3">
              <p className="text-[var(--text-label-soft)] mb-1 flex items-center"><CalendarCheck className="w-3.5 h-3.5 mr-1.5" /> Periodo corrente</p>
              <p className="font-semibold text-[var(--text)]">
                {subscription ? `${fmt(subscription.currentPeriodStart)} → ${fmt(subscription.currentPeriodEnd)}` : "Nessuna sessione attiva"}
              </p>
            </div>
            <div className="bg-[var(--surface-soft)] border border-[var(--surface-border)] rounded-xl p-3">
              <p className="text-[var(--text-label-soft)] mb-1 flex items-center"><KeyRound className="w-3.5 h-3.5 mr-1.5" /> Customer Stripe</p>
              <p className="font-mono text-[var(--text-soft)] truncate">{subscription?.stripeCustomerId ?? "Non ancora attivo"}</p>
            </div>
          </div>
        </div>

        {/* Stato account verificato */}
        <div className="p-5 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--text-label)]   flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1.5 text-blue-400" /> Account verificato
            </span>
            <span className={`text-[11px] font-semibold  px-2.5 py-1 rounded-full ${kycOk ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60" : "bg-amber-950 text-amber-300 border border-amber-800/60"}`}>
              {kycOk ? "Verificato" : "In attesa"}
            </span>
          </div>
          <p className="text-sm text-[var(--text-soft)] leading-relaxed">
            {kycOk
              ? "Documentazione KYC approvata: l'account è idoneo all'attivazione del piano a pagamento e alle funzioni Network."
              : "La verifica KYC deve essere completata prima dell'attivazione a pagamento funzionale."}
          </p>
          <div className="mt-3 flex items-center space-x-2 text-xs text-[var(--text-label)]">
            <Files className="w-4 h-4 text-blue-400" />
            <span>{kyc.length} documenti KYC ({kyc.filter((k) => k.status === "VERIFICATO").length} verificati)</span>
          </div>
        </div>
      </div>

      {/* Gestione abbonamento */}
      {canManage ? (
        <StripeCheckoutCard />
      ) : (
        <div className="p-5 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl flex items-start space-x-3">
          <CircleCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--text-soft)]">
            Solo l&apos;Admin o un utente Ufficio può gestire l&apos;abbonamento.
          </p>
        </div>
      )}

      {/* Storico pagamenti */}
      <div className="p-6 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl">
        <h3 className="text-base font-semibold text-[var(--text)] mb-4 flex items-center">
          <ReceiptText className="w-5 h-5 mr-2 text-sky-400" /> Storico pagamenti
        </h3>

        {payments.length === 0 ? (
          <div className="text-center py-6">
            <TriangleAlert className="w-8 h-8 mx-auto text-amber-400 mb-3" />
            <p className="text-sm text-[var(--text-label)]">
              Nessun pagamento registrato. I pagamenti Stripe appariranno qui
              automaticamente dopo la scadenza di ogni periodo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] font-semibold   text-[var(--text-label-soft)] border-b border-[var(--surface-border)]">
                  <th className="py-2.5 pr-4">Data</th>
                  <th className="py-2.5 pr-4">Tipo</th>
                  <th className="py-2.5 pr-4">Stato</th>
                  <th className="py-2.5 text-right">Importo</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((t) => (
                  <tr key={t.id} className="border-b border-[var(--surface-border)] text-sm">
                    <td className="py-3 pr-4 text-[var(--text-soft)]">{fmt(t.createdAt)}</td>
                    <td className="py-3 pr-4 text-[var(--text)] font-medium">{t.type}</td>
                    <td className="py-3 pr-4">
                      <span className="text-[11px] font-semibold  px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                        {label(t.status)}
                      </span>
                    </td>
                    <td className="py-3 text-right font-semibold text-[var(--text)]">{eur(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Note ritorno dal checkout */}
      <p className="text-xs text-[var(--text-label-soft)] flex items-center">
        <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" />
        Il pagamento avviene su Stripe: i fondi non passano mai dai conti Truck Radar.
      </p>
    </div>
  );
}

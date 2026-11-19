import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLicenseState, isSelfHosted } from "@/lib/license";
import {
  KeyRound,
  ShieldCheck,
  TriangleAlert,
  CircleCheck,
  CalendarCheck,
  Car,
  Users,
  Terminal,
} from "lucide-react";

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }) : "—";

export default async function LicenzaPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const selfHosted = isSelfHosted();
  const state = getLicenseState();
  const payload = state.payload;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center">
          <KeyRound className="w-6 h-6 mr-2.5 text-sky-400" /> Licenza
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Stato della licenza di questa installazione self-hosted di Truck Radar.
        </p>
      </div>

      {!selfHosted && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-start space-x-3">
          <CircleCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-300 leading-relaxed">
            Questa installazione non è in modalità self-hosted
            (<code className="font-mono text-slate-200">TRUCK_RADAR_SELF_HOSTED</code> non è
            impostata a <code className="font-mono text-slate-200">true</code>): la licenza non
            è richiesta e l&apos;accesso alle funzioni è gestito dall&apos;abbonamento.
          </p>
        </div>
      )}

      {selfHosted && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-1.5 text-blue-400" /> Stato licenza
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                    state.valid
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                      : "bg-amber-950 text-amber-300 border border-amber-800/60"
                  }`}
                >
                  {state.valid ? "Attiva" : "Non attiva"}
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {state.valid
                  ? `Licenza valida per ${payload?.licensee ?? "—"}.`
                  : state.reason ?? "Nessuna licenza configurata."}
              </p>
              {payload?.licensee && (
                <p className="mt-3 text-xs text-slate-400">
                  Intestatario: <span className="text-slate-200 font-semibold">{payload.licensee}</span>
                </p>
              )}
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center mb-3">
                <CalendarCheck className="w-4 h-4 mr-1.5 text-indigo-300" /> Validità
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 mb-1">Emessa</p>
                  <p className="font-semibold text-slate-200">{fmt(payload?.issuedAt)}</p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 mb-1">Scadenza</p>
                  <p className="font-semibold text-slate-200">{fmt(payload?.expiresAt)}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Piano concesso: <span className="text-slate-200 font-semibold">{payload?.plan ?? "—"}</span>
              </p>
            </div>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-4">Limiti concessi</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Car className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Mezzi</p>
                  <p className="text-lg font-bold text-slate-100">{payload?.vehicleLimit ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Autisti</p>
                  <p className="text-lg font-bold text-slate-100">{payload?.driverLimit ?? "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {!state.valid && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
              <h3 className="text-base font-bold text-slate-100 mb-3 flex items-center">
                <Terminal className="w-5 h-5 mr-2 text-sky-400" /> Come attivare la licenza
              </h3>
              <p className="text-sm text-slate-400 mb-3">
                Imposta la variabile d&apos;ambiente fornita al momento dell&apos;acquisto e
                riavvia l&apos;applicazione:
              </p>
              <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 overflow-x-auto">
{`TRUCK_RADAR_SELF_HOSTED=true
TRUCK_RADAR_LICENSE=<la-tua-license-key>`}
              </pre>
              <p className="mt-3 text-xs text-slate-500 flex items-start">
                <TriangleAlert className="w-3.5 h-3.5 mr-1.5 mt-0.5 shrink-0" />
                Senza licenza valida l&apos;installazione resta in modalità trial (max 2 mezzi e 2
                autisti) e le sezioni premium non sono accessibili.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

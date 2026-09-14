"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  User,
  FileCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Truck,
  Upload,
  AlertCircle,
  Loader2,
  Clock,
  ShieldAlert,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"A" | "B" | "C" | "D">("A");

  // Step A Data: Company
  const [ragioneSociale, setRagioneSociale] = useState("");
  const [partitaIva, setPartitaIva] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [telefono, setTelefono] = useState("");

  // Step B Data: Admin User
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");

  // Step C Data: KYC Files
  const [kycFiles, setKycFiles] = useState([
    { tipo: "PARTITA_IVA", label: "Certificato Partita IVA", fileName: "", fileUrl: "" },
    { tipo: "LICENZA_CONTO_TERZI", label: "Licenza Conto Terzi", fileName: "", fileUrl: "" },
    { tipo: "ALBO_TRASPORTATORI", label: "Iscrizione Albo Autotrasportatori", fileName: "", fileUrl: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registeredCompanyId, setRegisteredCompanyId] = useState("");

  // Simulated file upload helper for KYC documents
  const handleSimulatedFileUpload = (tipo: string, file: File) => {
    setKycFiles((prev) =>
      prev.map((item) =>
        item.tipo === tipo
          ? {
              ...item,
              fileName: file.name,
              fileUrl: `https://storage.logiflow.it/kyc/${Date.now()}_${file.name}`,
            }
          : item
      )
    );
  };

  const handleNextFromA = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!ragioneSociale || !partitaIva || !indirizzo || !telefono) {
      setError("Compila tutti i campi dell'azienda per proseguire.");
      return;
    }
    setStep("B");
  };

  const handleNextFromB = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password || !nome || !cognome) {
      setError("Compila tutti i campi dell'amministratore per proseguire.");
      return;
    }
    if (password.length < 6) {
      setError("La password deve contenere almeno 6 caratteri.");
      return;
    }
    setStep("C");
  };

  const handleCompleteRegistration = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ragioneSociale,
          partitaIva,
          indirizzo,
          telefono,
          email,
          password,
          nome,
          cognome,
          kycFiles: kycFiles.map((f) => ({
            tipo: f.tipo,
            fileName: f.fileName || `${f.label}.pdf`,
            fileUrl: f.fileUrl || `https://storage.logiflow.it/kyc/demo-${f.tipo.toLowerCase()}.pdf`,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore nella registrazione");
      }

      setRegisteredCompanyId(data.companyId);
      setStep("D");
    } catch (err: any) {
      setError(err.message || "Errore di connessione durante la registrazione.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 my-8">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">LogiFlow SaaS</h1>
              <p className="text-xs text-slate-400">Registrazione Piattaforma Trasporti</p>
            </div>
          </div>

          <Link href="/login" className="text-xs text-slate-400 hover:text-white transition">
            Hai già un account? <span className="text-blue-400 font-semibold">Accedi</span>
          </Link>
        </div>

        {/* Wizard Steps Navigation Bar */}
        <div className="grid grid-cols-4 gap-2 mb-8">
          {[
            { id: "A", label: "Azienda", icon: Building2 },
            { id: "B", label: "Admin", icon: User },
            { id: "C", label: "KYC Upload", icon: FileCheck },
            { id: "D", label: "Conferma", icon: CheckCircle2 },
          ].map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone =
              (s.id === "A" && step !== "A") ||
              (s.id === "B" && (step === "C" || step === "D")) ||
              (s.id === "C" && step === "D");

            return (
              <div
                key={s.id}
                className={`flex flex-col items-center p-2.5 rounded-xl border transition ${
                  isActive
                    ? "bg-blue-600/20 border-blue-500 text-blue-300"
                    : isDone
                    ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-400"
                    : "bg-slate-950/40 border-slate-800 text-slate-500"
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-bold">Step {s.id}</span>
                </div>
                <span className="text-[11px] truncate max-w-full">{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-950/60 border border-red-800/80 rounded-xl flex items-start space-x-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP A: Azienda */}
        {step === "A" && (
          <form onSubmit={handleNextFromA} className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-blue-400" /> Step A: Dati Aziendali
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Ragione Sociale *
                </label>
                <input
                  type="text"
                  required
                  value={ragioneSociale}
                  onChange={(e) => setRagioneSociale(e.target.value)}
                  placeholder="Es. Trasporti Italia S.r.l."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Partita IVA / C.F. *
                </label>
                <input
                  type="text"
                  required
                  value={partitaIva}
                  onChange={(e) => setPartitaIva(e.target.value)}
                  placeholder="Es. 12345678901"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Indirizzo Sede Legale *
                </label>
                <input
                  type="text"
                  required
                  value={indirizzo}
                  onChange={(e) => setIndirizzo(e.target.value)}
                  placeholder="Via Roma 10, Milano"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Telefono Contatto *
                </label>
                <input
                  type="text"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+39 02 1234567"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 flex items-center space-x-2 transition"
              >
                <span>Prosegui a Step B (Admin)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP B: Admin */}
        {step === "B" && (
          <form onSubmit={handleNextFromB} className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-400" /> Step B: Account Utente ADMIN
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Es. Mario"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Cognome *
                </label>
                <input
                  type="text"
                  required
                  value={cognome}
                  onChange={(e) => setCognome(e.target.value)}
                  placeholder="Es. Rossi"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Login Admin *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@azienda.it"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 6 caratteri"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep("A")}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-4 py-2.5 rounded-xl flex items-center space-x-2 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Indietro</span>
              </button>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 flex items-center space-x-2 transition"
              >
                <span>Prosegui a Step C (KYC)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP C: KYC Upload */}
        {step === "C" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-200 flex items-center">
                <FileCheck className="w-5 h-5 mr-2 text-blue-400" /> Step C: Upload Documentazione KYC (3 File)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Carica o seleziona i file necessari per la verifica aziendale.
              </p>
            </div>

            <div className="space-y-3">
              {kycFiles.map((doc) => (
                <div
                  key={doc.tipo}
                  className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{doc.label}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      {doc.fileName ? `Selezionato: ${doc.fileName}` : "Formati accettati: PDF, JPG, PNG (Max 8MB)"}
                    </p>
                  </div>

                  <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-blue-300 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition">
                    <Upload className="w-4 h-4" />
                    <span>{doc.fileName ? "Sostituisci" : "Carica File"}</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSimulatedFileUpload(doc.tipo, file);
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep("B")}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-4 py-2.5 rounded-xl flex items-center space-x-2 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Indietro</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleCompleteRegistration}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Registrazione in corso...</span>
                  </>
                ) : (
                  <>
                    <span>Completa Registrazione (Trial 30gg)</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP D: Final Review & Confirmation */}
        {step === "D" && (
          <div className="text-center py-6 space-y-6">
            <div className="w-16 h-16 bg-emerald-950 border border-emerald-700/60 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-950">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">Registrazione Completata con Successo!</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                La tua azienda <span className="text-blue-300 font-semibold">{ragioneSociale}</span> è ora registrata sulla piattaforma LogiFlow.
              </p>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-left">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-start space-x-3">
                <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Stato Subscription</p>
                  <p className="text-sm font-bold text-amber-300">TRIAL (30 Giorni)</p>
                  <p className="text-[11px] text-slate-500">Accesso completo attivo</p>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-start space-x-3">
                <ShieldAlert className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Stato Documenti KYC</p>
                  <p className="text-sm font-bold text-blue-300">IN_ATTESA</p>
                  <p className="text-[11px] text-slate-500">3 Documenti inviati</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => router.push("/login")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 mx-auto transition"
              >
                <span>Vai al Login ed Accedi</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

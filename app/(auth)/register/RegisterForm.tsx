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
  AlertCircle,
  Loader2,
  Clock,
  ShieldAlert,
  Sparkles,
  ScanText,
  ShieldCheck,
} from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";

export default function RegisterForm() {
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
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");

  // Step C Data: KYC Files (Livello 1 - SaaS Interno)
  const [kycFiles, setKycFiles] = useState([
    { tipo: "PARTITA_IVA", label: "Certificato Partita IVA", fileName: "", fileUrl: "" },
    { tipo: "DOCUMENTO_IDENTITA_LEGALE_RAPPRESENTANTE", label: "Documento Identità Legale Rappresentante", fileName: "", fileUrl: "" },
  ]);

  // KYB Zero-Form: upload documenti per compilazione automatica
  const [kybDocs, setKybDocs] = useState<{ tipo: string; label: string; fileName: string; fileUrl: string }[]>([
    { tipo: "VISURA", label: "Visura Camerale", fileName: "", fileUrl: "" },
    { tipo: "DOCUMENTO_IDENTITA", label: "Documento d'Identità (Legale Rappresentante)", fileName: "", fileUrl: "" },
  ]);
  const [kybAnalyzing, setKybAnalyzing] = useState(false);
  const [kybInfo, setKybInfo] = useState("");
  const [kybApplied, setKybApplied] = useState(false);
  const [kybExtraction, setKybExtraction] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registeredCompanyId, setRegisteredCompanyId] = useState("");

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
    if (!email || !password || !passwordConfirm || !nome || !cognome) {
      setError("Compila tutti i campi dell'amministratore per proseguire.");
      return;
    }
    if (password.length < 6) {
      setError("La password deve contenere almeno 6 caratteri.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Le password non coincidono.");
      return;
    }
    setStep("C");
  };

  const handleCompleteRegistration = async () => {
    if (kycFiles.some((file) => !file.fileUrl)) {
      setError("Carica tutti i documenti richiesti prima di completare la registrazione.");
      return;
    }
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
          kycFiles,
          kybExtraction,
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

  const handleKybAnalyze = async () => {
    setError("");
    setKybInfo("");
    const ready = kybDocs.filter((d) => d.fileUrl);
    if (ready.length === 0) {
      setError("Carica almeno una Visura Camerale o un Documento d'Identità per l'estrazione automatica.");
      return;
    }
    setKybAnalyzing(true);
    try {
      const res = await fetch("/api/kyb/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: ready.map((d) => ({ tipo: d.tipo, fileUrl: d.fileUrl, fileName: d.fileName })),
          hints: { ragioneSociale, partitaIva, nome, cognome },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nell'estrazione automatica");
      const ex = data.extraction;
      setKybExtraction(data);

      // Pre-compilazione automatica dei campi (Zero-Form) solo se l'AI estrae dati reali
      let prefilled = 0;
      if (ex?.ragione_sociale) { setRagioneSociale(ex.ragione_sociale); prefilled++; }
      if (ex?.partita_iva) { setPartitaIva(ex.partita_iva); prefilled++; }
      if (ex?.indirizzo) { setIndirizzo(ex.indirizzo); prefilled++; }
      if (ex?.legale_rappresentante?.nome) { setNome(ex.legale_rappresentante.nome); prefilled++; }
      if (ex?.legale_rappresentante?.cognome) { setCognome(ex.legale_rappresentante.cognome); prefilled++; }

      // Link automatico dei documenti KYB → upload KYC dello Step C
      setKycFiles((prev) =>
        prev.map((item) => {
          if (item.tipo === "PARTITA_IVA") {
            const visura = ready.find((d) => d.tipo === "VISURA");
            return visura ? { ...item, fileName: visura.fileName, fileUrl: visura.fileUrl } : item;
          }
          if (item.tipo === "DOCUMENTO_IDENTITA_LEGALE_RAPPRESENTANTE") {
            const ident = ready.find((d) => d.tipo === "DOCUMENTO_IDENTITA");
            return ident ? { ...item, fileName: ident.fileName, fileUrl: ident.fileUrl } : item;
          }
          return item;
        })
      );

      setKybApplied(prefilled > 0);
      const verification = data.verification;
      const verifyMsg =
        verification?.status === "ATTIVA"
          ? `Azienda ATTIVA confermata${verification.ragioneSocialeMatch ? " · corrispondenza ragione sociale OK" : ""}.`
          : verification?.status === "NON_CONFIGURATO"
          ? "Verifica sistemi ufficiali non configurata in questa sessione (demo)."
          : "Attenzione: verifica ufficiale non confermata.";
      setKybInfo(
        (data.mode === "ai" ? `Estrazione AI (${data.provider}) completata · ` : "Estrazione manuale (campi inseriti) · ") +
          (prefilled > 0 ? `${prefilled} campi precompilati automaticamente. ` : "") +
          verifyMsg
      );
    } catch (err: any) {
      setError(err.message || "Errore durante l'estrazione automatica.");
    } finally {
      setKybAnalyzing(false);
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
            <img
              src="/logo.jpg"
              alt="Truck Radar"
              className="w-10 h-10 rounded-xl object-cover shadow-lg"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Truck Radar</h1>
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

            {/* KYB Zero-Form: compilazione automatica */}
            <div className={`rounded-2xl border p-4 transition ${kybApplied ? "border-emerald-800/60 bg-emerald-950/40" : "border-indigo-800/60 bg-indigo-950/30"}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800/80 flex items-center justify-center text-indigo-300 flex-shrink-0">
                    <ScanText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span>Compilazione automatica KYB (Zero-Form)</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Carica Visura Camerale e Documento d'Identità: l'AI estrae i dati e compila il form al posto tuo.
                    </p>
                  </div>
                </div>
                {kybApplied && (
                  <span className="flex items-center space-x-1 text-xs font-bold text-emerald-300 bg-emerald-950 border border-emerald-800/60 rounded-full px-3 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Dati estratti
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-2.5">
                {kybDocs.map((doc) => (
                  <div key={doc.tipo} className="bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{doc.label}</p>
                      <p className="text-[11px] text-slate-500 font-mono truncate">
                        {doc.fileName ? `Selezionato: ${doc.fileName}` : "PDF, JPG, PNG (Max 8MB)"}
                      </p>
                    </div>
                    <UploadButton
                      endpoint="kycDocument"
                      appearance={{ button: "bg-slate-800 hover:bg-slate-700 text-indigo-300 px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap", allowedContent: "hidden" }}
                      content={{ button: doc.fileName ? "Sostituisci" : "Carica file" }}
                      onClientUploadComplete={(files) => {
                        const file = files[0];
                        setKybDocs((prev) => prev.map((item) => item.tipo === doc.tipo ? { ...item, fileName: file.name, fileUrl: file.url } : item));
                        setError("");
                      }}
                      onUploadError={(uploadError) => setError(uploadError.message)}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-3.5 flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleKybAnalyze}
                  disabled={kybAnalyzing}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 transition disabled:opacity-50"
                >
                  {kybAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analisi documenti in corso...</span>
                    </>
                  ) : (
                    <>
                      <ScanText className="w-4 h-4" />
                      <span>Estrai i dati dai documenti</span>
                    </>
                  )}
                </button>
                {kybInfo && (
                  <p className={`text-[11px] flex items-start space-x-1.5 max-w-md ${kybApplied ? "text-emerald-300" : "text-indigo-300"}`}>
                    <ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{kybInfo}</span>
                  </p>
                )}
              </div>
            </div>

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

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Conferma Password *
                </label>
                <input
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Ripeti la password"
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
                <FileCheck className="w-5 h-5 mr-2 text-blue-400" /> Step C: Upload Documentazione KYC - Livello 1 (SaaS Interno)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Documenti obbligatori per attivare il gestionale flotta (SaaS Interno). La verifica Livello 2 (Borsa Carichi) sarà richiesta separatamente.
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

                  <UploadButton
                    endpoint="kycDocument"
                    appearance={{ button: "bg-slate-800 hover:bg-slate-700 text-blue-300 px-3.5 py-2 rounded-lg text-xs font-semibold", allowedContent: "hidden" }}
                    content={{ button: doc.fileName ? "Sostituisci" : "Carica file" }}
                    onClientUploadComplete={(files) => {
                      const file = files[0];
                      setKycFiles((previous) => previous.map((item) => item.tipo === doc.tipo ? { ...item, fileName: file.name, fileUrl: file.url } : item));
                    }}
                    onUploadError={(uploadError) => setError(uploadError.message)}
                  />
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
                La tua azienda <span className="text-blue-300 font-semibold">{ragioneSociale}</span> è ora registrata su Truck Radar.
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
                  <p className="text-xs font-semibold text-slate-400 uppercase">Stato Documenti KYC (Livello 1)</p>
                  <p className="text-sm font-bold text-blue-300">IN_ATTESA</p>
                  <p className="text-[11px] text-slate-500">2 Documenti inviati (Livello 1)</p>
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
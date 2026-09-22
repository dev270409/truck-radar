"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  RefreshCcw,
  PartyPopper,
  ShieldAlert,
} from "lucide-react";

interface KycDocument {
  id: string;
  tipo: string;
  fileUrl: string;
  fileName: string;
  status: "IN_ATTESA" | "VERIFICATO" | "RIFIUTATO";
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<KycDocument["status"], string> = {
  IN_ATTESA: "bg-amber-950 text-amber-300 border-amber-800/60",
  VERIFICATO: "bg-emerald-950 text-emerald-300 border-emerald-800/60",
  RIFIUTATO: "bg-red-950 text-red-300 border-red-800/60",
};

const LEVEL1_TYPES = ["PARTITA_IVA", "DOCUMENTO_IDENTITA_LEGALE_RAPPRESENTANTE"];
const LEVEL2_TYPES = [
  "LICENZA_CONTO_TERZI",
  "ALBO_TRASPORTATORI",
  "LICENZA_REN",
  "POLIZZA_ASSICURATIVA_CMR",
  "DURC",
  "DELEGA_POTERI_FIRMA",
];

const TIPO_LABELS: Record<string, string> = {
  PARTITA_IVA: "Partita IVA",
  DOCUMENTO_IDENTITA_LEGALE_RAPPRESENTANTE: "Documento Identità Legale Rappresentante",
  LICENZA_CONTO_TERZI: "Licenza Conto Terzi",
  ALBO_TRASPORTATORI: "Iscrizione Albo Autotrasportatori",
  LICENZA_REN: "Licenza REN (Registro Elettronico Nazionale)",
  POLIZZA_ASSICURATIVA_CMR: "Polizza Assicurativa CMR Merci",
  DURC: "DURC (Regolarità Contributiva)",
  DELEGA_POTERI_FIRMA: "Delega Poteri di Firma",
};

export default function KycReviewPage() {
  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [activated, setActivated] = useState(false);

  const fetchDocs = async () => {
    try {
      const res = await fetch("/api/kyc");
      const data = await res.json();
      if (data.documents) setDocuments(data.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const review = async (doc: KycDocument, status: "VERIFICATO" | "RIFIUTATO") => {
    setBusyId(doc.id);
    setError("");
    try {
      const res = await fetch(`/api/kyc/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nella verifica");
      if (data.subscriptionActivated) setActivated(true);
      fetchDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const getLevel1Docs = () => documents.filter(d => LEVEL1_TYPES.includes(d.tipo));
  const getLevel2Docs = () => documents.filter(d => LEVEL2_TYPES.includes(d.tipo));

  const level1Docs = getLevel1Docs();
  const level2Docs = getLevel2Docs();

  const level1Verified = level1Docs.filter((d) => d.status === "VERIFICATO").length;
  const level1Pending = level1Docs.filter((d) => d.status === "IN_ATTESA").length;
  const level1Rejected = level1Docs.filter((d) => d.status === "RIFIUTATO").length;
  const level1Complete = level1Docs.length > 0 && level1Pending === 0 && level1Rejected === 0;

  const level2Verified = level2Docs.filter((d) => d.status === "VERIFICATO").length;
  const level2Pending = level2Docs.filter((d) => d.status === "IN_ATTESA").length;
  const level2Rejected = level2Docs.filter((d) => d.status === "RIFIUTATO").length;
  const level2Complete = level2Docs.length > 0 && level2Pending === 0 && level2Rejected === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <ShieldCheck className="w-6 h-6 mr-2.5 text-blue-400" /> Verifica Documenti KYC
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Livello 1 (SaaS Interno) attiva il gestionale flotta. Livello 2 (Borsa Carichi) abilita il Marketplace.
          </p>
        </div>
        {documents.length > 0 && (
          <div className="text-sm text-slate-300 space-x-2">
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2.5 py-1 rounded-lg font-semibold">
              {level1Verified} L1 Verificati
            </span>
            <span className="bg-amber-950 text-amber-300 border border-amber-800/60 px-2.5 py-1 rounded-lg font-semibold">
              {level1Pending} L1 In Attesa
            </span>
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2.5 py-1 rounded-lg font-semibold">
              {level2Verified} L2 Verificati
            </span>
            <span className="bg-amber-950 text-amber-300 border border-amber-800/60 px-2.5 py-1 rounded-lg font-semibold">
              {level2Pending} L2 In Attesa
            </span>
          </div>
        )}
      </div>

      {activated && (
        <div className="p-4 rounded-2xl border border-emerald-800/60 bg-emerald-950/60 flex items-start space-x-3">
          <PartyPopper className="w-5 h-5 flex-shrink-0 text-emerald-300 mt-0.5" />
          <div className="text-sm text-emerald-200">
            <p className="font-bold">Compliance Livello 1 completata!</p>
            <p>
              Tutti i documenti Livello 1 verificati: il piano aziendale è ora{" "}
              <span className="font-bold">ATTIVO</span>.
            </p>
          </div>
        </div>
      )}

      {level1Complete && !activated && (
        <div className="p-4 rounded-2xl border border-emerald-800/60 bg-emerald-950/60 flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          <p className="text-sm text-emerald-200 font-semibold">
            Livello 1 (SaaS Interno) completato! Puoi ora accedere al gestionale flotta.
          </p>
        </div>
      )}

      {!level1Complete && (
        <div className="p-4 rounded-2xl border border-amber-800/60 bg-amber-950/60 flex items-center space-x-3">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <p className="text-sm text-amber-200">
            Completa il Livello 1 (2 documenti) per attivare il gestionale flotta.
          </p>
        </div>
      )}

      <div className="p-4 rounded-2xl border border-violet-800/60 bg-violet-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-5 h-5 text-violet-400" />
          <div>
            <p className="font-bold text-violet-200">Livello 2: Borsa Carichi / Marketplace</p>
            <p className="text-xs text-violet-400">
              6 documenti: Licenza Conto Terzi, Albo Trasportatori, Licenza REN, Polizza CMR, DURC, Delega Firma
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
            level2Complete ? "bg-emerald-950 text-emerald-300 border-emerald-800/60" :
            level2Pending > 0 ? "bg-amber-950 text-amber-300 border-amber-800/60" :
            "bg-slate-700 text-slate-400 border-slate-800/60"
          }`}>
            {level2Complete ? "Completo" : level2Pending > 0 ? "In Attesa" : "Da Caricare"}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">{error}</div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Caricamento documenti KYC...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Nessun documento KYC caricato. La documentazione verrà richiesta in fase di registrazione.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {/* Level 1 Section */}
            <div className="p-4 bg-slate-950/50 border-b border-slate-800/60">
              <h3 className="font-bold text-slate-200 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <span>Livello 1: SaaS Interno (Gestionale Flotta)</span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${level1Complete ? "bg-emerald-950 text-emerald-300" : "bg-amber-950 text-amber-300"}`}>
                  {level1Complete ? "Completo" : "In Corso"}
                </span>
              </h3>
            </div>
            {level1Docs.map((doc) => (
              <div key={doc.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/40 transition">
                <div className="flex items-start space-x-4 min-w-0">
                  <div className="w-10 h-10 bg-blue-950/80 border border-blue-800/60 rounded-xl flex items-center justify-center text-blue-400 flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-100">{TIPO_LABELS[doc.tipo] || doc.tipo}</p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5 truncate max-w-sm">{doc.fileName}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Caricato il {new Date(doc.createdAt).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_STYLES[doc.status]}`}>{doc.status}</span>
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200 bg-blue-950/40 border border-blue-800/60 p-2 rounded-lg transition" title="Apri documento"><ExternalLink className="w-4 h-4" /></a>
                  {doc.status === "IN_ATTESA" && (
                    <>
                      <button onClick={() => review(doc, "VERIFICATO")} disabled={busyId === doc.id} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition disabled:opacity-50">
                        {busyId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>Approva</span>
                      </button>
                      <button onClick={() => review(doc, "RIFIUTATO")} disabled={busyId === doc.id} className="bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 text-red-200 text-xs font-bold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition disabled:opacity-50">
                        {busyId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>Rifiuta</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Level 2 Section */}
            <div className="p-4 bg-violet-950/30 border-b border-slate-800/60">
              <h3 className="font-bold text-violet-200 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-violet-400" />
                <span>Livello 2: Borsa Carichi / Marketplace</span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${level2Complete ? "bg-emerald-950 text-emerald-300" : level2Pending > 0 ? "bg-amber-950 text-amber-300" : "bg-slate-700 text-slate-400"}`}>
                  {level2Complete ? "Completo" : level2Pending > 0 ? "In Attesa" : "Da Caricare"}
                </span>
              </h3>
            </div>
            {level2Docs.map((doc) => (
              <div key={doc.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/40 transition">
                <div className="flex items-start space-x-4 min-w-0">
                  <div className="w-10 h-10 bg-violet-950/80 border border-violet-800/60 rounded-xl flex items-center justify-center text-violet-400 flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-100">{TIPO_LABELS[doc.tipo] || doc.tipo}</p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5 truncate max-w-sm">{doc.fileName}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Caricato il {new Date(doc.createdAt).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_STYLES[doc.status]}`}>{doc.status}</span>
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200 bg-blue-950/40 border border-blue-800/60 p-2 rounded-lg transition" title="Apri documento"><ExternalLink className="w-4 h-4" /></a>
                  {doc.status === "IN_ATTESA" && (
                    <>
                      <button onClick={() => review(doc, "VERIFICATO")} disabled={busyId === doc.id} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition disabled:opacity-50">
                        {busyId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>Approva</span>
                      </button>
                      <button onClick={() => review(doc, "RIFIUTATO")} disabled={busyId === doc.id} className="bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 text-red-200 text-xs font-bold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition disabled:opacity-50">
                        {busyId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>Rifiuta</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {level2Docs.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                <p>Nessun documento Livello 2 caricato.</p>
                <p className="text-xs text-slate-400 mt-2">Carica i 6 documenti richiesti per abilitare la Borsa Carichi.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={fetchDocs}
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          <span>Aggiorna</span>
        </button>
      </div>
    </div>
  );
}
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

const TIPO_LABELS: Record<string, string> = {
  PARTITA_IVA: "Partita IVA",
  LICENZA_CONTO_TERZI: "Licenza Conto Terzi",
  ALBO_TRASPORTATORI: "Iscrizione Albo Trasportatori",
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

  const verifiedCount = documents.filter((d) => d.status === "VERIFICATO").length;
  const pendingCount = documents.filter((d) => d.status === "IN_ATTESA").length;
  const rejectedCount = documents.filter((d) => d.status === "RIFIUTATO").length;
  const allVerified = documents.length > 0 && pendingCount === 0 && rejectedCount === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <ShieldCheck className="w-6 h-6 mr-2.5 text-blue-400" /> Verifica Documenti KYC
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Approva o rifiuta i documenti legali della tua azienda. Con tutti i documenti
            verificati il piano passa da Trial ad Attivo.
          </p>
        </div>
        {documents.length > 0 && (
          <div className="text-sm text-slate-300 space-x-2">
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2.5 py-1 rounded-lg font-semibold">
              {verifiedCount} Verificati
            </span>
            <span className="bg-amber-950 text-amber-300 border border-amber-800/60 px-2.5 py-1 rounded-lg font-semibold">
              {pendingCount} In Attesa
            </span>
            {rejectedCount > 0 && (
              <span className="bg-red-950 text-red-300 border border-red-800/60 px-2.5 py-1 rounded-lg font-semibold">
                {rejectedCount} Rifiutati
              </span>
            )}
          </div>
        )}
      </div>

      {activated && (
        <div className="p-4 rounded-2xl border border-emerald-800/60 bg-emerald-950/60 flex items-start space-x-3">
          <PartyPopper className="w-5 h-5 flex-shrink-0 text-emerald-300 mt-0.5" />
          <div className="text-sm text-emerald-200">
            <p className="font-bold">Compliance completata! 🎉</p>
            <p>
              Tutti i documenti KYC sono stati verificati: il piano aziendale è ora{" "}
              <span className="font-bold">ATTIVO</span>.
            </p>
          </div>
        </div>
      )}

      {allVerified && !activated && (
        <div className="p-4 rounded-2xl border border-emerald-800/60 bg-emerald-950/60 flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          <p className="text-sm text-emerald-200 font-semibold">
            Tutti i documenti KYC sono stati verificati.
          </p>
        </div>
      )}

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
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/40 transition"
              >
                <div className="flex items-start space-x-4 min-w-0">
                  <div className="w-10 h-10 bg-blue-950/80 border border-blue-800/60 rounded-xl flex items-center justify-center text-blue-400 flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-100">
                      {TIPO_LABELS[doc.tipo] || doc.tipo}
                    </p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5 truncate max-w-sm">
                      {doc.fileName}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Caricato il {new Date(doc.createdAt).toLocaleDateString("it-IT")} · Caricato da{" "}
                      {doc.status === "IN_ATTESA" ? "l'azienda" : "verificato da te"}
                      {doc.verifiedAt
                        ? ` il ${new Date(doc.verifiedAt).toLocaleDateString("it-IT")}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full border ${
                      STATUS_STYLES[doc.status]
                    }`}
                  >
                    {doc.status}
                  </span>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-300 hover:text-blue-200 bg-blue-950/40 border border-blue-800/60 p-2 rounded-lg transition"
                    title="Apri documento"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {doc.status === "IN_ATTESA" && (
                    <>
                      <button
                        onClick={() => review(doc, "VERIFICATO")}
                        disabled={busyId === doc.id}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition disabled:opacity-50"
                      >
                        {busyId === doc.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Approva</span>
                      </button>
                      <button
                        onClick={() => review(doc, "RIFIUTATO")}
                        disabled={busyId === doc.id}
                        className="bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 text-red-200 text-xs font-bold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition disabled:opacity-50"
                      >
                        {busyId === doc.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Rifiuta</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
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
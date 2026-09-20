"use client";

import { useEffect, useState } from "react";
import { Cloud, Loader2, Plug, Zap, RefreshCw, Unplug, Plus, CheckCircle2 } from "lucide-react";

interface Integration {
  id: string;
  provider: string;
  name: string;
  type: string;
  docsUrl?: string | null;
  enabled: boolean;
}

interface Connection {
  id: string;
  name: string;
  integrationId: string;
  baseUrl?: string | null;
  status: string;
  hasCreds: boolean;
  credsKeys: number;
  lastTestedAt?: string | null;
  lastSyncAt?: string | null;
  createdAt: string;
}

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-800 text-slate-400",
  TESTED: "bg-blue-950 text-blue-300 border border-blue-800/60",
  SYNCED: "bg-emerald-950 text-emerald-300 border border-emerald-800/60",
};

export default function IntegrazioniPage() {
  const [catalogo, setCatalogo] = useState<Integration[]>([]);
  const [connessioni, setConnessioni] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openForm, setOpenForm] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/integrazioni");
      const data = await res.json();
      if (data.catalogo) setCatalogo(data.catalogo);
      if (data.connessioni) setConnessioni(data.connessioni);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setName("");
    setBaseUrl("");
    setApiKey("");
    setUsername("");
    setPassword("");
    setOpenForm(null);
  };

  const handleConnect = async (integrationId: string) => {
    setBusy(integrationId);
    setError("");
    setSuccess("");
    try {
      const credentials: Record<string, unknown> = {};
      if (apiKey) credentials.apiKey = apiKey;
      if (username) credentials.username = username;
      if (password) credentials.password = password;

      const res = await fetch("/api/integrazioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationId,
          name: name || baseUrl || "Connessione",
          baseUrl: baseUrl || null,
          credentials,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nella connessione");
      setSuccess(`Provider collegato: ${name || baseUrl || "Connessione"}. Ora testa la connessione.`);
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const handleTest = async (connId: string) => {
    setBusy(connId);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/integrazioni/${connId}/test`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test fallito");
      setSuccess(data.detail?.message ?? "Test completato.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const handleSync = async (connId: string) => {
    setBusy(connId);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/integrazioni/${connId}/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync fallito");
      setSuccess(data.detail?.message ?? "Sincronizzazione completata.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = async (connId: string) => {
    setBusy(connId);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/integrazioni/${connId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nello scollegamento");
      setSuccess("Connessione scollegata.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Caricamento integrazioni...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center">
          <Cloud className="w-6 h-6 mr-2.5 text-blue-400" /> API & Integrazioni
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Collega i sistemi esterni (GPS, TMS, ERP, tachigrafi, borse carichi). Le credenziali sono cifrate.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">{error}</div>
      )}
      {success && (
        <div className="flex items-center p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs rounded-xl">
          <CheckCircle2 className="w-4 h-4 mr-2" /> {success}
        </div>
      )}

      {/* Provider collegati */}
      <section>
        <h2 className="text-xs font-bold uppercase text-slate-500 tracking-wide mb-3">
          Connessioni attive ({connessioni.length})
        </h2>
        {connessioni.length === 0 ? (
          <div className="p-6 text-center bg-slate-900 border border-slate-800 rounded-2xl">
            <Cloud className="w-8 h-8 mx-auto text-slate-600 mb-3" />
            <p className="text-sm text-slate-400">Nessuna integrazione collegata.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {connessioni.map((c) => (
              <div key={c.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-bold text-slate-100">{c.name}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${statusStyles[c.status]}`}>
                        {c.status}
                      </span>
                    </div>
                    {c.baseUrl && (
                      <p className="text-xs font-mono text-slate-500 mt-0.5 truncate">{c.baseUrl}</p>
                    )}
                    <p className="text-[11px] text-slate-500 mt-1">
                      Credenziali: {c.hasCreds ? `configurate (${c.credsKeys})` : "mancanti"}
                      {c.lastTestedAt && ` · Test: ${new Date(c.lastTestedAt).toLocaleString("it-IT")}`}
                      {c.lastSyncAt && ` · Sync: ${new Date(c.lastSyncAt).toLocaleString("it-IT")}`}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTest(c.id)}
                      disabled={busy === c.id || !c.baseUrl || !c.hasCreds || c.status === "TESTED"}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {busy === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      <span className="ml-1">{c.status === "TESTED" ? "Esegui test" : "Testa"}</span>
                    </button>
                    <button
                      onClick={() => handleSync(c.id)}
                      disabled={busy === c.id || (c.status !== "TESTED" && c.status !== "SYNCED")}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {busy === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span className="ml-1">Sync</span>
                    </button>
                    <button
                      onClick={() => handleDisconnect(c.id)}
                      disabled={busy === c.id}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-950/60 text-red-300 border border-red-800/60 hover:bg-red-900/60 transition disabled:opacity-50"
                    >
                      <Unplug className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Catalogo provider */}
      <section>
        <h2 className="text-xs font-bold uppercase text-slate-500 tracking-wide mb-3">
          Collega un nuovo sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {catalogo.map((prov) => {
            const alreadyConnected = connessioni.some((c) => c.integrationId === prov.id);
            return (
              <div key={prov.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-slate-100">{prov.name}</p>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {prov.type}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-500">{prov.provider}</p>
                {prov.docsUrl && (
                  <a
                    href={prov.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs text-blue-400 hover:underline mt-2"
                  >
                    Documentazione API
                  </a>
                )}

                {openForm === prov.id ? (
                  <div className="mt-4 space-y-3">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nome connessione"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                    />
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="Base URL (https://...)"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none font-mono"
                    />
                    <div className="grid grid-cols-1 gap-2">
                      <input
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="API Key (opzionale)"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none font-mono"
                      />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username (opzionale)"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                      />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password (opzionale)"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleConnect(prov.id)}
                        disabled={busy === prov.id}
                        className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-60"
                      >
                        {busy === prov.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />}
                        <span>Collega</span>
                      </button>
                      <button
                        onClick={resetForm}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setOpenForm(prov.id)}
                    disabled={alreadyConnected}
                    className="mt-4 inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{alreadyConnected ? "Già collegato" : "Collega"}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
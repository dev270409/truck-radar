"use client";

import { useEffect, useState } from "react";
import { Cloud, Loader2, Plug, Zap, RefreshCw, Unplug, Plus, CheckCircle2, BookOpen, ExternalLink, Eye, EyeOff, ShieldCheck } from "lucide-react";

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

const typeLabels: Record<string, string> = {
  GPS: "Telematica e GPS",
  TMS: "Gestionali trasporto",
  ERP: "ERP e fatturazione",
  TACHIGRAFO: "Tachigrafo",
  BORSA: "Borse carichi",
  CARBURANTE: "Carburante",
};

const geotabDocs = [
  { label: "Guida ufficiale: iniziare con MyGeotab API", url: "https://developers.geotab.com/myGeotab/guides/gettingStarted/" },
  { label: "Autenticazione e sessione API", url: "https://developers.geotab.com/myGeotab/guides/concepts/" },
  { label: "API Runner per test in sola lettura", url: "https://my.geotab.com/runner" },
  { label: "Client API disponibili", url: "https://developers.geotab.com/myGeotab/apiClients/" },
];

export default function IntegrazioniPage() {
  const [catalogo, setCatalogo] = useState<Integration[]>([]);
  const [connessioni, setConnessioni] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openForm, setOpenForm] = useState<string | null>(null);
  const [openGuide, setOpenGuide] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [database, setDatabase] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const catalogGroups = catalogo.reduce<Record<string, Integration[]>>((groups, provider) => {
    const label = typeLabels[provider.type] ?? "Altri sistemi";
    (groups[label] ??= []).push(provider);
    return groups;
  }, {});

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
    setClientId("");
    setClientSecret("");
    setUsername("");
    setPassword("");
    setDatabase("");
    setShowPassword(false);
    setOpenForm(null);
  };

  const handleConnect = async (integrationId: string) => {
    setBusy(integrationId);
    setError("");
    setSuccess("");
    try {
      const credentials: Record<string, unknown> = {};
      if (apiKey) credentials.apiKey = apiKey;
      if (clientId) credentials.clientId = clientId;
      if (clientSecret) credentials.clientSecret = clientSecret;
      if (username) credentials.username = username;
      if (password) credentials.password = password;
      if (database) credentials.database = database;

      const provider = catalogo.find((item) => item.id === integrationId)?.provider;
      const resolvedBaseUrl = provider === "GEOTAB" ? "https://my.geotab.com" : baseUrl || null;

      const res = await fetch("/api/integrazioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationId,
          name: name || (provider === "GEOTAB" ? "MyGeotab" : baseUrl || "Connessione"),
          baseUrl: resolvedBaseUrl,
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
                {/** La lettura Geotab è reale e read-only; gli adapter non implementati non vanno presentati come sync attive. */}
                {(() => {
                  const provider = catalogo.find((item) => item.id === c.integrationId)?.provider;
                  const isGeotab = provider === "GEOTAB";
                  const liveProvider = isGeotab || process.env.NODE_ENV !== "production";
                  return (
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
                    {!isGeotab && process.env.NODE_ENV === "production" && (
                      <p className="mt-1 text-[10px] font-semibold text-amber-300">Credenziali salvate; adapter live non ancora disponibile.</p>
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
                      disabled={!liveProvider || busy === c.id || !c.baseUrl || !c.hasCreds || c.status === "TESTED"}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!liveProvider ? "Test live non ancora disponibile per questo provider." : undefined}
                    >
                      {busy === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      <span className="ml-1">{!liveProvider ? "Non disponibile" : c.status === "TESTED" ? "Esegui test" : "Testa"}</span>
                    </button>
                    <button
                      onClick={() => handleSync(c.id)}
                      disabled={!liveProvider || busy === c.id || (c.status !== "TESTED" && c.status !== "SYNCED")}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isGeotab ? "Lettura di sola lettura dei dispositivi visibili in MyGeotab; nessun mezzo locale viene modificato." : "Sincronizzazione simulata solo nei test locali."}
                    >
                      {busy === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span className="ml-1">{isGeotab ? "Leggi flotta" : process.env.NODE_ENV === "production" ? "Non disponibile" : "Sync sandbox"}</span>
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
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Catalogo provider */}
      <section>
        <h2 className="text-xs font-bold uppercase text-slate-500 tracking-wide mb-3">
          Scegli provider e metodo di autenticazione
        </h2>
        <p className="mb-5 max-w-3xl text-xs leading-5 text-slate-400">
          Le credenziali cambiano da un fornitore all&apos;altro: Geotab usa database + utente + password; gli altri connettori richiedono la chiave o il flusso indicato dal provider. Usa un account di servizio con permessi minimi, non condividere password personali.
        </p>
        <div className="space-y-8">
          {Object.entries(catalogGroups).map(([group, providers]) => (
            <div key={group}>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">{group}</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {providers.map((prov) => {
                  const alreadyConnected = connessioni.some((c) => c.integrationId === prov.id);
                  const isGeotab = prov.provider === "GEOTAB";
                  const guideOpen = openGuide === prov.id || openForm === prov.id;
                  const canConnect = isGeotab ? Boolean(database.trim() && username.trim() && password) : true;
                  return (
                    <div key={prov.id} className={`rounded-2xl border p-5 ${isGeotab ? "border-blue-700/70 bg-slate-900" : "border-slate-800 bg-slate-900"}`}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-100">{prov.name}</p>
                        <span className="rounded-full bg-slate-800 px-2 py-1 text-[9px] font-bold uppercase text-slate-300">
                          {isGeotab ? "Database + utente" : "API key / OAuth"}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-500">{prov.provider} · {prov.type}</p>

                      {isGeotab && (
                        <div className="mt-3 rounded-xl border border-blue-800/60 bg-blue-950/30 p-3 text-[11px] leading-5 text-blue-100">
                          <strong>Per Geotab non serve una API key separata.</strong> Si usa un account MyGeotab dedicato; Truck Radar effettua Authenticate, conserva le credenziali cifrate e riusa la sessione solo lato server.
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setOpenGuide(openGuide === prov.id ? null : prov.id)}
                        className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-300 hover:text-blue-200"
                        aria-expanded={guideOpen}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        {isGeotab ? "Dove trovo database e utente API?" : "Come ottenere le credenziali"}
                      </button>

                      {guideOpen && (
                        <div className="mt-3 space-y-2 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-[11px] leading-5 text-slate-300">
                          {isGeotab ? (
                            <ol className="list-decimal space-y-1 pl-4">
                              <li>Accedi a MyGeotab e usa il nome database della tua istanza (lo stesso selezionato nella schermata di accesso).</li>
                              <li>Chiedi all&apos;amministratore MyGeotab di creare un utente dedicato, ad esempio <em>Truck Radar API</em>, con accesso in sola lettura ai gruppi/veicoli necessari.</li>
                              <li>Inserisci l&apos;email di quell&apos;utente e la sua password. Non usare la password del tuo account personale.</li>
                              <li>Premi <strong>Collega</strong>, poi <strong>Testa</strong>. Il test autentica e prova a leggere al massimo un dispositivo.</li>
                            </ol>
                          ) : (
                            <ol className="list-decimal space-y-1 pl-4">
                              <li>Apri il portale amministrativo del provider e cerca “API”, “Developer”, “Integrazioni” o “Credenziali”.</li>
                              <li>Crea credenziali per un account di servizio, con permessi di lettura limitati ai dati necessari.</li>
                              <li>Inserisci qui la chiave/token o username/password richiesti dalla documentazione ufficiale del provider.</li>
                              <li>Questo connettore generico non esegue ancora test live in produzione: non considerarlo collegato finché non è disponibile un adapter specifico.</li>
                            </ol>
                          )}
                          {(isGeotab ? geotabDocs.map((d) => ({ ...d, url: d.url })) : prov.docsUrl ? [{ label: "Documentazione del provider", url: prov.docsUrl }] : []).map((doc) => (
                            <a key={doc.url} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-300 hover:underline">
                              <ExternalLink className="h-3 w-3" /> {doc.label}
                            </a>
                          ))}
                        </div>
                      )}

                      {openForm === prov.id ? (
                        <div className="mt-4 space-y-3">
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={isGeotab ? "Nome connessione (es. Geotab flotta)" : "Nome connessione"}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
                          />
                          {isGeotab ? (
                            <>
                              <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Database MyGeotab
                                <input required autoComplete="off" value={database} onChange={(e) => setDatabase(e.target.value)} placeholder="es. nome_database" className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm normal-case text-slate-100 outline-none focus:border-blue-500" />
                              </label>
                              <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Email / username dell&apos;utente API
                                <input required type="email" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="truck-radar-api@azienda.it" className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm normal-case text-slate-100 outline-none focus:border-blue-500" />
                              </label>
                              <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Password dell&apos;utente API
                                <span className="relative mt-1 block">
                                  <input required type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password MyGeotab" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 pr-10 text-sm normal-case text-slate-100 outline-none focus:border-blue-500" />
                                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Nascondi password" : "Mostra password"} className="absolute right-3 top-2.5 text-slate-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                                </span>
                              </label>
                              <div className="flex items-start gap-2 rounded-lg bg-emerald-950/30 p-2 text-[10px] leading-4 text-emerald-200">
                                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                                Inviamo le credenziali solo al server MyGeotab via HTTPS POST; le salviamo cifrate e non le mostriamo di nuovo.
                              </div>
                            </>
                          ) : (
                            <>
                              <input type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="Base URL HTTPS del provider" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-blue-500" />
                              <input type="password" autoComplete="new-password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API key / token" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-blue-500" />
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <input type="text" autoComplete="off" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Client ID (OAuth, se richiesto)" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-blue-500" />
                                <input type="password" autoComplete="new-password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="Client secret (OAuth)" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-blue-500" />
                              </div>
                              <input type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username (se richiesto)" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500" />
                              <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (se richiesta)" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500" />
                            </>
                          )}
                          <div className="flex gap-2">
                            <button onClick={() => handleConnect(prov.id)} disabled={busy === prov.id || !canConnect} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50">
                              {busy === prov.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                              <span>Collega in modo sicuro</span>
                            </button>
                            <button onClick={resetForm} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700">Annulla</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setOpenForm(prov.id); setOpenGuide(prov.id); }}
                          disabled={alreadyConnected}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{alreadyConnected ? "Già collegato" : isGeotab ? "Configura MyGeotab" : "Configura provider"}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

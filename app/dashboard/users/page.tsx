"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Plus, ShieldCheck, UserCheck, Loader2, BarChart3, KeyRound, Copy, UserPlus } from "lucide-react";
import { label } from "@/lib/labels";
import { PERMISSION_GROUPS, type PermissionKey } from "@/lib/permissions-catalog";

interface UserItem {
  id: string;
  email: string;
  nome: string;
  cognome: string;
  telefono?: string;
  role: string;
  permissions?: Partial<Record<PermissionKey, boolean>>;
  isActive: boolean;
  vehicleId?: string;
  createdAt: string;
}

interface VehicleItem {
  id: string;
  targa: string;
}

interface GeotabConnection {
  provider?: string;
  geotabSnapshot?: { drivers?: ExternalGeotabDriver[]; snapshotAt?: string | null };
}

interface ExternalGeotabDriver {
  geotabId: string;
  firstName: string;
  lastName: string;
  linkedLocalUserId?: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [geotabDrivers, setGeotabDrivers] = useState<ExternalGeotabDriver[]>([]);
  const [geotabSnapshotAt, setGeotabSnapshotAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [resetResult, setResetResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [permissionUser, setPermissionUser] = useState<UserItem | null>(null);
  const [permissionDraft, setPermissionDraft] = useState<Partial<Record<PermissionKey, boolean>>>({});
  const [permissionSaving, setPermissionSaving] = useState(false);

  // Form State
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [role, setRole] = useState<"AUTISTA" | "UFFICIO">("AUTISTA");
  const [vehicleId, setVehicleId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const geotabLinkedLocalIds = new Set(geotabDrivers.map((driver) => driver.linkedLocalUserId).filter((id): id is string => Boolean(id)));
  const unmatchedGeotabDrivers = geotabDrivers.filter((driver) => !driver.linkedLocalUserId);

  const fetchData = async () => {
    try {
      const [resUsers, resVehicles] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/vehicles"),
      ]);
      const dataUsers = await resUsers.json();
      const dataVehicles = await resVehicles.json();

      if (dataUsers.users) setUsers(dataUsers.users);
      if (dataVehicles.vehicles) setVehicles(dataVehicles.vehicles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
    try {
      const res = await fetch("/api/integrazioni");
      if (!res.ok) return;
      const data = await res.json();
      const geotab = (data.connessioni ?? []).find((connection: GeotabConnection) => connection.provider === "GEOTAB");
      setGeotabDrivers(geotab?.geotabSnapshot?.drivers ?? []);
      setGeotabSnapshotAt(geotab?.geotabSnapshot?.snapshotAt ?? null);
    } catch {
      // Il roster locale non dipende dall'accesso al catalogo integrazioni.
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { void fetchData(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  const resetPassword = async (u: UserItem) => {
    if (!window.confirm(`Reimpostare la password di ${u.email}?`)) return;
    setSaving(true);
    setError("");
    setResetResult(null);
    try {
      const res = await fetch(`/api/users/${u.id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel reset password");
      setResetResult({ email: data.email, tempPassword: data.tempPassword });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const openPermissions = (u: UserItem) => {
    setPermissionUser(u);
    setPermissionDraft(u.permissions ?? {});
    setError("");
  };

  const savePermissions = async () => {
    if (!permissionUser) return;
    setPermissionSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${permissionUser.id}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: permissionDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio permessi");
      setPermissionUser(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPermissionSaving(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          cognome,
          email,
          password,
          telefono,
          role,
          vehicleId: role === "AUTISTA" ? vehicleId || null : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nella creazione dell'utente");

      setNome("");
      setCognome("");
      setEmail("");
      setPassword("");
      setTelefono("");
      setShowAddModal(false);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)] flex items-center">
            <Users className="w-6 h-6 mr-2.5 text-indigo-400" /> Gestione Team & Autisti
          </h1>
          <p className="text-sm text-[var(--text-label)] mt-1">
            Crea le credenziali degli autisti, assegna il mezzo e gestisci il team.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/users/geotab" className="bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 text-sm font-semibold px-4 py-2.5 rounded-xl border border-emerald-800/60 flex items-center space-x-2 transition">
            <UserPlus className="w-4 h-4" /><span>Importa da Geotab</span>
          </Link>
          <Link href="/dashboard/analytics?scope=autista" className="bg-[var(--surface-strong)] hover:bg-[var(--surface-border)] text-[var(--text)] text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center space-x-2 transition">
            <BarChart3 className="w-4 h-4" /><span>Analisi autisti</span>
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl   flex items-center space-x-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Aggiungi utente</span>
          </button>
        </div>
      </div>

      {geotabSnapshotAt && (
        <section className="overflow-hidden rounded-xl border border-sky-800/60 bg-[var(--surface)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--surface-border)] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold   text-[var(--text)]">Driver presenti in Geotab · sola lettura</h2>
              <p className="mt-1 text-[11px] text-[var(--text-label)]">Non sono account Truck Radar e non possono accedere alla PWA. Crea un account locale solo dopo aver verificato il nominativo.</p>
            </div>
            {geotabSnapshotAt && <span className="text-[11px] text-[var(--text-label)]">Lettura {new Date(geotabSnapshotAt).toLocaleString("it-IT")}</span>}
          </div>
          {geotabDrivers.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[var(--text-label)]">Nessun driver restituito da MyGeotab. Verifica che l&apos;utente API abbia accesso agli utenti/driver e che i profili siano marcati come driver.</p>
          ) : unmatchedGeotabDrivers.length === 0 ? (
            <p className="px-5 py-6 text-sm text-emerald-200">Tutti i driver Geotab letti sono già associati a un account locale tramite lo username/email.</p>
          ) : (
            <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {unmatchedGeotabDrivers.map((driver) => (
                <div key={driver.geotabId} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2.5">
                  <p className="text-sm font-semibold text-[var(--text)]">{`${driver.firstName} ${driver.lastName}`.trim() || "Nome non disponibile"}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-[var(--text-label-soft)]">ID Geotab · {driver.geotabId}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Users Table */}
      <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl overflow-hidden ">
        {loading ? (
          <div className="p-12 text-center text-[var(--text-label)] flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Caricamento utenti in corso...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-label-soft)]">
            Nessun membro del team trovato. Clicca su &quot;Aggiungi autista&quot; per creare credenziali e accesso PWA.
          </div>
        ) : (
          <>
          <div className="space-y-3 md:hidden">
            {users.map((u) => (
              <div key={u.id} className="ops-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text)]">{u.nome} {u.cognome}</p>
                    <p className="truncate font-mono text-[11px] text-[var(--text-label)]">{u.email}</p>
                  </div>
                  <span className="chip chip-brand">{label(u.role)}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3" style={{ borderColor: "var(--surface-border)" }}>
                  <span className="text-[11px] font-semibold text-emerald-400">Attivo</span>
                  <div className="flex gap-2">
                    {u.role !== "ADMIN" && (
                      <button
                        type="button"
                        onClick={() => openPermissions(u)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--surface-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-soft)] hover:border-indigo-600 hover:text-indigo-200"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Permessi
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => resetPassword(u)}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--surface-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-soft)] hover:border-amber-600 hover:text-amber-200 disabled:opacity-50"
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Reset
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm text-[var(--text-soft)]">
              <thead className="bg-black/60 text-xs font-semibold text-[var(--text-label)]   border-b border-[var(--surface-border)]">
                <tr>
                  <th className="px-6 py-4">Nome & Cognome</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Telefono</th>
                  <th className="px-6 py-4">Ruolo Aziendale</th>
                  <th className="px-6 py-4">Stato Account</th>
                  <th className="px-6 py-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-border)]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--surface-soft)] transition">
                    <td className="px-6 py-4 font-semibold text-[var(--text)]">
                      {u.nome} {u.cognome}
                      {geotabLinkedLocalIds.has(u.id) && <span className="ml-2 rounded-full border border-sky-700/60 bg-sky-950/40 px-2 py-0.5 text-[9px] font-semibold  text-sky-200">Geotab collegato</span>}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[var(--text-soft)]">{u.email}</td>
                    <td className="px-6 py-4 text-xs text-[var(--text-label)]">{u.telefono || "-"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                          u.role === "ADMIN"
                            ? "bg-purple-950 text-purple-300 border border-purple-800/60"
                            : u.role === "AUTISTA"
                            ? "bg-indigo-950 text-indigo-300 border border-indigo-800/60"
                            : "bg-blue-950 text-blue-300 border border-blue-800/60"
                        }`}
                      >
                        {label(u.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded text-emerald-400 bg-emerald-950/80">
                        ATTIVO
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {u.role !== "ADMIN" && (
                          <button
                            type="button"
                            onClick={() => openPermissions(u)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--surface-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-soft)] hover:border-indigo-600 hover:text-indigo-200"
                            title="Gestisci permessi"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" /> Permessi
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => resetPassword(u)}
                          disabled={saving}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--surface-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-soft)] hover:border-amber-600 hover:text-amber-200 disabled:opacity-50"
                          title="Reimposta password"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {resetResult && (
        <div className="mb-5 rounded-xl border border-amber-800/60 bg-amber-950/30 p-4">
          <p className="text-sm font-semibold text-amber-100">
            Password temporanea per {resetResult.email}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-lg border border-amber-800/60 bg-[var(--surface-soft)] px-3 py-2 font-mono text-sm text-amber-100">
              {resetResult.tempPassword}
            </code>
            <button
              type="button"
              onClick={() => {
                if (navigator.clipboard) navigator.clipboard.writeText(resetResult.tempPassword);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-700/60 px-2.5 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-900/30"
            >
              <Copy className="h-3.5 w-3.5" /> Copia
            </button>
            <button
              type="button"
              onClick={() => setResetResult(null)}
              className="rounded-lg border border-[var(--surface-border)] px-2.5 py-2 text-xs font-semibold text-[var(--text-soft)]"
            >
              Chiudi
            </button>
          </div>
          <p className="mt-2 text-[11px] text-amber-200/70">
            Comunicala all’utente solo una volta. Al primo accesso può cambiarla da “Account e password”.
          </p>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60  z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl w-full max-w-md p-6  space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text)] flex items-center">
              <UserCheck className="w-5 h-5 mr-2 text-indigo-400" /> Crea account del team
            </h3>

            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-soft)]  mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Mario"
                    className="w-full bg-[var(--surface-soft)] border border-[var(--surface-border)] focus:border-[var(--brand)] rounded-xl px-4 py-2 text-[var(--text)] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-soft)]  mb-1">
                    Cognome *
                  </label>
                  <input
                    type="text"
                    required
                    value={cognome}
                    onChange={(e) => setCognome(e.target.value)}
                    placeholder="Rossi"
                    className="w-full bg-[var(--surface-soft)] border border-[var(--surface-border)] focus:border-[var(--brand)] rounded-xl px-4 py-2 text-[var(--text)] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-soft)]  mb-1">
                  Email Login *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="utente@azienda.it"
                  className="w-full bg-[var(--surface-soft)] border border-[var(--surface-border)] focus:border-[var(--brand)] rounded-xl px-4 py-2 text-[var(--text)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-soft)]  mb-1">
                  Password Iniziale *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--surface-soft)] border border-[var(--surface-border)] focus:border-[var(--brand)] rounded-xl px-4 py-2 text-[var(--text)] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-soft)]  mb-1">
                    Ruolo
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "AUTISTA" | "UFFICIO")}
                    className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-soft)] px-4 py-2 text-[var(--text)] outline-none"
                  >
                    <option value="AUTISTA">Autista</option>
                    <option value="UFFICIO">Ufficio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-soft)]  mb-1">
                    Telefono
                  </label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+39..."
                    className="w-full bg-[var(--surface-soft)] border border-[var(--surface-border)] focus:border-[var(--brand)] rounded-xl px-4 py-2 text-[var(--text)] outline-none"
                  />
                </div>
              </div>

              {role === "AUTISTA" && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-soft)]  mb-1">
                    Assegna Veicolo (Opzionale)
                  </label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full bg-[var(--surface-soft)] border border-[var(--surface-border)] focus:border-[var(--brand)] rounded-xl px-4 py-2 text-[var(--text)] outline-none font-mono text-xs"
                  >
                    <option value="">-- Nessun veicolo assegnato --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.targa}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-[var(--surface-border)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-[var(--surface-strong)] hover:bg-[var(--surface-border)] text-[var(--text-soft)] rounded-xl font-medium"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center space-x-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Crea Utente</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {permissionUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 ">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center text-lg font-semibold text-[var(--text)]">
                  <ShieldCheck className="mr-2 h-5 w-5 text-indigo-400" /> Permessi di {permissionUser.nome} {permissionUser.cognome}
                </h3>
                <p className="mt-1 text-xs text-[var(--text-label)]">
                  Il ruolo {label(permissionUser.role)} può accedere solo alle aree spuntate. Le API verificano gli stessi permessi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPermissionUser(null)}
                className="rounded-lg border border-[var(--surface-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-soft)]"
              >
                Chiudi
              </button>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {PERMISSION_GROUPS.map((group) => (
                <section key={group.group}>
                  <h4 className="text-[11px] font-semibold   text-[var(--text-label)]">{group.group}</h4>
                  <div className="mt-2 space-y-1.5">
                    {group.items.map((item) => (
                      <label key={item.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]">
                        <span>{item.label}</span>
                        <input
                          type="checkbox"
                          checked={permissionDraft[item.key] === true}
                          onChange={(event) =>
                            setPermissionDraft((current) => ({ ...current, [item.key]: event.target.checked }))
                          }
                          className="h-4 w-4 accent-indigo-500"
                        />
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-3 border-t border-[var(--surface-border)] pt-4">
              <button
                type="button"
                onClick={() => setPermissionUser(null)}
                className="rounded-xl bg-[var(--surface-strong)] px-4 py-2 text-sm font-medium text-[var(--text-soft)]"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={savePermissions}
                disabled={permissionSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {permissionSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salva permessi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

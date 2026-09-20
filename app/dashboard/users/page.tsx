"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Plus, ShieldCheck, UserCheck, Loader2, BarChart3 } from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  nome: string;
  cognome: string;
  telefono?: string;
  role: string;
  isActive: boolean;
  vehicleId?: string;
  createdAt: string;
}

interface VehicleItem {
  id: string;
  targa: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [role, setRole] = useState<"AUTISTA" | "COMMITTENTE">("AUTISTA");
  const [vehicleId, setVehicleId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
  };

  useEffect(() => {
    fetchData();
  }, []);

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <Users className="w-6 h-6 mr-2.5 text-indigo-400" /> Gestione Team & Autisti
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Crea le credenziali degli autisti, assegna il mezzo e gestisci il team.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/analytics?scope=autista" className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center space-x-2 transition">
            <BarChart3 className="w-4 h-4" /><span>Analisi autisti</span>
          </Link>
          <button
            onClick={() => { setRole("AUTISTA"); setShowAddModal(true); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Aggiungi autista</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Caricamento utenti in corso...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Nessun membro del team trovato. Clicca su "Aggiungi autista" per creare credenziali e accesso PWA.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Nome & Cognome</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Telefono</th>
                  <th className="px-6 py-4">Ruolo Aziendale</th>
                  <th className="px-6 py-4">Stato Account</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-semibold text-slate-100">
                      {u.nome} {u.cognome}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-300">{u.email}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{u.telefono || "-"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                          u.role === "ADMIN"
                            ? "bg-purple-950 text-purple-300 border border-purple-800/60"
                            : u.role === "AUTISTA"
                            ? "bg-indigo-950 text-indigo-300 border border-indigo-800/60"
                            : "bg-blue-950 text-blue-300 border border-blue-800/60"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold px-2 py-0.5 rounded text-emerald-400 bg-emerald-950/80">
                        ATTIVO
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center">
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
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Mario"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Cognome *
                  </label>
                  <input
                    type="text"
                    required
                    value={cognome}
                    onChange={(e) => setCognome(e.target.value)}
                    placeholder="Rossi"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Email Login *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="utente@azienda.it"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Password Iniziale *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Ruolo *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  >
                    <option value="AUTISTA">AUTISTA</option>
                    <option value="COMMITTENTE">COMMITTENTE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Telefono
                  </label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+39..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
              </div>

              {role === "AUTISTA" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Assegna Veicolo (Opzionale)
                  </label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-slate-100 outline-none font-mono text-xs"
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

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
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
    </div>
  );
}

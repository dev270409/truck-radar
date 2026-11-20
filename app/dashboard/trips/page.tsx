"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Route,
  Plus,
  Loader2,
  MapPin,
  ArrowRight,
  Euro,
  Truck,
  User,
  Pencil,
  Copy,
  FileUp,
  UserPlus,
  X,
} from "lucide-react";
import { label } from "@/lib/labels";
import TripSubnav from "@/components/TripSubnav";
import EmptyState from "@/components/ops/EmptyState";

interface Driver {
  id: string;
  nome: string;
  cognome: string;
  role: string;
}

interface Vehicle {
  id: string;
  targa: string;
  categoria: string;
}

interface CustomerLite {
  id: string;
  name: string;
  city: string | null;
  province: string | null;
}

interface Trip {
  id: string;
  luogoRitiro: string;
  luogoConsegna: string;
  dataRitiro: string;
  dataConsegna: string;
  tipoMerce: string;
  pesoKg: number;
  volumeM3: number;
  cliente?: string | null;
  prezzo?: number | null;
  costo?: number | null;
  status: string;
  vehicle?: { id: string; targa: string } | null;
  driver?: { id: string; nome: string; cognome: string } | null;
}

function localDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const statusStyles: Record<string, string> = {
  DA_ASSEGNARE: "bg-slate-950 text-slate-300 border border-slate-700",
  ASSEGNATO: "bg-indigo-950 text-indigo-300 border border-indigo-800/60",
  IN_CORSO: "bg-amber-950 text-amber-300 border border-amber-800/60",
  COMPLETATO: "bg-emerald-950 text-emerald-300 border border-emerald-800/60",
  ANNULLATO: "bg-red-950 text-red-300 border border-red-800/60",
  SUBAPPALTATO: "bg-purple-950 text-purple-300 border border-purple-800/60",
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [luogoRitiro, setLuogoRitiro] = useState("");
  const [luogoConsegna, setLuogoConsegna] = useState("");
  const [dataRitiro, setDataRitiro] = useState("");
  const [dataConsegna, setDataConsegna] = useState("");
  const [tipoMerce, setTipoMerce] = useState("");
  const [pesoKg, setPesoKg] = useState("0");
  const [volumeM3, setVolumeM3] = useState("0");
  const [cliente, setCliente] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [prezzo, setPrezzo] = useState("");
  const [costo, setCosto] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [assignTrip, setAssignTrip] = useState<Trip | null>(null);
  const [assignDriverId, setAssignDriverId] = useState("");
  const [assignVehicleId, setAssignVehicleId] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState("");

  const fetchTrips = async () => {
    try {
      const res = await fetch("/api/trips");
      const data = await res.json();
      if (data.trips) setTrips(data.trips);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [resV, resU, resC] = await Promise.all([
        fetch("/api/vehicles"),
        fetch("/api/users"),
        fetch("/api/customers?type=CLIENTE"),
      ]);
      const dataV = await resV.json();
      const dataU = await resU.json();
      const dataC = await resC.json();
      if (dataV.vehicles) setVehicles(dataV.vehicles);
      if (dataU.users) {
        setDrivers(dataU.users.filter((u: Driver) => u.role === "AUTISTA"));
      }
      if (resC.ok && Array.isArray(dataC.items)) {
        setCustomers(
          dataC.items.map((item: CustomerLite) => ({
            id: item.id,
            name: item.name,
            city: item.city,
            province: item.province,
          }))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTrips();
    fetchOptions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          luogoRitiro,
          luogoConsegna,
          dataRitiro: new Date(dataRitiro).toISOString(),
          dataConsegna: new Date(dataConsegna).toISOString(),
          tipoMerce,
          pesoKg,
          volumeM3,
          cliente,
          prezzo: prezzo || null,
          costo: costo || null,
          vehicleId: vehicleId || null,
          driverId: driverId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nella creazione del viaggio");

      setLuogoRitiro("");
      setLuogoConsegna("");
      setDataRitiro("");
      setDataConsegna("");
      setTipoMerce("");
      setPesoKg("0");
      setVolumeM3("0");
      setCliente("");
      setCustomerId("");
      setPrezzo("");
      setCosto("");
      setVehicleId("");
      setDriverId("");
      setShowAddModal(false);
      fetchTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start.getTime() + 86_400_000);
    setDataRitiro(localDateTime(start));
    setDataConsegna(localDateTime(end));
    setShowAddModal(true);
  };

  const selectCustomer = (id: string) => {
    setCustomerId(id);
    const customer = customers.find((item) => item.id === id);
    if (customer) setCliente(customer.name);
  };

  const duplicateTrip = (trip: Trip) => {
    const pickup = new Date(trip.dataRitiro);
    const delivery = new Date(trip.dataConsegna);
    pickup.setDate(pickup.getDate() + 1);
    delivery.setDate(delivery.getDate() + 1);
    setLuogoRitiro(trip.luogoRitiro);
    setLuogoConsegna(trip.luogoConsegna);
    setDataRitiro(localDateTime(pickup));
    setDataConsegna(localDateTime(delivery));
    setTipoMerce(trip.tipoMerce);
    setPesoKg(String(trip.pesoKg ?? 0));
    setVolumeM3(String(trip.volumeM3 ?? 0));
    setCliente(trip.cliente ?? "");
    setCustomerId("");
    setPrezzo(trip.prezzo != null ? String(trip.prezzo) : "");
    setCosto(trip.costo != null ? String(trip.costo) : "");
    setVehicleId(trip.vehicle?.id ?? "");
    setDriverId(trip.driver?.id ?? "");
    setError("");
    setShowAddModal(true);
  };

  const openAssign = (trip: Trip) => {
    setAssignTrip(trip);
    setAssignDriverId(trip.driver?.id ?? "");
    setAssignVehicleId(trip.vehicle?.id ?? "");
    setAssignError("");
  };

  const saveAssign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!assignTrip) return;
    if (!assignDriverId) {
      setAssignError("Seleziona un autista.");
      return;
    }
    setAssignSaving(true);
    setAssignError("");
    try {
      const isPast = new Date(assignTrip.dataRitiro).getTime() < Date.now();
      const status = isPast ? "COMPLETATO" : assignVehicleId ? "ASSEGNATO" : "DA_ASSEGNARE";
      const res = await fetch(`/api/trips/${assignTrip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: assignDriverId,
          vehicleId: assignVehicleId,
          status,
          eventNote: "Assegnazione rapida dalla lista viaggi",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore nell'assegnazione.");
      setAssignTrip(null);
      await fetchTrips();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : String(err));
    } finally {
      setAssignSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <Route className="w-6 h-6 mr-2.5 text-blue-400" /> Gestione Viaggi
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Crea, assegna e monitora i viaggi della tua azienda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/trips/importa"
            className="bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-700 flex items-center space-x-2 transition"
          >
            <FileUp className="w-4 h-4" />
            <span className="hidden sm:inline">Importa rendiconto</span>
          </Link>
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 flex items-center space-x-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Aggiungi Viaggio</span>
          </button>
        </div>
      </div>

      <TripSubnav active="trips" />

      {/* Trips Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Caricamento viaggi in corso...</span>
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            icon={Route}
            title="Nessun viaggio registrato"
            description="Crea il primo viaggio: cliente, tratta e date sono sufficienti. Mezzo e autista si possono assegnare dopo."
            actionLabel="Crea il primo viaggio"
            onAction={openAddModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Tratta</th>
                  <th className="px-6 py-4">Data Ritiro</th>
                  <th className="px-6 py-4">Merce</th>
                  <th className="px-6 py-4">Mezzo</th>
                  <th className="px-6 py-4">Autista</th>
                  <th className="px-6 py-4">Margine</th>
                  <th className="px-6 py-4">Stato</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {trips.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-slate-200 font-medium">
                        <span className="capitalize">{t.luogoRitiro}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        <span className="capitalize">{t.luogoConsegna}</span>
                      </div>
                      {t.cliente && (
                        <p className="text-[11px] text-slate-500 mt-0.5">Cliente: {t.cliente}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {new Date(t.dataRitiro).toLocaleDateString("it-IT")}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-200">{t.tipoMerce}</p>
                      <p className="text-[11px] text-slate-500">
                        {t.pesoKg} kg · {t.volumeM3} m³
                      </p>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-300">
                      {t.vehicle ? t.vehicle.targa : "—"}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300">
                      {t.driver ? `${t.driver.nome} ${t.driver.cognome}` : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {t.prezzo != null ? (
                        <span className="text-xs font-semibold text-emerald-300">
                          € {(t.prezzo - (t.costo ?? 0)).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusStyles[t.status] ?? statusStyles.DA_ASSEGNARE}`}>
                        {label(t.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openAssign(t)}
                          title={t.driver ? "Riassegna autista e mezzo" : "Assegna autista e mezzo"}
                          aria-label={`Assegna viaggio ${t.luogoRitiro} - ${t.luogoConsegna}`}
                          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1.5 rounded-lg transition"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span className="hidden xl:inline">{t.driver ? "Riassegna" : "Assegna"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateTrip(t)}
                          title="Duplica viaggio con date +1 giorno"
                          aria-label={`Duplica viaggio ${t.luogoRitiro} - ${t.luogoConsegna}`}
                          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-800/60 border border-slate-700 px-2.5 py-1.5 rounded-lg transition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span className="hidden xl:inline">Duplica</span>
                        </button>
                        <Link
                          href={`/dashboard/trips/${t.id}`}
                          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-300 hover:text-blue-200 bg-blue-950/40 border border-blue-800/60 px-3 py-1.5 rounded-lg transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Dettaglio</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick assign modal */}
      {assignTrip && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center">
                  <UserPlus className="w-5 h-5 mr-2 text-emerald-400" /> Assegna viaggio
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  {assignTrip.luogoRitiro} → {assignTrip.luogoConsegna} ·{" "}
                  {new Date(assignTrip.dataRitiro).toLocaleDateString("it-IT")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignTrip(null)}
                aria-label="Chiudi"
                className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {assignError && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">
                {assignError}
              </div>
            )}

            <form onSubmit={saveAssign} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Autista *
                </label>
                <select
                  required
                  value={assignDriverId}
                  onChange={(e) => setAssignDriverId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                >
                  <option value="">-- Seleziona autista --</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.nome} {driver.cognome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Mezzo (opzionale)
                </label>
                <select
                  value={assignVehicleId}
                  onChange={(e) => setAssignVehicleId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-slate-100 outline-none font-mono text-xs"
                >
                  <option value="">-- Nessun mezzo --</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.targa} · {label(vehicle.categoria)}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-500">
                Se il viaggio è nel passato viene segnato come completato. L&apos;autista lo vede
                subito nella sua area personale.
              </p>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAssignTrip(null)}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300"
                  disabled={assignSaving}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={assignSaving || !assignDriverId}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {assignSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Assegna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Trip Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-100 flex items-center">
              <Route className="w-5 h-5 mr-2 text-blue-400" /> Nuovo Viaggio
            </h3>

            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center text-xs font-semibold text-slate-300 uppercase mb-1">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Luogo di Ritiro *
                  </label>
                  <input
                    type="text"
                    required
                    value={luogoRitiro}
                    onChange={(e) => setLuogoRitiro(e.target.value)}
                    placeholder="Es. Milano"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center text-xs font-semibold text-slate-300 uppercase mb-1">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-rose-400" /> Luogo di Consegna *
                  </label>
                  <input
                    type="text"
                    required
                    value={luogoConsegna}
                    onChange={(e) => setLuogoConsegna(e.target.value)}
                    placeholder="Es. Bari"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Data & Ora Ritiro *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={dataRitiro}
                    onChange={(e) => setDataRitiro(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Data & Ora Consegna *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={dataConsegna}
                    onChange={(e) => setDataConsegna(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Tipologia Merce *
                </label>
                <input
                  type="text"
                  required
                  value={tipoMerce}
                  onChange={(e) => setTipoMerce(e.target.value)}
                  placeholder="Es. Frutta fresca"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    value={pesoKg}
                    onChange={(e) => setPesoKg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Volume (m³)
                  </label>
                  <input
                    type="number"
                    value={volumeM3}
                    onChange={(e) => setVolumeM3(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    <Euro className="w-3 h-3 inline mr-1" /> Prezzo (€)
                  </label>
                  <input
                    type="number"
                    value={prezzo}
                    onChange={(e) => setPrezzo(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Costo (€)
                  </label>
                  <input
                    type="number"
                    value={costo}
                    onChange={(e) => setCosto(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Anagrafica cliente
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => selectCustomer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 outline-none text-xs"
                  >
                    <option value="">Cliente occasionale / nuovo</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                        {customer.city ? ` · ${customer.city}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Cliente (opzionale)
                  </label>
                  <input
                    type="text"
                    value={cliente}
                    onChange={(e) => {
                      setCliente(e.target.value);
                      setCustomerId("");
                    }}
                    placeholder="Ragione sociale cliente"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center text-xs font-semibold text-slate-300 uppercase mb-1">
                    <Truck className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Mezzo (opzionale)
                  </label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 outline-none font-mono text-xs"
                  >
                    <option value="">-- Nessun mezzo --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.targa} · {label(v.categoria)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center text-xs font-semibold text-slate-300 uppercase mb-1">
                    <User className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Autista (opzionale)
                  </label>
                  <select
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 outline-none text-xs"
                  >
                    <option value="">-- Nessun autista --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nome} {d.cognome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold flex items-center space-x-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Crea Viaggio</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
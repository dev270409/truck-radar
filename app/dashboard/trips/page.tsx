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
  Search,
} from "lucide-react";
import { label } from "@/lib/labels";
import TripSubnav from "@/components/TripSubnav";
import EmptyState from "@/components/ops/EmptyState";
import HoldButton from "@/components/kokonutui/hold-button";

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

type TripFilter = "TUTTI" | "DA_ASSEGNARE" | "ATTIVI" | "COMPLETATO";

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
  const [statusFilter, setStatusFilter] = useState<TripFilter>("TUTTI");
  const [searchQuery, setSearchQuery] = useState("");

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
  const [forecast, setForecast] = useState<{
    monthsUsed: number;
    projected12m: number;
    confidence: string;
  } | null>(null);
  const [assignTrip, setAssignTrip] = useState<Trip | null>(null);
  const [assignDriverId, setAssignDriverId] = useState("");
  const [assignVehicleId, setAssignVehicleId] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [suggestions, setSuggestions] = useState<{
    vehicles: Array<{ id: string; targa: string; categoria: string; score: number; reasons: string[] }>;
    drivers: Array<{ id: string; nome: string; score: number; reasons: string[] }>;
    note?: string;
  } | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

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

  const fetchForecast = async () => {
    try {
      const res = await fetch("/api/trips/import");
      const data = await res.json();
      if (res.ok && data.forecast) {
        setForecast({
          monthsUsed: data.forecast.monthsUsed,
          projected12m: data.forecast.projected12m,
          confidence: data.forecast.confidence,
        });
      }
    } catch {
      /* la stima è un extra */
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTrips();
      void fetchOptions();
      void fetchForecast();
    }, 0);
    return () => window.clearTimeout(timer);
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

  const openAssign = async (trip: Trip) => {
    setAssignTrip(trip);
    setAssignDriverId(trip.driver?.id ?? "");
    setAssignVehicleId(trip.vehicle?.id ?? "");
    setAssignError("");
    setSuggestions(null);
    setSuggestionsLoading(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/recommendations`);
      const data = await res.json();
      if (res.ok) setSuggestions(data);
    } catch {
      /* i consigli sono un extra: il form resta utilizzabile */
    } finally {
      setSuggestionsLoading(false);
    }
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

  const tripCounts = trips.reduce(
    (counts, trip) => {
      counts.all += 1;
      if (trip.status === "DA_ASSEGNARE") counts.unassigned += 1;
      if (trip.status === "ASSEGNATO" || trip.status === "IN_CORSO") counts.active += 1;
      if (trip.status === "COMPLETATO") counts.completed += 1;
      return counts;
    },
    { all: 0, unassigned: 0, active: 0, completed: 0 }
  );

  const filterOptions: Array<{ value: TripFilter; label: string; count: number }> = [
    { value: "TUTTI", label: "Tutti", count: tripCounts.all },
    { value: "DA_ASSEGNARE", label: "Da assegnare", count: tripCounts.unassigned },
    { value: "ATTIVI", label: "Attivi", count: tripCounts.active },
    { value: "COMPLETATO", label: "Completati", count: tripCounts.completed },
  ];

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("it-IT");
  const filteredTrips = trips.filter((trip) => {
    const matchesStatus =
      statusFilter === "TUTTI" ||
      (statusFilter === "ATTIVI"
        ? trip.status === "ASSEGNATO" || trip.status === "IN_CORSO"
        : trip.status === statusFilter);
    if (!matchesStatus) return false;
    if (!normalizedSearch) return true;

    const searchable = [
      trip.luogoRitiro,
      trip.luogoConsegna,
      trip.cliente ?? "",
      trip.vehicle?.targa ?? "",
      trip.driver ? `${trip.driver.nome} ${trip.driver.cognome}` : "",
    ]
      .join(" ")
      .toLocaleLowerCase("it-IT");

    return searchable.includes(normalizedSearch);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 flex items-center">
            <Route className="w-6 h-6 mr-2.5 text-blue-400" /> Viaggi
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Crea i viaggi, assegna mezzo e autista e controlla lo stato.
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
            <span>Aggiungi viaggio</span>
          </button>
        </div>
      </div>

      <TripSubnav active="trips" />

      {forecast && forecast.monthsUsed > 0 && (
        <Link
          href="/dashboard/trips/importa"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-800/50 bg-emerald-950/20 px-4 py-3 transition hover:bg-emerald-950/30"
        >
          <div>
            <p className="text-xs font-semibold text-emerald-200/70">
              Stima 12 mesi · {forecast.monthsUsed} mes{forecast.monthsUsed === 1 ? "e" : "i"}
            </p>
            <p className="font-display text-lg font-bold text-emerald-100">
              € {Math.round(forecast.projected12m).toLocaleString("it-IT")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-emerald-200/70">Affidabilità {forecast.confidence.toLowerCase()}</p>
            <p className="text-xs font-semibold text-emerald-200">Apri rendiconti e analisi →</p>
          </div>
        </Link>
      )}

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
          <>
            <div className="grid gap-4 border-b border-slate-800 p-4 lg:grid-cols-[minmax(240px,1fr)_auto] lg:items-end">
              <label htmlFor="trip-search" className="block min-w-0">
                <span className="mb-1.5 block text-xs font-medium text-slate-300">Cerca per tratta, cliente o mezzo</span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <input
                    id="trip-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Tratta, cliente o targa…"
                    className="ops-input pl-9"
                  />
                </span>
              </label>

              <div role="group" aria-label="Filtra i viaggi per stato" className="flex flex-wrap gap-2">
                {filterOptions.map((option) => {
                  const active = statusFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setStatusFilter(option.value)}
                      className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                        active
                          ? "border-blue-500 bg-blue-600 text-white"
                          : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500 hover:text-slate-100"
                      }`}
                    >
                      {option.label} <span className="ml-1 font-mono tabular-nums">{option.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Tratta</th>
                  <th className="px-6 py-4">Ritiro</th>
                  <th className="px-6 py-4">Merce</th>
                  <th className="px-6 py-4">Mezzo</th>
                  <th className="px-6 py-4">Autista</th>
                  <th className="px-6 py-4">Margine</th>
                  <th className="px-6 py-4">Stato</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">
                      <p>Nessun viaggio corrisponde alla ricerca o al filtro scelto.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setStatusFilter("TUTTI");
                        }}
                        className="mt-3 font-semibold text-blue-300 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
                      >
                        Azzera filtri
                      </button>
                    </td>
                  </tr>
                ) : filteredTrips.map((t) => (
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
          </>
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

            {suggestionsLoading && (
              <p className="flex items-center gap-2 text-[11px] text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calcolo dei consigli…
              </p>
            )}

            {suggestions && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Consigliati</p>
                {suggestions.vehicles.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold text-slate-500">Mezzi</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {suggestions.vehicles.map((vehicle) => (
                        <button
                          key={vehicle.id}
                          type="button"
                          onClick={() => setAssignVehicleId(vehicle.id)}
                          title={vehicle.reasons.join(" · ")}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                            assignVehicleId === vehicle.id
                              ? "border-emerald-600 bg-emerald-950/60 text-emerald-200"
                              : "border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-700"
                          }`}
                        >
                          {vehicle.targa} · {label(vehicle.categoria)}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {suggestions.vehicles[0].reasons.slice(0, 2).join(" · ")}
                    </p>
                  </div>
                )}
                {suggestions.drivers.length > 0 ? (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold text-slate-500">Autisti</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {suggestions.drivers.map((driver) => (
                        <button
                          key={driver.id}
                          type="button"
                          onClick={() => setAssignDriverId(driver.id)}
                          title={driver.reasons.join(" · ")}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                            assignDriverId === driver.id
                              ? "border-emerald-600 bg-emerald-950/60 text-emerald-200"
                              : "border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-700"
                          }`}
                        >
                          {driver.nome}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {suggestions.drivers[0].reasons.slice(0, 2).join(" · ")}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-[10px] text-amber-300">
                    {suggestions.note ?? "Nessun autista consigliato."}
                  </p>
                )}
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
                {assignSaving ? (
                  <button
                    type="submit"
                    disabled
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white opacity-50"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" /> Assegnazione…
                  </button>
                ) : (
                  <HoldButton
                    variant="green"
                    holdDuration={1500}
                    holdingLabel="Continua a tenere premuto"
                    completeLabel="Viaggio assegnato"
                    onHoldComplete={() => saveAssign({ preventDefault: () => {} } as React.FormEvent)}
                    disabled={!assignDriverId}
                    className="min-h-10"
                  >
                    Tieni premuto per assegnare
                  </HoldButton>
                )}
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

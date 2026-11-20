import { db } from "./db";
import { listMaintenanceByVehicle, type VehicleMaintenanceRow } from "./maintenance";
import {
  MAINTENANCE_CATALOG,
  maintenanceInterval,
  vehicleMaintenanceGroup,
  type MaintenanceGroup,
} from "./maintenance-catalog";

export interface MaintenanceScheduleRow {
  vehicleId: string;
  targa: string;
  voce: string;
  label: string;
  group: string;
  intervalloKm: number | null;
  intervalloMesi: number | null;
  ultimo: { data: string | null; km: number | null } | null;
  prossimaData: string | null;
  prossimiKm: number | null;
  giorni: number | null;
  kmMancanti: number | null;
  stato: "SCADUTA" | "VICINA" | "OK" | "MAI" | "NESSUNA";
}

interface VehicleConfig {
  gruppo?: MaintenanceGroup;
  voci?: Record<string, { km?: number | null; mesi?: number | null; attiva?: boolean }>;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addMonths(iso: string, months: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000
  );
}

function lastService(
  rows: VehicleMaintenanceRow[],
  itemId: string
): VehicleMaintenanceRow | null {
  return (
    rows
      .filter((row) => {
        const code = (row.voce || row.tipo || "").toLowerCase();
        return code === itemId;
      })
      .filter((row) => row.status === "ESEGUITO")
      .sort((a, b) => {
        const aDate = a.dataEseguito ? new Date(a.dataEseguito).getTime() : 0;
        const bDate = b.dataEseguito ? new Date(b.dataEseguito).getTime() : 0;
        return bDate - aDate;
      })[0] ?? null
  );
}

export function computeVehicleSchedule(
  vehicle: { id: string; targa: string; categoria: string; maintenanceConfig?: unknown },
  rows: VehicleMaintenanceRow[],
  today = todayIso()
): MaintenanceScheduleRow[] {
  const config = (vehicle.maintenanceConfig && typeof vehicle.maintenanceConfig === "object"
    ? vehicle.maintenanceConfig
    : null) as VehicleConfig | null;
  const group =
    config?.gruppo === "leggero" || config?.gruppo === "pesante" || config?.gruppo === "rimorchio"
      ? config.gruppo
      : vehicleMaintenanceGroup(vehicle.categoria);
  const currentKm = rows
    .filter((row) => row.status === "ESEGUITO" && row.kmEseguito != null)
    .sort((a, b) => Number(b.kmEseguito) - Number(a.kmEseguito))[0]?.kmEseguito ?? null;

  return MAINTENANCE_CATALOG.flatMap((item) => {
    const interval = maintenanceInterval(item, group, config);
    if (!interval) return [];
    const [km, mesi] = interval;
    const last = lastService(rows, item.id);
    const out: MaintenanceScheduleRow = {
      vehicleId: vehicle.id,
      targa: vehicle.targa,
      voce: item.id,
      label: item.label,
      group: item.group,
      intervalloKm: km,
      intervalloMesi: mesi,
      ultimo: last
        ? {
            data: last.dataEseguito ? new Date(last.dataEseguito).toISOString().slice(0, 10) : null,
            km: last.kmEseguito ?? null,
          }
        : null,
      prossimaData: null,
      prossimiKm: null,
      giorni: null,
      kmMancanti: null,
      stato: "MAI",
    };
    if (!last) return [out];
    if (mesi && last.dataEseguito) {
      out.prossimaData = addMonths(
        new Date(last.dataEseguito).toISOString().slice(0, 10),
        mesi
      );
      out.giorni = daysBetween(today, out.prossimaData);
    }
    if (km && last.kmEseguito != null) {
      out.prossimiKm = Number(last.kmEseguito) + km;
      if (currentKm != null) out.kmMancanti = out.prossimiKm - Number(currentKm);
    }
    if (!out.prossimaData && out.prossimiKm == null) {
      out.stato = "MAI";
      return [out];
    }
    const thresholdKm = km ? Math.max(2000, Math.round(km * 0.1)) : 0;
    if ((out.giorni != null && out.giorni < 0) || (out.kmMancanti != null && out.kmMancanti <= 0)) {
      out.stato = "SCADUTA";
    } else if (
      (out.giorni != null && out.giorni <= 30) ||
      (out.kmMancanti != null && out.kmMancanti <= thresholdKm)
    ) {
      out.stato = "VICINA";
    } else {
      out.stato = "OK";
    }
    return [out];
  });
}

export async function getMaintenanceSchedule(
  companyId: string,
  vehicleId?: string
): Promise<MaintenanceScheduleRow[]> {
  const vehicles = await db.vehicle.findMany({
    where: { companyId, ...(vehicleId ? { id: vehicleId } : {}) },
    select: { id: true, targa: true, categoria: true, maintenanceConfig: true },
  });
  const rows = await listMaintenanceByVehicle(companyId, vehicleId);
  return vehicles.flatMap((vehicle) =>
    computeVehicleSchedule(vehicle, rows.filter((row) => row.vehicleId === vehicle.id))
  );
}

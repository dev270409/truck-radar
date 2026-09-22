import { db } from "./db";

export interface FleetVehicleRow {
  id: string;
  targa: string;
  categoria: string;
  status: string;
  tripId: string | null;
  luogoRitiro: string | null;
  luogoConsegna: string | null;
  tripStatus: string | null;
  driverNome: string | null;
  driverCognome: string | null;
  lat: number | null;
  lng: number | null;
  posizione: string | null;
  eventType: string | null;
  lastEventAt: Date | null;
}

/**
 * Flotta del tenant con, per ogni mezzo:
 * - viaggio attivo/più recente (dati origine/destinazione/autista)
 * - ultimo evento di tracking come posizione live (se disponibile)
 */
export async function getFleetMap(companyId: string): Promise<FleetVehicleRow[]> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT
       v.id, v.targa, v.categoria::text AS categoria, v.status::text AS status,
       t.id AS "tripId", t."luogoRitiro", t."luogoConsegna", t.status::text AS "tripStatus",
       u.nome AS "driverNome", u.cognome AS "driverCognome",
       te.lat, te.lng, te.posizione, te."eventType", te."createdAt" AS "lastEventAt"
     FROM "Vehicle" v
     LEFT JOIN LATERAL (
       SELECT t2.id, t2."luogoRitiro", t2."luogoConsegna", t2.status, t2."driverId"
       FROM "Trip" t2
       WHERE t2."vehicleId" = v.id
       ORDER BY CASE t2.status WHEN 'IN_CORSO' THEN 0 WHEN 'ASSEGNATO' THEN 1 ELSE 2 END,
                t2."updatedAt" DESC
       LIMIT 1
     ) t ON true
     LEFT JOIN "User" u ON u.id = t."driverId"
     LEFT JOIN LATERAL (
       SELECT te2.lat, te2.lng, te2.posizione, te2."eventType", te2."createdAt"
       FROM "TrackingEvent" te2
       WHERE te2."tripId" = t.id AND te2.lat IS NOT NULL AND te2.lng IS NOT NULL
       ORDER BY te2."createdAt" DESC
       LIMIT 1
     ) te ON true
     WHERE v."companyId" = $1
     ORDER BY v."createdAt" ASC`,
    companyId
  )) as FleetVehicleRow[];
  return rows.map((r) => ({
    ...r,
    lastEventAt: r.lastEventAt ? new Date(r.lastEventAt) : null,
  }));
}

export interface FleetTrackPoint {
  tripId: string;
  lat: number;
  lng: number;
  posizione: string | null;
  eventType: string | null;
  createdAt: Date;
}

/**
 * Storico del movimento di un veicolo: ultimi eventi di tracking ordinati
 * cronologicamente (replay del percorso). Ripiega sul viaggio più recente
 * se un tripId esplicito non viene fornito.
 */
export async function getVehicleTrack(
  companyId: string,
  vehicleId: string,
  tripId?: string
): Promise<{ vehicleId: string; tripId: string | null; points: FleetTrackPoint[] }> {
  const effectiveTrip = tripId
    ? tripId
    : (
        (await db.$queryRawUnsafe(
          `SELECT t.id FROM "Trip" t
           WHERE t."vehicleId" = $1 AND t."companyId" = $2
           ORDER BY CASE t.status WHEN 'IN_CORSO' THEN 0 WHEN 'ASSEGNATO' THEN 1 ELSE 2 END, t."updatedAt" DESC
           LIMIT 1`,
          vehicleId,
          companyId
        )) as Array<{ id: string }>
      )[0]?.id ?? null;

  if (!effectiveTrip) {
    return { vehicleId, tripId: null, points: [] };
  }

  const rows = (await db.$queryRawUnsafe(
    `SELECT te."tripId", te.lat, te.lng, te.posizione, te."eventType", te."createdAt"
     FROM "TrackingEvent" te
     JOIN "Trip" t ON t.id = te."tripId"
     WHERE te."tripId" = $1 AND t."companyId" = $2 AND te.lat IS NOT NULL AND te.lng IS NOT NULL
     ORDER BY te."createdAt" ASC
     LIMIT 500`,
    effectiveTrip,
    companyId
  )) as Array<Omit<FleetTrackPoint, "createdAt"> & { createdAt: Date }>;

  return {
    vehicleId,
    tripId: effectiveTrip,
    points: rows.map((p) => ({ ...p, createdAt: new Date(p.createdAt) })),
  };
}
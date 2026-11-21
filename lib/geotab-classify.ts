/**
 * Un tracciato Geotab è uno "spostamento" (micro-tragitto) se è molto corto
 * o molto breve. Non è un viaggio pagato e non deve entrare nei conteggi
 * dei viaggi veri né nei match con i rendiconti.
 */
export const GEOTAB_MOVEMENT_MAX_KM = 3;
export const GEOTAB_MOVEMENT_MAX_MINUTES = 8;

export interface GeotabTripLike {
  startAt: Date | string;
  stopAt: Date | string | null;
  distanceKm: number | null;
}

export function geotabDurationMinutes(trip: GeotabTripLike): number {
  const start = new Date(trip.startAt).getTime();
  const stop = trip.stopAt ? new Date(trip.stopAt).getTime() : 0;
  if (!Number.isFinite(start) || !Number.isFinite(stop) || stop <= start) return 0;
  return (stop - start) / 60_000;
}

export function isGeotabMovement(trip: GeotabTripLike): boolean {
  if (trip.distanceKm == null) return false;
  const km = Number(trip.distanceKm);
  if (km < GEOTAB_MOVEMENT_MAX_KM) return true;
  const minutes = geotabDurationMinutes(trip);
  return km < 10 && minutes > 0 && minutes < GEOTAB_MOVEMENT_MAX_MINUTES;
}

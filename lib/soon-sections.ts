/**
 * Registro delle sezioni marcate SOON nel prodotto.
 * Le funzioni restano presenti nel codice e nel routing: questa lista serve
 * solo a mostrare il badge "SOON" in dashboard/sidebar e a rimandare alla
 * pagina "In arrivo" con dati d'esempio, senza disattivare o cancellare nulla.
 */
export const SOON_HREFS = new Set<string>([
  "/dashboard/marketplace",
  "/dashboard/smart-return",
  "/dashboard/network",
  "/dashboard/parking",
  "/dashboard/geofence",
  "/dashboard/ispezioni",
  "/dashboard/esg",
  "/dashboard/reporti",
]);

export function isSoonSection(href: string): boolean {
  return SOON_HREFS.has(href);
}

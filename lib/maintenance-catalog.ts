export type MaintenanceGroup = "leggero" | "pesante" | "rimorchio";

export interface MaintenanceCatalogItem {
  id: string;
  label: string;
  group: string;
  intervals: Partial<Record<MaintenanceGroup, [number | null, number | null]>>;
}

export const MAINTENANCE_CATALOG: MaintenanceCatalogItem[] = [
  { id: "olio_motore", label: "Olio motore", group: "Motore", intervals: { leggero: [30000, 12], pesante: [100000, 12] } },
  { id: "filtro_olio", label: "Filtro olio", group: "Motore", intervals: { leggero: [30000, 12], pesante: [100000, 12] } },
  { id: "filtro_aria", label: "Filtro aria", group: "Motore", intervals: { leggero: [60000, 24], pesante: [100000, 24] } },
  { id: "filtro_gasolio", label: "Filtro gasolio", group: "Motore", intervals: { leggero: [60000, 24], pesante: [100000, 12] } },
  { id: "prefiltro_gasolio", label: "Prefiltro gasolio", group: "Motore", intervals: { pesante: [100000, 12] } },
  { id: "filtro_abitacolo", label: "Filtro abitacolo", group: "Motore", intervals: { leggero: [30000, 12], pesante: [100000, 12] } },
  { id: "filtro_adblue", label: "Filtro AdBlue", group: "Motore", intervals: { pesante: [200000, 24] } },
  { id: "essiccatore", label: "Cartuccia essiccatore freni", group: "Freni", intervals: { pesante: [null, 24] } },
  { id: "olio_cambio", label: "Olio cambio", group: "Trasmissione", intervals: { leggero: [120000, null], pesante: [450000, 36] } },
  { id: "olio_ponte", label: "Olio differenziale", group: "Trasmissione", intervals: { leggero: [120000, null], pesante: [450000, 36] } },
  { id: "liquido_raffreddamento", label: "Liquido raffreddamento", group: "Motore", intervals: { leggero: [150000, 60], pesante: [600000, 48] } },
  { id: "liquido_freni", label: "Liquido freni", group: "Freni", intervals: { leggero: [null, 24], pesante: [null, 24] } },
  { id: "cinghia_servizi", label: "Cinghia servizi", group: "Motore", intervals: { leggero: [120000, 72], pesante: [300000, 36] } },
  { id: "distribuzione", label: "Distribuzione", group: "Motore", intervals: { leggero: [150000, 72] } },
  { id: "freni", label: "Freni: pastiglie e dischi", group: "Freni", intervals: { leggero: [30000, 12], pesante: [100000, 12], rimorchio: [100000, 12] } },
  { id: "ingrassaggio", label: "Ingrassaggio", group: "Telaio", intervals: { pesante: [50000, 6], rimorchio: [50000, 6] } },
  { id: "mozzi", label: "Cuscinetti mozzi ruote", group: "Telaio", intervals: { rimorchio: [null, 12] } },
  { id: "controllo_generale", label: "Controllo generale", group: "Sicurezza", intervals: { leggero: [30000, 12], pesante: [100000, 12], rimorchio: [null, 12] } },
];

export const MAINTENANCE_CATALOG_MAP = new Map(
  MAINTENANCE_CATALOG.map((item) => [item.id, item])
);

export function maintenanceLabel(id: string | null | undefined): string {
  if (!id) return "Manutenzione";
  return MAINTENANCE_CATALOG_MAP.get(id)?.label ?? id;
}

export function vehicleMaintenanceGroup(category: string | null | undefined): MaintenanceGroup {
  if (category === "RIMORCHIO" || category === "SEMIRIMORCHIO") return "rimorchio";
  if (category === "FURGONE") return "leggero";
  return "pesante";
}

export function maintenanceInterval(
  item: MaintenanceCatalogItem,
  group: MaintenanceGroup,
  config?: { voci?: Record<string, { km?: number | null; mesi?: number | null; attiva?: boolean }> } | null
): [number | null, number | null] | null {
  const override = config?.voci?.[item.id];
  if (override?.attiva === false) return null;
  if (override && (override.km != null || override.mesi != null)) {
    return [override.km ?? null, override.mesi ?? null];
  }
  return item.intervals[group] ?? null;
}

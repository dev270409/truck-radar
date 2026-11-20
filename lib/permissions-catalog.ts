export const PERMISSION_DEFINITIONS = [
  { key: "vehicles", label: "Mezzi", group: "Operatività" },
  { key: "drivers", label: "Autisti e team", group: "Operatività" },
  { key: "trips", label: "Viaggi", group: "Operatività" },
  { key: "load_plans", label: "Piano di carico", group: "Operatività" },
  { key: "documents", label: "Documenti in arrivo", group: "Operatività" },
  { key: "deadlines", label: "Scadenze e divieti", group: "Operatività" },
  { key: "quotes", label: "Preventivi", group: "Commerciale" },
  { key: "orders", label: "Ordini e portale", group: "Commerciale" },
  { key: "clients", label: "Clienti e fornitori", group: "Commerciale" },
  { key: "agevolazioni", label: "Agevolazioni", group: "Commerciale" },
  { key: "fuel", label: "Carburante e cisterne", group: "Flotta" },
  { key: "maintenance", label: "Manutenzione", group: "Flotta" },
  { key: "vehicle_costs", label: "Costi mezzi e TCO", group: "Flotta" },
  { key: "routes", label: "Giri e percorsi", group: "Flotta" },
  { key: "analytics", label: "Analisi e report", group: "Flotta" },
  { key: "inspections", label: "Ispezioni", group: "Flotta" },
  { key: "geofence", label: "Geofence", group: "Flotta" },
  { key: "parking", label: "Aree di sosta", group: "Flotta" },
  { key: "marketplace", label: "Borsa carichi", group: "Network" },
  { key: "network", label: "Network e recensioni", group: "Network" },
  { key: "economia", label: "Economia", group: "Amministrazione" },
  { key: "integrations", label: "Integrazioni", group: "Amministrazione" },
  { key: "import_export", label: "Import / Export", group: "Amministrazione" },
  { key: "settings", label: "Impostazioni", group: "Amministrazione" },
  { key: "users", label: "Gestione utenti", group: "Amministrazione" },
  { key: "billing", label: "Abbonamento", group: "Amministrazione" },
  { key: "licensing", label: "Licenza", group: "Amministrazione" },
] as const;

export type PermissionKey = (typeof PERMISSION_DEFINITIONS)[number]["key"];
export type PermissionMap = Record<PermissionKey, boolean>;

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_DEFINITIONS.map((item) => item.key);

export const PERMISSION_GROUPS = Array.from(
  PERMISSION_DEFINITIONS.reduce((groups, item) => {
    const list = groups.get(item.group) ?? [];
    list.push(item);
    groups.set(item.group, list);
    return groups;
  }, new Map<string, Array<(typeof PERMISSION_DEFINITIONS)[number]>>())
).map(([group, items]) => ({ group, items }));

function mapWith(value: boolean): PermissionMap {
  return Object.fromEntries(ALL_PERMISSION_KEYS.map((key) => [key, value])) as PermissionMap;
}

const ADMIN_PERMISSIONS = mapWith(true);

const UFFICIO_PERMISSIONS: PermissionMap = {
  ...mapWith(false),
  vehicles: true,
  drivers: true,
  trips: true,
  load_plans: true,
  documents: true,
  deadlines: true,
  quotes: true,
  orders: true,
  clients: true,
  agevolazioni: true,
  fuel: true,
  maintenance: true,
  vehicle_costs: true,
  routes: true,
  analytics: true,
  inspections: true,
  geofence: true,
  parking: true,
  marketplace: true,
  network: true,
  import_export: true,
};

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionMap> = {
  ADMIN: ADMIN_PERMISSIONS,
  UFFICIO: UFFICIO_PERMISSIONS,
  AUTISTA: mapWith(false),
  COMMITTENTE: mapWith(false),
};

export function resolvePermissions(
  role: string | null | undefined,
  stored: unknown
): PermissionMap {
  if (role === "ADMIN") return { ...ADMIN_PERMISSIONS };
  const base = { ...(DEFAULT_ROLE_PERMISSIONS[role ?? ""] ?? mapWith(false)) };
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return base;
  for (const key of ALL_PERMISSION_KEYS) {
    const value = (stored as Record<string, unknown>)[key];
    if (typeof value === "boolean") base[key] = value;
  }
  return base;
}

export function isPermissionKey(value: string): value is PermissionKey {
  return ALL_PERMISSION_KEYS.includes(value as PermissionKey);
}

const PATH_PERMISSIONS: Array<[string, PermissionKey]> = [
  ["/dashboard/vehicles", "vehicles"],
  ["/dashboard/flotta", "trips"],
  ["/dashboard/users", "users"],
  ["/dashboard/trips", "trips"],
  ["/dashboard/carico", "load_plans"],
  ["/dashboard/preventivi", "quotes"],
  ["/dashboard/ordini", "orders"],
  ["/dashboard/anagrafica", "clients"],
  ["/dashboard/analisi-clienti", "analytics"],
  ["/dashboard/carburante", "fuel"],
  ["/dashboard/cisterne", "fuel"],
  ["/dashboard/manutenzione", "maintenance"],
  ["/dashboard/costi-mezzi", "vehicle_costs"],
  ["/dashboard/scadenze", "deadlines"],
  ["/dashboard/benchmark", "analytics"],
  ["/dashboard/agevolazioni", "agevolazioni"],
  ["/dashboard/integrazioni", "integrations"],
  ["/dashboard/import-export", "import_export"],
  ["/dashboard/licenza", "licensing"],
  ["/dashboard/abbonamenti", "billing"],
  ["/dashboard/impostazioni", "settings"],
  ["/dashboard/documenti", "documents"],
  ["/dashboard/economia", "economia"],
  ["/dashboard/marketplace", "marketplace"],
  ["/dashboard/network", "network"],
  ["/dashboard/reviews", "network"],
  ["/dashboard/giri", "routes"],
  ["/dashboard/ispezioni", "inspections"],
  ["/dashboard/geofence", "geofence"],
  ["/dashboard/parking", "parking"],
  ["/dashboard/smart-return", "trips"],
  ["/dashboard/reporti", "analytics"],
];

export function permissionForPath(pathname: string): PermissionKey | null {
  const normalized = pathname.split("?")[0].replace(/\/+$/, "") || "/dashboard";
  const match = PATH_PERMISSIONS.find(
    ([prefix]) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
  return match ? match[1] : null;
}

/** Minimal server-side MyGeotab JSON-RPC client. Credentials never go in URLs/logs. */
import { hashIdentityForMatch } from "@/lib/crypto";

export interface GeotabCredentials {
  database: string;
  username: string;
  password: string;
}

interface GeotabSession {
  database: string;
  userName: string;
  sessionId: string;
}

export interface GeotabSessionBundle {
  host: string;
  credentials: GeotabSession;
}

class GeotabSessionExpiredError extends Error {
  constructor() {
    super("GEOTAB_SESSION_EXPIRED");
  }
}

interface JsonRpcResponse<T> {
  result?: T;
  error?: { message?: string; data?: { type?: string } };
}

function normalizeHost(host: string): string {
  const value = host.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
  if (!/^[a-z0-9.-]+$/i.test(value) || !/(^|\.)geotab\.com$/i.test(value)) {
    throw new Error("Server MyGeotab non valido.");
  }
  return `https://${value}`;
}

async function rpc<T>(host: string, method: string, params: Record<string, unknown>, timeoutMs = 15_000): Promise<T> {
  const endpoint = `${normalizeHost(host)}/apiv1`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ method, params }),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`MyGeotab non disponibile (HTTP ${response.status}).`);
  }
  const payload = (await response.json()) as JsonRpcResponse<T>;
  if (payload.error) {
    const type = payload.error.data?.type ?? "";
    const message = payload.error.message ?? "";
    if (method !== "Authenticate" && (/InvalidUserException/i.test(type) || /invalid session/i.test(message))) {
      throw new GeotabSessionExpiredError();
    }
    if (/InvalidUser|Authentication|Credentials/i.test(type)) {
      throw new Error("MyGeotab non ha accettato le credenziali. Verifica che l'utente API sia attivo sul database e abbia una password impostata; usa il suo username e la sua password, non quelli di un altro utente.");
    }
    throw new Error("MyGeotab ha rifiutato la richiesta. Verifica i permessi dell'utente API e riprova.");
  }
  return payload.result as T;
}

/** Authenticate once, then reuse the returned session for API calls. */
export async function authenticateGeotab(
  credentials: GeotabCredentials,
  initialHost = "my.geotab.com"
): Promise<GeotabSessionBundle> {
  const database = credentials.database.trim();
  const username = credentials.username.trim();
  const password = credentials.password;
  if (!database || !username || !password) {
    throw new Error("Inserisci database, username e password MyGeotab.");
  }

  const result = await rpc<{ path: string; credentials: GeotabSession }>(initialHost, "Authenticate", {
    database,
    userName: username,
    password,
  });

  if (!result?.credentials?.sessionId || !result.credentials.database || !result.credentials.userName) {
    throw new Error("MyGeotab ha risposto senza una sessione valida.");
  }

  const host = !result.path || result.path === "ThisServer" ? initialHost : result.path;
  // normalizeHost validates federation redirects as well, preventing SSRF.
  normalizeHost(host);
  return { host, credentials: result.credentials };
}

export async function getGeotabDevices(
  host: string,
  session: GeotabSession,
  resultsLimit = 500
): Promise<Array<{ id: string; name?: string; licensePlate?: string; vehicleIdentificationNumber?: string }>> {
  const limit = Math.max(1, Math.min(Math.trunc(resultsLimit), 500));
  return rpc(host, "Get", {
    typeName: "Device",
    resultsLimit: limit,
    credentials: session,
  });
}

/** One bounded, read-only probe used by the integration test button. */
export async function testGeotab(credentials: GeotabCredentials, host = "my.geotab.com") {
  const authenticated = await authenticateGeotab(credentials, host);
  const devices = await getGeotabDevices(authenticated.host, authenticated.credentials, 1);
  return {
    host: authenticated.host,
    deviceVisible: devices.length > 0,
    session: authenticated,
  };
}

/** Read-only fleet inventory check; does not create or mutate Truck Radar vehicles. */
export async function readGeotabInventory(
  credentials: GeotabCredentials,
  host = "my.geotab.com",
  cachedSession?: GeotabSessionBundle
) {
  let authenticated = cachedSession ?? await authenticateGeotab(credentials, host);
  try {
    return await readInventoryWithSession(authenticated);
  } catch (error) {
    if (!(error instanceof GeotabSessionExpiredError) || !cachedSession) throw error;
    authenticated = await authenticateGeotab(credentials, host);
    return readInventoryWithSession(authenticated);
  }
}

export interface GeotabTripHistoryRow {
  geotabTripId: string;
  geotabDeviceId: string | null;
  geotabDriverId: string | null;
  deviceName: string | null;
  licensePlate: string | null;
  driverName: string | null;
  startAt: string;
  stopAt: string | null;
  distanceKm: number | null;
  odometerMeters: number | null;
  drivingSeconds: string | null;
  idlingSeconds: string | null;
}

export async function readGeotabTripHistory(
  credentials: GeotabCredentials,
  devices: Array<Record<string, any>>,
  drivers: Array<Record<string, any>>,
  fromDate: Date,
  toDate: Date,
  host = "my.geotab.com",
  cachedSession?: GeotabSessionBundle
): Promise<{ trips: GeotabTripHistoryRow[]; session: GeotabSessionBundle; truncated: boolean }> {
  let authenticated = cachedSession ?? await authenticateGeotab(credentials, host);
  const search = {
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString(),
    includeOverlappedTrips: true,
  };
  const limit = 5000;
  let rawTrips: Array<Record<string, any>>;
  try {
    rawTrips = await rpc(authenticated.host, "Get", {
      typeName: "Trip",
      search,
      resultsLimit: limit,
      credentials: authenticated.credentials,
    }, 40_000);
  } catch (error) {
    if (!(error instanceof GeotabSessionExpiredError) || !cachedSession) throw error;
    authenticated = await authenticateGeotab(credentials, host);
    rawTrips = await rpc(authenticated.host, "Get", {
      typeName: "Trip",
      search,
      resultsLimit: limit,
      credentials: authenticated.credentials,
    }, 40_000);
  }

  const deviceById = new Map<string, Record<string, any>>();
  for (const device of devices) {
    for (const id of Array.isArray(device.geotabDeviceIds) ? device.geotabDeviceIds : [device.geotabId]) {
      if (typeof id === "string") deviceById.set(id, device);
    }
  }
  const driverById = new Map(drivers.filter((d) => typeof d.geotabId === "string").map((d) => [d.geotabId, d]));
  const trips = rawTrips.flatMap((trip): GeotabTripHistoryRow[] => {
    if (typeof trip.id !== "string") return [];
    const deviceId = typeof trip.device === "string" ? trip.device : trip.device?.id;
    const driverId = typeof trip.driver === "string" ? trip.driver : trip.driver?.id;
    const device = typeof deviceId === "string" ? deviceById.get(deviceId) : undefined;
    const driver = typeof driverId === "string" ? driverById.get(driverId) : undefined;
    const start = typeof trip.start === "string" ? new Date(trip.start) : null;
    if (!start || !Number.isFinite(start.getTime())) return [];
    const stop = typeof trip.stop === "string" ? new Date(trip.stop) : null;
    const distance = typeof trip.distance === "number" && Number.isFinite(trip.distance) && trip.distance >= 0 ? trip.distance : null;
    const odometer = typeof trip.odometer === "number" && Number.isFinite(trip.odometer) && trip.odometer >= 0 ? trip.odometer : null;
    return [{
      geotabTripId: trip.id,
      geotabDeviceId: typeof deviceId === "string" ? deviceId : null,
      geotabDriverId: typeof driverId === "string" ? driverId : null,
      deviceName: typeof device?.name === "string" ? device.name.slice(0, 255) : null,
      licensePlate: typeof device?.licensePlate === "string" ? device.licensePlate.slice(0, 40) : null,
      driverName: driver ? `${driver.firstName ?? ""} ${driver.lastName ?? ""}`.trim().slice(0, 255) : null,
      startAt: start.toISOString(),
      stopAt: stop && Number.isFinite(stop.getTime()) ? stop.toISOString() : null,
      distanceKm: distance,
      odometerMeters: odometer,
      drivingSeconds: trip.drivingDuration == null ? null : String(trip.drivingDuration),
      idlingSeconds: trip.idlingDuration == null ? null : String(trip.idlingDuration),
    }];
  });
  return { trips, session: authenticated, truncated: rawTrips.length >= limit };
}

async function readInventoryWithSession(authenticated: GeotabSessionBundle) {
  const devices = await getGeotabDevices(authenticated.host, authenticated.credentials, 500);
  let statuses: Array<Record<string, any>> = [];
  let users: Array<Record<string, any>> = [];

  // GPS status and driver records are optional: some MyGeotab service users
  // have Device read access but limited access to these entity types.
  try {
    statuses = await rpc(authenticated.host, "Get", {
      typeName: "DeviceStatusInfo",
      resultsLimit: 500,
      credentials: authenticated.credentials,
    });
  } catch (error) {
    if (error instanceof GeotabSessionExpiredError) throw error;
    statuses = [];
  }
  try {
    users = await rpc(authenticated.host, "Get", {
      typeName: "User",
      resultsLimit: 500,
      propertySelector: { fields: ["id", "name", "firstName", "lastName", "isDriver"], isIncluded: true },
      credentials: authenticated.credentials,
    });
  } catch (error) {
    if (error instanceof GeotabSessionExpiredError) throw error;
    users = [];
  }

  const driverCandidates = users
    .filter((user) => user.isDriver === true)
    .map((user) => ({
      geotabId: String(user.id ?? ""),
      geotabIds: [String(user.id ?? "")],
      firstName: typeof user.firstName === "string" ? user.firstName.slice(0, 255) : "",
      lastName: typeof user.lastName === "string" ? user.lastName.slice(0, 255) : "",
      identityHash: typeof user.name === "string" && user.name.includes("@") ? hashIdentityForMatch(user.name) : null,
    }))
    .filter((user) => user.geotabId);
  const driversByIdentity = new Map<string, (typeof driverCandidates)[number]>();
  for (const driver of driverCandidates) {
    const key = driver.identityHash ?? `id:${driver.geotabId}`;
    const existing = driversByIdentity.get(key);
    if (existing) {
      existing.geotabIds.push(driver.geotabId);
      existing.firstName ||= driver.firstName;
      existing.lastName ||= driver.lastName;
    } else {
      driversByIdentity.set(key, driver);
    }
  }
  const drivers = Array.from(driversByIdentity.values());
  const driverById = new Map(drivers.flatMap((driver) => driver.geotabIds.map((id) => [id, driver] as const)));
  const statusByDeviceId = new Map<string, Record<string, any>>();
  for (const status of statuses) {
    const deviceId = typeof status.device === "string" ? status.device : status.device?.id;
    if (typeof deviceId === "string") statusByDeviceId.set(deviceId, status);
  }

  const deviceRecords = devices.map((device) => {
      const status = statusByDeviceId.get(device.id);
      const driverRef = status?.driver;
      const driverId = typeof driverRef === "string" ? driverRef : driverRef?.id;
      const driver = typeof driverId === "string" ? driverById.get(driverId) : undefined;
      return {
        geotabId: device.id,
        geotabDeviceIds: [device.id],
        duplicateDeviceCount: 1,
        name: device.name ?? null,
        licensePlate: device.licensePlate ?? null,
        vehicleIdentificationNumber: device.vehicleIdentificationNumber ?? null,
        latitude: finiteCoordinate(status?.latitude, -90, 90),
        longitude: finiteCoordinate(status?.longitude, -180, 180),
        speedKph: finiteCoordinate(status?.speed, 0, 500),
        bearing: finiteCoordinate(status?.bearing, 0, 360),
        isDriving: status?.isDriving === true,
        isDeviceCommunicating: status?.isDeviceCommunicating === true,
        positionAt: typeof status?.dateTime === "string" ? status.dateTime : null,
        driverId: typeof driverId === "string" ? driverId : null,
        driverName: driver ? `${driver.firstName} ${driver.lastName}`.trim() : null,
      };
    });

  // If Geotab contains duplicate physical device records for a registration,
  // collapse them to one fleet item and retain the IDs for history joins.
  const byVehicle = new Map<string, (typeof deviceRecords)[number]>();
  for (const device of deviceRecords) {
    const plateKey = normalizePlate(device.licensePlate ?? "");
    const key = plateKey ? `plate:${plateKey}` : `device:${device.geotabId}`;
    const existing = byVehicle.get(key);
    if (!existing) {
      byVehicle.set(key, device);
      continue;
    }
    const existingTime = existing.positionAt ? Date.parse(existing.positionAt) : 0;
    const incomingTime = device.positionAt ? Date.parse(device.positionAt) : 0;
    const latest = incomingTime >= existingTime ? device : existing;
    byVehicle.set(key, {
      ...latest,
      geotabId: existing.geotabId,
      geotabDeviceIds: Array.from(new Set([...existing.geotabDeviceIds, ...device.geotabDeviceIds])),
      duplicateDeviceCount: existing.duplicateDeviceCount + device.duplicateDeviceCount,
      licensePlate: existing.licensePlate || device.licensePlate,
      vehicleIdentificationNumber: existing.vehicleIdentificationNumber || device.vehicleIdentificationNumber,
    });
  }
  const collapsedDevices = Array.from(byVehicle.values());

  return {
    count: collapsedDevices.length,
    deviceRecords: devices.length,
    devices: collapsedDevices,
    drivers,
    positionsAvailable: statuses.length > 0,
    session: authenticated,
  };
}

function finiteCoordinate(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

export function normalizePlate(value: string): string {
  return value.toLocaleUpperCase("it-IT").replace(/[^A-Z0-9]/g, "");
}

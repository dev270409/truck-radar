/** Minimal server-side MyGeotab JSON-RPC client. Credentials never go in URLs/logs. */
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

async function rpc<T>(host: string, method: string, params: Record<string, unknown>): Promise<T> {
  const endpoint = `${normalizeHost(host)}/apiv1`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ method, params }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`MyGeotab non disponibile (HTTP ${response.status}).`);
  }
  const payload = (await response.json()) as JsonRpcResponse<T>;
  if (payload.error) {
    const type = payload.error.data?.type ?? "";
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
): Promise<{ host: string; session: GeotabSession }> {
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
  return { host, session: result.credentials };
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
  const devices = await getGeotabDevices(authenticated.host, authenticated.session, 1);
  return { host: authenticated.host, deviceVisible: devices.length > 0 };
}

/** Read-only fleet inventory check; does not create or mutate Truck Radar vehicles. */
export async function readGeotabInventory(credentials: GeotabCredentials, host = "my.geotab.com") {
  const authenticated = await authenticateGeotab(credentials, host);
  const devices = await getGeotabDevices(authenticated.host, authenticated.session, 500);
  let statuses: Array<Record<string, any>> = [];
  let users: Array<Record<string, any>> = [];

  // GPS status and driver records are optional: some MyGeotab service users
  // have Device read access but limited access to these entity types.
  try {
    statuses = await rpc(authenticated.host, "Get", {
      typeName: "DeviceStatusInfo",
      resultsLimit: 500,
      credentials: authenticated.session,
    });
  } catch {
    statuses = [];
  }
  try {
    users = await rpc(authenticated.host, "Get", {
      typeName: "User",
      resultsLimit: 500,
      propertySelector: { fields: ["id", "firstName", "lastName", "isDriver"], isIncluded: true },
      credentials: authenticated.session,
    });
  } catch {
    users = [];
  }

  const drivers = users
    .filter((user) => user.isDriver === true)
    .map((user) => ({
      geotabId: String(user.id ?? ""),
      firstName: typeof user.firstName === "string" ? user.firstName.slice(0, 255) : "",
      lastName: typeof user.lastName === "string" ? user.lastName.slice(0, 255) : "",
    }))
    .filter((user) => user.geotabId);
  const driverById = new Map(drivers.map((driver) => [driver.geotabId, driver]));
  const statusByDeviceId = new Map<string, Record<string, any>>();
  for (const status of statuses) {
    const deviceId = typeof status.device === "string" ? status.device : status.device?.id;
    if (typeof deviceId === "string") statusByDeviceId.set(deviceId, status);
  }

  return {
    count: devices.length,
    devices: devices.map((device) => {
      const status = statusByDeviceId.get(device.id);
      const driverRef = status?.driver;
      const driverId = typeof driverRef === "string" ? driverRef : driverRef?.id;
      const driver = typeof driverId === "string" ? driverById.get(driverId) : undefined;
      return {
        geotabId: device.id,
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
    }),
    drivers,
    positionsAvailable: statuses.length > 0,
  };
}

function finiteCoordinate(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

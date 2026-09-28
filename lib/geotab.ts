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
      throw new Error("MyGeotab non ha accettato le credenziali. Controlla database, username e password.");
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
  return {
    count: devices.length,
    devices: devices.map((device) => ({
      geotabId: device.id,
      name: device.name ?? null,
      licensePlate: device.licensePlate ?? null,
      vehicleIdentificationNumber: device.vehicleIdentificationNumber ?? null,
    })),
  };
}

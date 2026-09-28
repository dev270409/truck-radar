import { authenticateGeotab, getGeotabDevices, readGeotabTripHistory, testGeotab } from "../lib/geotab";
import { readGeotabInventory } from "../lib/geotab";

function assert(ok: boolean, message: string) {
  if (!ok) throw new Error(`ASSERT FAILED: ${message}`);
  console.log(`PASS ${message}`);
}

async function main() {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; method: string; body: any }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body ?? "{}"));
    requests.push({ url, method: body.method, body });
    if (body.method === "Authenticate") {
      return new Response(JSON.stringify({
        result: {
          path: "ThisServer",
          credentials: { database: "fleet_db", userName: "api@example.test", sessionId: "mock-session" },
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (body.method === "Get" && body.params.typeName === "Device") {
      return new Response(JSON.stringify({
        result: [{ id: "device-1", name: "Truck 01", licensePlate: "AB123CD" }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (body.method === "Get" && body.params.typeName === "DeviceStatusInfo") {
      return new Response(JSON.stringify({ result: [{
        device: { id: "device-1" }, latitude: 45.46, longitude: 9.19,
        speed: 72, bearing: 180, isDriving: true, isDeviceCommunicating: true,
        dateTime: "2026-09-28T12:00:00.000Z", driver: { id: "driver-1" },
      }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (body.method === "Get" && body.params.typeName === "User") {
      return new Response(JSON.stringify({ result: [{
        id: "driver-1", firstName: "Mario", lastName: "Rossi", isDriver: true,
      }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (body.method === "Get" && body.params.typeName === "Trip") {
      return new Response(JSON.stringify({ result: [{
        id: "trip-1", device: { id: "device-1" }, driver: { id: "driver-1" },
        start: "2026-09-28T08:00:00.000Z", stop: "2026-09-28T10:00:00.000Z",
        distance: 123.4, odometer: 456000, drivingDuration: "PT2H", idlingDuration: "PT5M",
      }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("{}", { status: 400 });
  }) as typeof fetch;

  try {
    const credentials = { database: "fleet_db", username: "api@example.test", password: "not-logged" };
    const connected = await testGeotab(credentials);
    assert(connected.deviceVisible, "autenticazione e probe Device positivi");
    assert(requests.length === 2, "autentica una volta e riusa sessione (2 POST)");
    assert(requests.every((r) => r.url === "https://my.geotab.com/apiv1"), "usa endpoint HTTPS /apiv1");
    assert(requests[0].method === "Authenticate", "prima chiamata Authenticate");
    assert(requests[1].body.params.credentials.sessionId === "mock-session", "seconda chiamata usa sessionId");
    assert(!requests.some((r) => r.url.includes("not-logged")), "password mai inserita nell'URL");

    const devices = await getGeotabDevices("my.geotab.com", {
      database: "fleet_db",
      userName: "api@example.test",
      sessionId: "mock-session",
    }, 9999);
    assert(devices.length === 1 && devices[0].licensePlate === "AB123CD", "lettura dispositivi e limite massimo applicato");

    const inventory = await readGeotabInventory(credentials);
    assert(inventory.count === 1 && inventory.positionsAvailable, "snapshot include il DeviceStatusInfo corrente");
    assert(inventory.devices[0].latitude === 45.46 && inventory.devices[0].driverName === "Mario Rossi", "posizione e driver sono associati al mezzo corretto");
    assert(inventory.drivers[0].firstName === "Mario", "driver snapshot contiene solo campi necessari");
    const history = await readGeotabTripHistory(
      credentials,
      inventory.devices,
      inventory.drivers,
      new Date("2026-09-01T00:00:00Z"),
      new Date("2026-09-30T23:59:59Z"),
      "my.geotab.com",
      inventory.session
    );
    assert(history.trips.length === 1 && history.trips[0].distanceKm === 123.4, "storico Trip.distance Geotab letto in km");
    assert(history.trips[0].licensePlate === "AB123CD" && history.trips[0].driverName === "Mario Rossi", "trip Geotab associato a mezzo e driver");

    let rejectedHost = false;
    try {
      await authenticateGeotab(credentials, "169.254.169.254");
    } catch {
      rejectedHost = true;
    }
    assert(rejectedHost, "host non Geotab rifiutato (SSRF guard)");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

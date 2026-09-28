import { authenticateGeotab, getGeotabDevices, testGeotab } from "../lib/geotab";

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
    if (body.method === "Get") {
      return new Response(JSON.stringify({
        result: [{ id: "device-1", name: "Truck 01", licensePlate: "AB123CD" }],
      }), { status: 200, headers: { "content-type": "application/json" } });
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

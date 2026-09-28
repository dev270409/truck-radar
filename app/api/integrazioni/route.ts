import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  listExternalIntegrations,
  listApiConnections,
  getExternalIntegration,
  createApiConnection,
} from "@/lib/raw-tables";
import { encryptSecret, hasSecret, hashIdentityForMatch } from "@/lib/crypto";
import { normalizePlate } from "@/lib/geotab";

const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    return { error: NextResponse.json({ error: "Non autorizzato" }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Accesso riservato all'amministratore." }, { status: 403 }) };
  }
  return { session };
};

function mask(conn: { credentialsCipher: string | null; config: unknown }) {
  const hasCreds = hasSecret(conn.credentialsCipher);
  const config = (conn.config as Record<string, unknown> | null) ?? {};
  const credsKeys = Array.isArray(config.creds) ? config.creds.length : 0;
  return { hasCreds, credsKeys };
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const [catalogo, connessioni, localUsers, localVehicles] = await Promise.all([
    listExternalIntegrations(),
    listApiConnections(guard.session!.user.companyId),
    db.user.findMany({
      where: { companyId: guard.session!.user.companyId },
      select: { id: true, email: true },
    }),
    db.vehicle.findMany({
      where: { companyId: guard.session!.user.companyId },
      select: { id: true, targa: true },
    }),
  ]);
  const localUserIdsByIdentity = new Map(
    localUsers.map((user) => [hashIdentityForMatch(user.email), user.id])
  );

  const masked = connessioni.map((c) => {
    const provider = catalogo.find((i) => i.id === c.integrationId)?.provider ?? "GENERICO";
    const config = (c.config as Record<string, unknown> | null) ?? {};
    const snapshotRaw = provider === "GEOTAB" && config.geotabSnapshot && typeof config.geotabSnapshot === "object"
      ? config.geotabSnapshot as Record<string, unknown>
      : null;
    let snapshot = snapshotRaw;
    if (snapshotRaw && Array.isArray(snapshotRaw.drivers)) {
      snapshot = {
        ...snapshotRaw,
        // Rimuove l'HMAC interno e restituisce solo un riferimento al local user
        // corrispondente, se username Geotab ed email locale coincidono.
        drivers: snapshotRaw.drivers.map((rawDriver) => {
          const driver = rawDriver && typeof rawDriver === "object" ? rawDriver as Record<string, unknown> : {};
          const identityHash = typeof driver.identityHash === "string" ? driver.identityHash : null;
          const { identityHash: _privateHash, ...safeDriver } = driver;
          return {
            ...safeDriver,
            linkedLocalUserId: identityHash ? localUserIdsByIdentity.get(identityHash) ?? null : null,
          };
        }),
      };
    }
    if (snapshot && Array.isArray(snapshot.devices)) {
      const devices = snapshot.devices.map((rawDevice) => {
        const device = rawDevice && typeof rawDevice === "object" ? rawDevice as Record<string, unknown> : {};
        const plate = typeof device.licensePlate === "string" ? normalizePlate(device.licensePlate) : "";
        const localVehicle = plate ? localVehicles.find((vehicle) => normalizePlate(vehicle.targa) === plate) : undefined;
        return { ...device, linkedLocalVehicleId: localVehicle?.id ?? null };
      });
      snapshot = { ...snapshot, devices };
    }
    return {
      id: c.id,
      name: c.name,
      integrationId: c.integrationId,
      provider,
      baseUrl: c.baseUrl,
      status: c.status,
      lastTestedAt: c.lastTestedAt,
      lastSyncAt: c.lastSyncAt,
      createdAt: c.createdAt,
      ...mask(c),
      ...(snapshot ? { geotabSnapshot: snapshot } : {}),
    };
  });

  return NextResponse.json({ catalogo, connessioni: masked });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const session = guard.session!;

  let body: { integrationId?: unknown; name?: unknown; baseUrl?: unknown; credentials?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const integrationId = String(body.integrationId ?? "");
  const name = String(body.name ?? "").trim();
  const baseUrl = body.baseUrl ? String(body.baseUrl).trim() : null;
  const credentialsInput = body.credentials ?? {};
  if (!credentialsInput || typeof credentialsInput !== "object" || Array.isArray(credentialsInput)) {
    return NextResponse.json({ error: "Formato credenziali non valido." }, { status: 400 });
  }
  const entries = Object.entries(credentialsInput as Record<string, unknown>);
  if (entries.length > 12 || entries.some(([key, value]) => key.length > 80 || typeof value !== "string" || value.length > 4096)) {
    return NextResponse.json({ error: "Credenziali non valide o troppo grandi." }, { status: 400 });
  }
  const creds = Object.fromEntries(entries) as Record<string, string>;

  if (!integrationId || !name) {
    return NextResponse.json(
      { error: "Provider e nome obbligatori." },
      { status: 400 }
    );
  }
  const integration = await getExternalIntegration(integrationId);
  if (!integration) {
    return NextResponse.json({ error: "Provider non trovato." }, { status: 404 });
  }

  if (integration.provider === "GEOTAB") {
    const database = typeof creds.database === "string" ? creds.database.trim() : "";
    const username = typeof creds.username === "string" ? creds.username.trim() : "";
    const password = typeof creds.password === "string" ? creds.password : "";
    if (!database || !username || !password) {
      return NextResponse.json({ error: "Per Geotab servono database, username e password dell'utente API." }, { status: 400 });
    }
    if (database.length > 120 || username.length > 200 || password.length > 500) {
      return NextResponse.json({ error: "Uno o più campi Geotab superano la lunghezza consentita." }, { status: 400 });
    }
  } else if (baseUrl) {
    try {
      const parsed = new URL(baseUrl);
      if (parsed.protocol !== "https:" || !parsed.hostname) throw new Error("invalid");
    } catch {
      return NextResponse.json({ error: "Base URL non valida (serve un URL HTTPS valido)." }, { status: 400 });
    }
  }

  const credsJson = JSON.stringify({ creds });
  const credentialsCipher = encryptSecret(credsJson);

  try {
    const connection = await createApiConnection({
      companyId: session.user.companyId,
      integrationId,
      name,
      baseUrl,
      credentialsCipher,
      config: { creds: Object.keys(creds) },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: session.user.companyId,
        action: "INTEGRATION_CONNECTED",
        entity: "ApiConnection",
        entityId: connection.id,
        payload: { provider: integration.provider, name },
      },
    });

    // Non restituire mai credentialsCipher al browser, nemmeno cifrato.
    return NextResponse.json({
      connection: {
        id: connection.id,
        name: connection.name,
        integrationId: connection.integrationId,
        baseUrl: connection.baseUrl,
        status: connection.status,
        createdAt: connection.createdAt,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

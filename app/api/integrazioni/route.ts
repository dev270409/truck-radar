import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  listExternalIntegrations,
  listApiConnections,
  getExternalIntegration,
  createApiConnection,
} from "@/lib/raw-tables";
import { encryptSecret, hasSecret } from "@/lib/crypto";

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

  const [catalogo, connessioni] = await Promise.all([
    listExternalIntegrations(),
    listApiConnections(guard.session!.user.companyId),
  ]);

  const masked = connessioni.map((c) => ({
    id: c.id,
    name: c.name,
    integrationId: c.integrationId,
    baseUrl: c.baseUrl,
    status: c.status,
    lastTestedAt: c.lastTestedAt,
    lastSyncAt: c.lastSyncAt,
    createdAt: c.createdAt,
    ...mask(c),
  }));

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
  const creds = (body.credentials ?? {}) as Record<string, unknown>;

  if (!integrationId || !name) {
    return NextResponse.json(
      { error: "Provider e nome obbligatori." },
      { status: 400 }
    );
  }
  if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
    return NextResponse.json({ error: "Base URL non valida (serve http/https)." }, { status: 400 });
  }

  const integration = await getExternalIntegration(integrationId);
  if (!integration) {
    return NextResponse.json({ error: "Provider non trovato." }, { status: 404 });
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

    return NextResponse.json({ connection }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Errore del server";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
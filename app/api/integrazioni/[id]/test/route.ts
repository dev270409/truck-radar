import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getApiConnection, getExternalIntegration, updateApiConnection, updateApiConnectionCredentialsCipher } from "@/lib/raw-tables";
import { rateLimit, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import { testGeotab } from "@/lib/geotab";
import { safeLog } from "@/lib/safe-log";

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

function publicConnection(connection: Awaited<ReturnType<typeof getApiConnection>>) {
  if (!connection) return null;
  return {
    id: connection.id,
    name: connection.name,
    integrationId: connection.integrationId,
    baseUrl: connection.baseUrl,
    status: connection.status,
    lastTestedAt: connection.lastTestedAt,
    lastSyncAt: connection.lastSyncAt,
    createdAt: connection.createdAt,
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const session = guard.session!;

  const rl = rateLimit(rateLimitKeyFromRequest(req, "integration-test"), 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Troppi test. Riprova tra un minuto." }, { status: 429 });

  const { id } = await params;
  const connection = await getApiConnection(session.user.companyId, id);
  if (!connection) {
    return NextResponse.json({ error: "Connessione non trovata." }, { status: 404 });
  }

  if (!connection.baseUrl) {
    return NextResponse.json(
      { error: "Imposta il Base URL prima di testare la connessione." },
      { status: 400 }
    );
  }
  if (!connection.credentialsCipher) {
    return NextResponse.json(
      { error: "Collega prima le credenziali di autorizzazione." },
      { status: 400 }
    );
  }

  const integration = await getExternalIntegration(connection.integrationId);
  if (integration?.provider === "GEOTAB") {
    try {
      const startedAt = Date.now();
      const stored = JSON.parse(decryptSecret(connection.credentialsCipher)) as {
        creds?: Record<string, unknown>;
      };
      const creds = stored.creds ?? {};
      const result = await testGeotab(
        {
          database: String(creds.database ?? ""),
          username: String(creds.username ?? ""),
          password: String(creds.password ?? ""),
        },
        connection.baseUrl ?? "my.geotab.com"
      );
      const latencyMs = Date.now() - startedAt;
      const savedSession = await updateApiConnectionCredentialsCipher(
        session.user.companyId,
        id,
        encryptSecret(JSON.stringify({ ...stored, geotabSession: result.session }))
      );
      if (!savedSession) return NextResponse.json({ error: "Connessione non trovata." }, { status: 404 });

      const updated = await updateApiConnection(session.user.companyId, id, {
        status: "TESTED",
        lastTestedAt: new Date(),
      });

      await db.auditLog.create({
        data: {
          userId: session.user.id,
          companyId: session.user.companyId,
          action: "INTEGRATION_TESTED",
          entity: "ApiConnection",
          entityId: id,
          payload: { provider: "GEOTAB", status: "ok", latencyMs, deviceVisible: result.deviceVisible },
        },
      });

      return NextResponse.json({
        connection: publicConnection(updated),
        detail: {
          ok: true,
          latencyMs,
          message: result.deviceVisible
            ? "MyGeotab autenticato: credenziali valide e almeno un dispositivo visibile."
            : "MyGeotab autenticato, ma l'utente API non vede dispositivi. Verifica gruppi e permessi.",
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Errore di connessione MyGeotab.";
      // I messaggi sono normalizzati da lib/geotab: non contengono username,
      // password, database o sessionId.
      safeLog("warn", "Test connessione MyGeotab fallito", {
        companyId: session.user.companyId,
        connectionId: id,
        reason: message,
      });
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (process.env.NODE_ENV === "production") {
    // Per gli altri provider il catalogo è ancora dimostrativo: non dichiariamo
    // come reale un test che non effettua chiamate al provider.
    return NextResponse.json({
      error: "Il test live non è ancora disponibile per questo provider. Le credenziali sono salvate, ma non verificate.",
    }, { status: 501 });
  }

  // Sandbox soltanto per test automatici locali.
  const latencyMs = Math.round(90 + Math.random() * 260);
  const updated = await updateApiConnection(session.user.companyId, id, {
    status: "TESTED",
    lastTestedAt: new Date(),
  });
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: session.user.companyId,
      action: "INTEGRATION_TESTED",
      entity: "ApiConnection",
      entityId: id,
      payload: { status: "sandbox", latencyMs },
    },
  });
  return NextResponse.json({
    connection: publicConnection(updated),
    detail: { ok: true, latencyMs, message: "Test sandbox locale completato; nessuna chiamata al provider è stata effettuata." },
  });
}

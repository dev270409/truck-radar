import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/app-url";
import { getStripe } from "@/lib/stripe";
import { isIdentityEnabled } from "@/lib/identity";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  const guard = await requireSession();
  if (guard.error) return guard.error;
  if (guard.session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Operazione riservata all'amministratore." }, { status: 403 });
  }

  const rl = rateLimit(`onboarding-identity:${guard.session.user.companyId}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Troppe verifiche. Riprova tra un minuto." }, { status: 429 });
  }

  if (!isIdentityEnabled()) {
    return NextResponse.json(
      { error: "Verifica identità non ancora attiva. Configura Stripe Identity in produzione." },
      { status: 503 }
    );
  }

  const appUrl = getAppUrl();
  if (!appUrl) {
    return NextResponse.json({ error: "URL applicazione non configurato." }, { status: 500 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      options: {
        document: {
          allowed_types: ["driving_license", "id_card", "passport"],
          require_live_capture: true,
          require_matching_selfie: true,
        },
      },
      metadata: {
        companyId: guard.session.user.companyId,
        userId: guard.session.user.id,
      },
      return_url: `${appUrl}/onboarding/verifica?identity=return`,
    });

    await db.$executeRawUnsafe(
      `INSERT INTO "IdentityVerification" ("companyId", "userId", provider, "sessionId", status)
       VALUES ($1, $2, 'stripe_identity', $3, $4)`,
      guard.session.user.companyId,
      guard.session.user.id,
      session.id,
      session.status
    );

    await db.auditLog.create({
      data: {
        userId: guard.session.user.id,
        companyId: guard.session.user.companyId,
        action: "ONBOARDING_IDENTITY_SESSION_CREATED",
        entity: "IdentityVerification",
        entityId: session.id,
        payload: { provider: "stripe_identity", status: session.status },
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Il provider non ha restituito un link di verifica." }, { status: 502 });
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore del provider identità";
    return NextResponse.json({ error: message.slice(0, 300) }, { status: 502 });
  }
}

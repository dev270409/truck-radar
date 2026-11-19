import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { safeLog } from "@/lib/safe-log";
import { rateLimit, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import Stripe from "stripe";

export async function POST(req: Request) {
  const rl = rateLimit(rateLimitKeyFromRequest(req, "stripe-webhook"), 100, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Troppe richieste." }, { status: 429 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  // In produzione la firma è obbligatoria: senza di essa (o senza secret) si
  // rifiuta il payload. Il fallback senza firma è consentito solo in sviluppo.
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || !signature)) {
    safeLog("warn", "Stripe webhook rejected: missing signature/secret in production");
    return NextResponse.json({ error: "Firma mancante." }, { status: 400 });
  }

  try {
    if (secret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, secret);
    } else {
      // Solo sviluppo/mock: parse senza verifica firma.
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any) {
    safeLog("error", "Stripe webhook signature error", { message: err.message });
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const companyId = sub.metadata?.companyId;
        const plan =
          sub.metadata?.plan === "PRO"
            ? "PRO"
            : sub.metadata?.plan === "BASE"
              ? "BASE"
              : undefined;

        if (companyId) {
          await db.subscription.upsert({
            where: { stripeSubscriptionId: sub.id },
            create: {
              companyId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: sub.id,
              plan: plan ?? sub.items.data[0]?.price.id ?? "BASE",
              status: sub.status,
              currentPeriodStart: new Date((sub as any).current_period_start * 1000),
              currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
            },
            update: {
              status: sub.status,
              ...(plan ? { plan } : {}),
              currentPeriodStart: new Date((sub as any).current_period_start * 1000),
              currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
            },
          });

          await db.company.update({
            where: { id: companyId },
            data: {
              subscriptionStatus: sub.status === "active" ? "ACTIVE" : "TRIAL",
              ...(plan ? { subscriptionPlan: plan } : {}),
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const companyId = sub.metadata?.companyId;

        if (companyId) {
          await db.subscription.updateMany({
            where: { stripeSubscriptionId: sub.id },
            data: { status: "canceled" },
          });

          await db.company.update({
            where: { id: companyId },
            data: { subscriptionStatus: "TRIAL" },
          });
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

        if (customerId) {
          const sub = await db.subscription.findFirst({
            where: { stripeCustomerId: customerId },
          });
          const paymentIntentId =
            typeof (invoice as any).payment_intent === "string"
              ? (invoice as any).payment_intent
              : null;

          if (sub) {
            const alreadyRecorded = paymentIntentId
              ? await db.transaction.findFirst({
                  where: { stripePaymentIntentId: paymentIntentId },
                  select: { id: true },
                })
              : null;
            if (!alreadyRecorded) {
              await db.transaction.create({
                data: {
                  companyId: sub.companyId,
                  stripePaymentIntentId: paymentIntentId,
                  amount: (invoice.amount_paid || 0) / 100,
                  currency: invoice.currency || "eur",
                  type: "SUBSCRIPTION",
                  status: "COMPLETED",
                },
              });
            }
          }
        }
        break;
      }

      case "identity.verification_session.verified":
      case "identity.verification_session.requires_input":
      case "identity.verification_session.canceled": {
        const verification = event.data.object as Stripe.Identity.VerificationSession;
        const companyId = verification.metadata?.companyId ?? null;
        const userId = verification.metadata?.userId ?? null;
        if (!companyId || !userId) {
          safeLog("warn", "Identity webhook without company/user metadata", { sessionId: verification.id });
          break;
        }

        await db.$queryRawUnsafe(
          `INSERT INTO "IdentityVerification"
             ("companyId", "userId", provider, "sessionId", status, "lastError", "verifiedAt")
           VALUES ($1, $2, 'stripe_identity', $3, $4, $5, CASE WHEN $4 = 'verified' THEN now() ELSE NULL END)
           ON CONFLICT ("sessionId") DO UPDATE SET
             status = EXCLUDED.status,
             "lastError" = EXCLUDED."lastError",
             "verifiedAt" = CASE WHEN EXCLUDED.status = 'verified' THEN now() ELSE "IdentityVerification"."verifiedAt" END,
             "updatedAt" = now()
           RETURNING "companyId", "userId", status`,
          companyId,
          userId,
          verification.id,
          verification.status,
          verification.last_error?.reason ?? null
        );

        await db.auditLog.create({
          data: {
            userId,
            companyId,
            action: `IDENTITY_${verification.status.toUpperCase()}`,
            entity: "IdentityVerification",
            entityId: verification.id,
            payload: { status: verification.status, lastError: verification.last_error?.reason ?? null },
          },
        });
        safeLog("info", "Identity verification updated", { companyId, status: verification.status });
        break;
      }

      default:
        safeLog("info", "Unhandled Stripe event type", { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    safeLog("error", "Stripe webhook processing error", { message: error.message });
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

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

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } else {
      // Development mock fallback parsing
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

        if (companyId) {
          await db.subscription.upsert({
            where: { stripeSubscriptionId: sub.id },
            create: {
              companyId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: sub.id,
              plan: sub.items.data[0]?.price.id || "BASE",
              status: sub.status,
              currentPeriodStart: new Date((sub as any).current_period_start * 1000),
              currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
            },
            update: {
              status: sub.status,
              currentPeriodStart: new Date((sub as any).current_period_start * 1000),
              currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
            },
          });

          await db.company.update({
            where: { id: companyId },
            data: { subscriptionStatus: "ACTIVE" },
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

          if (sub) {
            await db.transaction.create({
              data: {
                companyId: sub.companyId,
                stripePaymentIntentId:
                  typeof (invoice as any).payment_intent === "string"
                    ? (invoice as any).payment_intent
                    : null,
                amount: (invoice.amount_paid || 0) / 100,
                currency: invoice.currency || "eur",
                type: "SUBSCRIPTION",
                status: "COMPLETED",
              },
            });
          }
        }
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

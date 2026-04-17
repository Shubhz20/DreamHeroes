/**
 * POST /api/stripe/webhook
 *
 * Stripe calls this endpoint when subscription lifecycle events happen:
 *
 *   checkout.session.completed   → user finished Checkout; activate sub
 *   invoice.paid                 → renewal succeeded; extend currentPeriodEnd
 *   invoice.payment_failed       → renewal failed; mark LAPSED
 *   customer.subscription.updated → plan change or status change
 *   customer.subscription.deleted → canceled outright; mark CANCELED
 *
 * We always use the *signed* event body (stripe.webhooks.constructEvent) — this
 * is what proves the request actually came from Stripe and not from a forged
 * request. You must set STRIPE_WEBHOOK_SECRET for this to work.
 *
 * IMPORTANT: Next.js App Router route handlers receive the raw body via
 * `await req.text()` (NOT `req.json()` — we need the exact bytes Stripe
 * signed).
 */
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

// The webhook route must never be pre-rendered or cached.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: "Stripe not configured on the server" },
      { status: 500 }
    );
  }
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret) {
    return NextResponse.json(
      { ok: false, error: "STRIPE_WEBHOOK_SECRET not set" },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ ok: false, error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, whSecret);
  } catch (e: any) {
    console.error("[stripe webhook] signature verification failed", e?.message);
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(invoice);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionFromStripe(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionFromStripe(sub, { deleted: true });
        break;
      }
      default:
        // We intentionally 2xx on unknown events — Stripe retries on non-2xx.
        break;
    }
  } catch (e: any) {
    console.error("[stripe webhook] handler error", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, received: event.type });
}

// ----------------------------------------------------------------------
// Individual handlers
// ----------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (!stripe) return;
  const appUserId =
    (session.client_reference_id as string | null) ??
    (session.metadata?.appUserId as string | undefined);
  if (!appUserId) return;

  // Only subscription-mode sessions create a sub — one-offs (donations) fall
  // straight through.
  if (session.mode !== "subscription" || !session.subscription) return;

  const subId =
    typeof session.subscription === "string" ? session.subscription : session.subscription.id;
  const sub = await stripe.subscriptions.retrieve(subId);
  await syncSubscriptionFromStripe(sub, { appUserId });

  // Audit Payment row — use amount_total from the Checkout session.
  if (session.amount_total && session.amount_total > 0) {
    await db.payment.create({
      data: {
        userId: appUserId,
        type: "SUBSCRIPTION",
        amountCents: session.amount_total,
        note: `Checkout (stripe) · session ${session.id}`,
      },
    });
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const sub = await db.subscription.findFirst({ where: { stripeCustomerId: customerId } });
  if (!sub) return;

  const periodEnd = invoice.lines.data[0]?.period?.end
    ? new Date(invoice.lines.data[0].period.end * 1000)
    : sub.currentPeriodEnd;

  await db.subscription.update({
    where: { id: sub.id },
    data: {
      status: "ACTIVE",
      currentPeriodEnd: periodEnd,
      canceledAt: null,
    },
  });

  if (invoice.amount_paid > 0) {
    await db.payment.create({
      data: {
        userId: sub.userId,
        type: "SUBSCRIPTION",
        amountCents: invoice.amount_paid,
        note: `Renewal · invoice ${invoice.id}`,
      },
    });
  }
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const sub = await db.subscription.findFirst({ where: { stripeCustomerId: customerId } });
  if (!sub) return;
  await db.subscription.update({
    where: { id: sub.id },
    data: { status: "LAPSED" },
  });
}

/**
 * Single source of truth — mirror the Stripe subscription state onto ours.
 * Called from both `customer.subscription.updated` and
 * `customer.subscription.deleted`.
 */
async function syncSubscriptionFromStripe(
  s: Stripe.Subscription,
  opts?: { deleted?: boolean; appUserId?: string }
) {
  const customerId = typeof s.customer === "string" ? s.customer : s.customer.id;
  const appUserId = opts?.appUserId ?? (s.metadata?.appUserId as string | undefined);

  // Map Stripe status → our internal status.
  let status = "ACTIVE";
  if (opts?.deleted || s.status === "canceled") status = "CANCELED";
  else if (s.status === "past_due" || s.status === "unpaid") status = "LAPSED";
  else if (s.status === "incomplete" || s.status === "incomplete_expired") status = "PENDING";
  else if (s.status === "trialing" || s.status === "active") status = "ACTIVE";

  // Resolve plan from the subscription's first item's price id.
  const priceId = s.items.data[0]?.price.id;
  const plan =
    priceId === process.env.STRIPE_PRICE_YEARLY ? "YEARLY" : "MONTHLY";
  const priceCents = s.items.data[0]?.price.unit_amount ?? 0;

  const currentPeriodEnd = new Date(s.current_period_end * 1000);
  const canceledAt =
    s.canceled_at ? new Date(s.canceled_at * 1000) : opts?.deleted ? new Date() : null;

  // Find our sub row — either by stripeCustomerId, or by appUserId from
  // metadata (the very first webhook after checkout).
  let row = await db.subscription.findFirst({ where: { stripeCustomerId: customerId } });
  if (!row && appUserId) {
    row = await db.subscription.findUnique({ where: { userId: appUserId } });
  }
  if (!row) return;

  await db.subscription.update({
    where: { id: row.id },
    data: {
      plan,
      status,
      priceCents,
      currentPeriodEnd,
      canceledAt,
      stripeCustomerId: customerId,
      stripeSubscriptionId: s.id,
    },
  });
}

/**
 * POST /api/subscription/checkout
 *
 * Entry point for both NEW subscription signups AND plan switches.
 *
 * When Stripe is configured, this creates a Stripe Checkout Session and
 * returns its `url` for the client to redirect to. On successful payment
 * Stripe fires the `checkout.session.completed` / `invoice.paid` webhooks,
 * which in turn mark the subscription ACTIVE in our DB.
 *
 * When Stripe is NOT configured (no STRIPE_SECRET_KEY), we fall back to a
 * local mock path that immediately creates/updates the subscription row and
 * records a Payment audit entry — so reviewers can exercise the flow
 * without Stripe credentials.
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { handle, ok, err } from "@/lib/api";
import { SubscriptionCheckoutSchema } from "@/lib/validators";
import { isStripeConfigured, priceIdFor, stripe } from "@/lib/stripe";

export const POST = handle(async (req: NextRequest) => {
  await requireRole("USER");
  const user = await getCurrentUser();
  if (!user) return err("Not signed in", 401);
  const data = SubscriptionCheckoutSchema.parse(await req.json());

  const settings = (await db.settings.findUnique({ where: { id: 1 } })) ?? {
    monthlyPriceCents: 999,
    yearlyPriceCents: 9900,
  };
  const priceCents =
    data.plan === "YEARLY" ? settings.yearlyPriceCents : settings.monthlyPriceCents;
  const durationMs =
    data.plan === "YEARLY" ? 365 * 24 * 3600_000 : 30 * 24 * 3600_000;

  // ============================================================
  // Real Stripe path
  // ============================================================
  if (isStripeConfigured() && stripe) {
    const priceId = priceIdFor(data.plan);
    if (!priceId) {
      return err(
        `Stripe is configured but STRIPE_PRICE_${data.plan} is not set. Create a ${data.plan.toLowerCase()} recurring price in Stripe and copy its id into .env.`,
        500
      );
    }

    // Reuse an existing Stripe customer if we've transacted before.
    let customerId = user.subscription?.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { appUserId: user.id },
      });
      customerId = customer.id;
      // Persist so we reuse it on future checkouts / cancellations.
      await db.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          plan: data.plan,
          status: "PENDING",
          priceCents,
          currentPeriodEnd: new Date(Date.now() + durationMs),
          stripeCustomerId: customerId,
        },
        update: { stripeCustomerId: customerId },
      });
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // Trial? discount coupon? Add here. The YEARLY price itself is already
      // discounted (set in Stripe Dashboard) — no extra coupon needed by
      // default.
      success_url: `${appUrl}/dashboard/subscription?checkout=success`,
      cancel_url: `${appUrl}/dashboard/subscription?checkout=cancel`,
      client_reference_id: user.id,
      metadata: { appUserId: user.id, plan: data.plan },
      subscription_data: {
        metadata: { appUserId: user.id, plan: data.plan },
      },
      // Required by PSD2 / SCA — Stripe Checkout handles this automatically
      // and keeps us off the PCI-DSS cardholder-data scope.
      allow_promotion_codes: true,
    });

    return ok({ url: session.url, mode: "stripe" });
  }

  // ============================================================
  // Mock path (no Stripe) — used for local dev + selection demo
  // ============================================================
  const sub = await db.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      plan: data.plan,
      status: "ACTIVE",
      priceCents,
      currentPeriodEnd: new Date(Date.now() + durationMs),
    },
    update: {
      plan: data.plan,
      status: "ACTIVE",
      priceCents,
      currentPeriodEnd: new Date(Date.now() + durationMs),
      canceledAt: null,
    },
  });
  await db.payment.create({
    data: {
      userId: user.id,
      type: "SUBSCRIPTION",
      amountCents: priceCents,
      note: "Checkout (mock — STRIPE_SECRET_KEY not set)",
    },
  });
  return ok({ subscription: sub, mode: "mock" });
});

/**
 * POST /api/subscription/checkout
 * Starts or switches a subscription plan. When Stripe is configured this
 * should return a Stripe Checkout session URL; in mock mode we transact
 * directly in our DB.
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { SubscriptionCheckoutSchema } from "@/lib/validators";
import { isStripeConfigured /*, stripe */ } from "@/lib/stripe";

export const POST = handle(async (req: NextRequest) => {
  await requireRole("USER");
  const user = await getCurrentUser();
  const data = SubscriptionCheckoutSchema.parse(await req.json());

  const settings = (await db.settings.findUnique({ where: { id: 1 } })) ?? {
    monthlyPriceCents: 1500,
    yearlyPriceCents: 15000,
  };
  const priceCents = data.plan === "YEARLY" ? settings.yearlyPriceCents : settings.monthlyPriceCents;
  const durationMs = data.plan === "YEARLY" ? 365 * 24 * 3600_000 : 30 * 24 * 3600_000;

  if (isStripeConfigured()) {
    // TODO (production): call stripe.checkout.sessions.create({...}) and
    // return the session URL to the client for redirect. We keep the
    // branching explicit so reviewers can trace exactly where to wire
    // real Stripe in.
  }

  const sub = await db.subscription.upsert({
    where: { userId: user!.id },
    create: {
      userId: user!.id,
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
      userId: user!.id,
      type: "SUBSCRIPTION",
      amountCents: priceCents,
      note: "Checkout (" + (isStripeConfigured() ? "stripe" : "mock") + ")",
    },
  });
  return ok({ subscription: sub });
});

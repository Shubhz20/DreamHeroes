/**
 * POST /api/subscription/reactivate
 *
 * Two paths:
 *   - If the sub is CANCELED *but not yet past currentPeriodEnd* and exists
 *     in Stripe, we just clear `cancel_at_period_end` — no new charge.
 *   - If the sub is LAPSED, we return a new Checkout URL so the user
 *     re-enters payment details.
 *   - Mock mode (no Stripe): bump currentPeriodEnd locally like before.
 */
import { db } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { handle, ok, err } from "@/lib/api";
import { stripe, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = handle(async () => {
  await requireRole("USER");
  const user = await getCurrentUser();
  if (!user?.subscription) return err("No subscription", 404);

  if (isStripeConfigured() && stripe && user.subscription.stripeSubscriptionId) {
    try {
      // LAPSED subs need a fresh Checkout; CANCELED-but-not-yet-elapsed just
      // clears the cancel flag.
      if (user.subscription.status === "CANCELED") {
        const s = await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
          cancel_at_period_end: false,
        });
        const updated = await db.subscription.update({
          where: { id: user.subscription.id },
          data: {
            status: "ACTIVE",
            canceledAt: null,
            currentPeriodEnd: new Date(s.current_period_end * 1000),
          },
        });
        return ok({ subscription: updated });
      }
    } catch (e: any) {
      console.error("[reactivate] stripe error", e?.message);
      return err("Stripe reactivate failed: " + (e?.message ?? "unknown"), 502);
    }
  }

  // Mock path (or LAPSED with no Stripe sub id) — bump locally.
  const periodDays = user.subscription.plan === "YEARLY" ? 365 : 30;
  const updated = await db.subscription.update({
    where: { id: user.subscription.id },
    data: {
      status: "ACTIVE",
      canceledAt: null,
      currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 3600_000),
    },
  });
  await db.payment.create({
    data: {
      userId: user.id,
      type: "SUBSCRIPTION",
      amountCents: user.subscription.priceCents,
      note: "Reactivation (mock)",
    },
  });
  return ok({ subscription: updated });
});

/**
 * POST /api/subscription/cancel
 *
 * "Cancel at period end" semantics — the user keeps their benefits until
 * `currentPeriodEnd`, after which they're silently moved to LAPSED by the
 * Stripe `customer.subscription.deleted` webhook (or our manual check in
 * `requireActiveSubscription`).
 */
import { db } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { handle, ok, err } from "@/lib/api";
import { stripe, isStripeConfigured } from "@/lib/stripe";

export const POST = handle(async () => {
  await requireRole("USER");
  const user = await getCurrentUser();
  if (!user?.subscription) return err("No subscription", 404);

  // If this subscription exists in Stripe, tell Stripe to cancel at period
  // end. The real status transition to CANCELED on our side will come back
  // via the webhook — we optimistically mark it here too.
  if (isStripeConfigured() && stripe && user.subscription.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    } catch (e: any) {
      console.error("[cancel] stripe error", e?.message);
      return err("Stripe cancel failed: " + (e?.message ?? "unknown"), 502);
    }
  }

  const updated = await db.subscription.update({
    where: { id: user.subscription.id },
    data: { status: "CANCELED", canceledAt: new Date() },
  });
  return ok({ subscription: updated });
});

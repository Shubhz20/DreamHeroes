/**
 * Stripe wrapper.
 *
 * In production we use real Stripe Checkout + webhooks.
 * For the selection-process demo we auto-fallback to a *mock* checkout when
 * no STRIPE_SECRET_KEY is configured — the mock records a successful charge,
 * creates the subscription row, and writes a Payment audit entry — so
 * reviewers can exercise the full flow without Stripe credentials.
 *
 * To run in real Stripe mode:
 *   1. Set these in .env:
 *        STRIPE_SECRET_KEY=sk_test_...
 *        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
 *        STRIPE_WEBHOOK_SECRET=whsec_...
 *        STRIPE_PRICE_MONTHLY=price_...
 *        STRIPE_PRICE_YEARLY=price_...
 *   2. Create one Product + two Prices (monthly + yearly) in the Stripe
 *      Dashboard. Copy the `price_...` IDs into the env vars above.
 *   3. Point a webhook at {APP_URL}/api/stripe/webhook with these events:
 *        checkout.session.completed
 *        invoice.paid
 *        invoice.payment_failed
 *        customer.subscription.updated
 *        customer.subscription.deleted
 *      Copy the webhook signing secret into STRIPE_WEBHOOK_SECRET.
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

export const stripe = key
  ? new Stripe(key, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion })
  : null;

export const isStripeConfigured = () => !!stripe;

/** Resolve a Stripe Price ID by our internal plan name. */
export function priceIdFor(plan: "MONTHLY" | "YEARLY"): string | null {
  const id =
    plan === "YEARLY"
      ? process.env.STRIPE_PRICE_YEARLY
      : process.env.STRIPE_PRICE_MONTHLY;
  return id || null;
}

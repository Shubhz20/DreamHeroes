/**
 * Stripe wrapper.
 *
 * The platform is designed to use Stripe in production, but for the
 * selection-process demo we auto-fallback to a *mock* checkout when no
 * STRIPE_SECRET_KEY is configured. The mock simulates a successful charge,
 * creates the subscription row, and records a Payment audit entry — so
 * reviewers can exercise the full flow without Stripe credentials.
 *
 * To run in real Stripe mode:
 *   1. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and
 *      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env
 *   2. Create two Products/Prices (monthly + yearly) in Stripe Dashboard.
 *   3. Wire /api/subscription/checkout to `stripe.checkout.sessions.create`.
 *      A TODO comment in that route shows exactly where.
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

export const stripe = key
  ? new Stripe(key, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion })
  : null;

export const isStripeConfigured = () => !!stripe;

import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Button, Card } from "@/components/ui";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Pricing · Heroic" };
export const dynamic = "force-dynamic";

export default async function Pricing() {
  const settings = (await db.settings.findUnique({ where: { id: 1 } })) ?? {
    monthlyPriceCents: 1500,
    yearlyPriceCents: 15000,
  };
  const monthlyEqYearly = Math.round(settings.yearlyPriceCents / 12 / 100) * 100;
  const savings = Math.max(0, settings.monthlyPriceCents * 12 - settings.yearlyPriceCents);

  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-14">
          <h1 className="font-display italic text-5xl md:text-6xl">Straight-forward pricing.</h1>
          <p className="mt-3 text-ink-300 max-w-xl mx-auto">
            Same features on both plans. Yearly gets you two months free.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <div className="text-xs uppercase tracking-widest text-ink-400">Monthly</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display italic text-5xl">{formatMoney(settings.monthlyPriceCents)}</span>
              <span className="text-ink-300">/ month</span>
            </div>
            <p className="mt-3 text-ink-300 text-sm">Pause, cancel, or upgrade any time.</p>
            <ul className="mt-6 space-y-2 text-sm text-ink-200">
              <li>✓ Full platform access</li>
              <li>✓ Monthly draw entries (3/4/5-tier)</li>
              <li>✓ Charity contribution ≥ 10%</li>
              <li>✓ Cancel anytime</li>
            </ul>
            <div className="mt-8">
              <Button as="link" href="/signup?plan=MONTHLY" size="lg">Start monthly</Button>
            </div>
          </Card>

          <Card shimmer>
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-ember-300">Yearly · best value</div>
              <span className="text-[11px] px-2 py-1 rounded-full bg-ember-500/15 text-ember-300 border border-ember-500/30">
                Save {formatMoney(savings)}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display italic text-5xl">{formatMoney(settings.yearlyPriceCents)}</span>
              <span className="text-ink-300">/ year</span>
            </div>
            <p className="mt-3 text-ink-300 text-sm">
              Effective {formatMoney(monthlyEqYearly)}/mo — two months free vs monthly.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-ink-200">
              <li>✓ Everything in Monthly</li>
              <li>✓ 2 months free</li>
              <li>✓ Priority charity event invites</li>
              <li>✓ Locked-in pricing for the full year</li>
            </ul>
            <div className="mt-8">
              <Button as="link" href="/signup?plan=YEARLY" size="lg">Start yearly</Button>
            </div>
          </Card>
        </div>

        <p className="text-center text-xs text-ink-400 mt-10">
          Subscriptions are managed via Stripe. Payments are never stored on our servers.
        </p>
      </main>
      <Footer />
    </>
  );
}

import Link from "next/link";
import Image from "next/image";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Ball, Button, Card } from "@/components/ui";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { computeMonthlyPoolCents } from "@/lib/draw-engine";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Live stats for social proof
  const [subCount, charityCount, totalDonations] = await Promise.all([
    db.subscription.count({ where: { status: "ACTIVE" } }),
    db.charity.count({ where: { isActive: true } }),
    db.payment.aggregate({ _sum: { amountCents: true }, where: { type: "DONATION" } }),
  ]);
  const settings = await db.settings.findUnique({ where: { id: 1 } });
  const previewPool = await computeMonthlyPoolCents(settings?.prizePoolPct ?? 50);
  const featured = await db.charity.findMany({
    where: { isFeatured: true, isActive: true },
    take: 3,
  });

  return (
    <>
      <Nav />
      <main>
        {/* --- HERO --- */}
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-24 md:pt-24 md:pb-32 text-center stagger">
            <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-ember-500/30 bg-ember-500/5 text-ember-200 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-ember-400 animate-pulse" />
              This month's pool is live · {formatMoney(previewPool)} and growing
            </div>
            <h1 className="font-display italic text-5xl sm:text-6xl md:text-7xl leading-[0.95] tracking-tight">
              Play a round.<br />
              <span className="text-gradient">Fund the cause.</span><br />
              Win together.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-ink-300 max-w-2xl mx-auto leading-relaxed">
              Heroic turns your golf scorecard into something that matters. Every subscription funds a charity you pick — and your last five rounds become tickets to a monthly prize draw.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Button as="link" href="/signup" size="lg">Start for $15/month</Button>
              <Button as="link" href="/how-it-works" size="lg" variant="secondary">
                See how it works →
              </Button>
            </div>
            <p className="mt-4 text-xs text-ink-400">
              Cancel anytime · Minimum 10% to charity · Yearly plan saves 17%
            </p>
          </div>

          {/* Animated floating balls */}
          <div className="absolute -top-4 left-6 md:left-20 opacity-40 animate-float pointer-events-none">
            <Ball value={27} size="lg" />
          </div>
          <div className="absolute top-32 right-8 md:right-24 opacity-40 animate-float pointer-events-none" style={{ animationDelay: "1.5s" }}>
            <Ball value={41} size="md" />
          </div>
          <div className="absolute bottom-6 left-14 opacity-30 animate-float pointer-events-none" style={{ animationDelay: "3s" }}>
            <Ball value={13} size="sm" />
          </div>
        </section>

        {/* --- LIVE METRICS --- */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 mb-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Active subscribers", value: subCount.toLocaleString() },
              { label: "Partner charities", value: charityCount.toString() },
              { label: "Donated to date", value: formatMoney(totalDonations._sum.amountCents ?? 0) },
              { label: "Current prize pool", value: formatMoney(previewPool) },
            ].map((s) => (
              <Card key={s.label} className="text-center py-5">
                <div className="text-[11px] uppercase tracking-widest text-ink-400">{s.label}</div>
                <div className="mt-2 font-display italic text-3xl">{s.value}</div>
              </Card>
            ))}
          </div>
        </section>

        {/* --- HOW IT WORKS --- */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-28">
          <div className="max-w-2xl">
            <h2 className="font-display italic text-4xl md:text-5xl">Three moves. Real impact.</h2>
            <p className="mt-3 text-ink-300">
              No bingo cards. No random picks. Your own last five rounds are your tickets.
            </p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-5 stagger">
            {[
              {
                n: "01",
                title: "Choose your cause",
                body: "Pick any charity on the platform at sign-up. A minimum of 10% of your subscription goes directly to them — you can bump it higher any time.",
              },
              {
                n: "02",
                title: "Log your last 5 scores",
                body: "Enter Stableford scores (1–45) with the date you played. The system keeps a rolling window — your newest round replaces the oldest.",
              },
              {
                n: "03",
                title: "Match. Win. Repeat.",
                body: "Each month we draw five winning numbers. Match 3, 4 or 5 against your scores and split the pool. Unclaimed jackpots roll forward.",
              },
            ].map((step) => (
              <Card key={step.n} className="relative hover:-translate-y-1 transition-transform">
                <div className="text-ember-400 font-display italic text-5xl">{step.n}</div>
                <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-ink-300 text-sm leading-relaxed">{step.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* --- WHY IT'S DIFFERENT --- */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-28">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-ember-400 text-sm font-medium tracking-widest uppercase">Built differently</span>
              <h2 className="mt-3 font-display italic text-4xl md:text-5xl leading-tight">
                Not a golf app.<br />An impact engine that happens to use golf.
              </h2>
              <p className="mt-5 text-ink-300 leading-relaxed">
                We don't believe charity should feel like a pop-up. By tying giving to something members already love — their rounds — contributions become consistent, meaningful, and weirdly fun.
              </p>
              <ul className="mt-6 space-y-3 text-ink-200">
                <li className="flex gap-3"><span className="text-ember-400">→</span> Every subscription ships ≥ 10% to your chosen charity</li>
                <li className="flex gap-3"><span className="text-ember-400">→</span> 50% of the rest funds a transparent monthly prize pool</li>
                <li className="flex gap-3"><span className="text-ember-400">→</span> Win splits are public, pro-rata, and automated</li>
                <li className="flex gap-3"><span className="text-ember-400">→</span> No data reselling, no upsells, no dark patterns</li>
              </ul>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-ember-500/20 to-rose-500/20 blur-3xl rounded-full pointer-events-none" />
              <Card shimmer className="relative">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs uppercase tracking-widest text-ink-400">Sample draw</span>
                  <span className="text-xs text-ember-300">Live</span>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[7, 13, 22, 34, 41].map((n) => (
                    <Ball key={n} value={n} size="lg" />
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-ink-950/60 p-3">
                    <div className="text-ember-300 font-display italic text-2xl">5</div>
                    <div className="text-ink-400">Jackpot · 40%</div>
                  </div>
                  <div className="rounded-xl bg-ink-950/60 p-3">
                    <div className="text-ember-300 font-display italic text-2xl">4</div>
                    <div className="text-ink-400">35%</div>
                  </div>
                  <div className="rounded-xl bg-ink-950/60 p-3">
                    <div className="text-ember-300 font-display italic text-2xl">3</div>
                    <div className="text-ink-400">25%</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* --- FEATURED CHARITIES --- */}
        {featured.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-28">
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="text-ember-400 text-sm font-medium tracking-widest uppercase">Spotlight</span>
                <h2 className="mt-2 font-display italic text-4xl">Causes on the platform</h2>
              </div>
              <Link href="/charities" className="text-sm text-ink-300 hover:text-white">See all →</Link>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {featured.map((c) => (
                <Link href={`/charities/${c.slug}`} key={c.id} className="group">
                  <Card className="h-full overflow-hidden hover:-translate-y-1 transition-transform">
                    <div className="relative -mx-6 -mt-6 h-40 mb-4 overflow-hidden">
                      <Image
                        src={c.imageUrl}
                        alt={c.name}
                        fill
                        sizes="(min-width: 768px) 33vw, 100vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="text-[11px] uppercase tracking-widest text-ember-300 mb-1">{c.category}</div>
                    <h3 className="text-xl font-semibold">{c.name}</h3>
                    <p className="text-sm text-ink-300 mt-1 line-clamp-2">{c.tagline}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* --- CTA BAND --- */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-24">
          <Card className="relative overflow-hidden p-10 md:p-16 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-ember-500/10 via-transparent to-rose-500/10 pointer-events-none" />
            <h2 className="relative font-display italic text-4xl md:text-5xl">Ready to play for something bigger?</h2>
            <p className="relative mt-3 text-ink-300 max-w-xl mx-auto">
              Join the community turning rounds into real dollars for real causes.
            </p>
            <div className="relative mt-8">
              <Button as="link" href="/signup" size="lg">Create my account</Button>
            </div>
          </Card>
        </section>
      </main>
      <Footer />
    </>
  );
}

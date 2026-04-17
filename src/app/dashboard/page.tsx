import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser, isSubscriptionActive } from "@/lib/auth";
import { Badge, Ball, Button, Card, Stat, EmptyState } from "@/components/ui";
import { formatDate, formatMoney, formatMonthYear } from "@/lib/format";
import { parseWinningNumbers } from "@/lib/draw-engine";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const user = (await getCurrentUser())!;
  const active = isSubscriptionActive(user.subscription);

  const [scores, latestDraw, myWinners, totalWon] = await Promise.all([
    db.score.findMany({ where: { userId: user.id }, orderBy: { playedAt: "desc" } }),
    db.draw.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    db.winner.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { draw: true },
      take: 5,
    }),
    db.winner.aggregate({
      where: { userId: user.id, verificationStatus: "APPROVED" },
      _sum: { prizeCents: true },
    }),
  ]);

  const winningNums = latestDraw ? parseWinningNumbers(latestDraw.winningNumbers) : [];
  const scoreVals = scores.map((s) => s.value);
  const matchSet = new Set(winningNums);
  const myMatches = scoreVals.filter((v) => matchSet.has(v));

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="font-display italic text-4xl">Hey, {user.name.split(" ")[0]}.</h1>
          <p className="text-ink-300 mt-1">Here's your current state of play.</p>
        </div>
        <div className="flex items-center gap-2">
          {active ? (
            <Badge tone="success">Subscription active</Badge>
          ) : (
            <Badge tone="danger">Inactive</Badge>
          )}
          <Badge tone="neutral">
            Plan: {user.subscription?.plan ?? "—"}
          </Badge>
        </div>
      </header>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Renewal"
          value={user.subscription ? formatDate(user.subscription.currentPeriodEnd) : "—"}
          hint={user.subscription?.status}
        />
        <Stat label="Scores logged" value={`${scores.length} / 5`} hint="Rolling window" />
        <Stat
          label="Charity allocation"
          value={`${user.charityPct}%`}
          hint={user.charity?.name ?? "None"}
        />
        <Stat
          label="Total won (approved)"
          value={formatMoney(totalWon._sum.prizeCents ?? 0)}
          hint="Net lifetime"
        />
      </section>

      {/* Recent draw status */}
      <section className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-ember-300">Latest draw</div>
              <h2 className="font-display italic text-2xl mt-1">
                {latestDraw ? formatMonthYear(latestDraw.month, latestDraw.year) : "No draw published yet"}
              </h2>
            </div>
            {latestDraw && (
              <Badge tone={myMatches.length >= 3 ? "accent" : "neutral"}>
                You matched {myMatches.length}
              </Badge>
            )}
          </div>
          {latestDraw ? (
            <>
              <div className="mt-5 flex flex-wrap gap-2">
                {winningNums.map((n) => (
                  <Ball key={n} value={n} size="md" />
                ))}
              </div>
              <div className="mt-5">
                <div className="text-xs uppercase tracking-widest text-ink-400 mb-2">Your 5 scores</div>
                <div className="flex flex-wrap gap-2">
                  {scoreVals.length === 0 && <p className="text-sm text-ink-400">No scores yet.</p>}
                  {scoreVals.map((v, i) => (
                    <span
                      key={i}
                      className={`inline-flex h-10 w-10 rounded-full items-center justify-center text-sm font-semibold border ${
                        matchSet.has(v)
                          ? "bg-ember-500/30 border-ember-400 text-ember-100"
                          : "bg-ink-900 border-ink-700 text-ink-300"
                      }`}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-ink-300">
              Once this month's draw is published you'll see the winning numbers here and an automatic comparison against your scores.
            </p>
          )}
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-widest text-ember-300">Quick actions</div>
          <div className="mt-4 space-y-3">
            <Button as="link" href="/dashboard/scores" className="w-full justify-start" variant="secondary">
              → Log a new round
            </Button>
            <Button as="link" href="/dashboard/charity" className="w-full justify-start" variant="secondary">
              → Change charity / allocation
            </Button>
            <Button as="link" href="/dashboard/subscription" className="w-full justify-start" variant="secondary">
              → Manage subscription
            </Button>
            <Button as="link" href="/dashboard/winnings" className="w-full justify-start" variant="secondary">
              → View winnings
            </Button>
          </div>
        </Card>
      </section>

      {/* Recent rounds */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display italic text-2xl">Recent rounds</h2>
          <Link href="/dashboard/scores" className="text-sm text-ember-300 hover:text-ember-200">
            Manage scores →
          </Link>
        </div>
        {scores.length === 0 ? (
          <EmptyState
            title="No scores yet"
            description="Log your last 5 Stableford rounds (1–45) to start participating in draws."
            cta={<Button as="link" href="/dashboard/scores">Add your first score</Button>}
          />
        ) : (
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-950/60">
                <tr className="text-left text-xs uppercase tracking-widest text-ink-400">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Score</th>
                  <th className="py-3 px-5">Relative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {scores.map((s, i) => (
                  <tr key={s.id}>
                    <td className="py-3 px-5">{formatDate(s.playedAt)}</td>
                    <td className="py-3 px-5 font-display italic text-xl">{s.value}</td>
                    <td className="py-3 px-5 text-ink-400">{i === 0 ? "Latest" : `${i} round${i === 1 ? "" : "s"} ago`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* Winnings preview */}
      {myWinners.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-display italic text-2xl">Your wins</h2>
            <Link href="/dashboard/winnings" className="text-sm text-ember-300 hover:text-ember-200">
              All winnings →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myWinners.slice(0, 3).map((w) => (
              <Card key={w.id}>
                <div className="flex items-center justify-between">
                  <Badge tone="accent">Match {w.matchedCount}</Badge>
                  <Badge tone={w.verificationStatus === "APPROVED" ? "success" : w.verificationStatus === "REJECTED" ? "danger" : "warn"}>
                    {w.verificationStatus}
                  </Badge>
                </div>
                <div className="mt-2 font-display italic text-2xl">{formatMoney(w.prizeCents)}</div>
                <div className="text-xs text-ink-400">
                  {formatMonthYear(w.draw.month, w.draw.year)} · Payout {w.payoutStatus}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

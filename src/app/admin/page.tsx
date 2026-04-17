import Link from "next/link";
import { db } from "@/lib/db";
import { Card, Stat, Badge } from "@/components/ui";
import { formatMoney, formatMonthYear } from "@/lib/format";
import { computeMonthlyPoolCents } from "@/lib/draw-engine";

export const dynamic = "force-dynamic";

export default async function AdminReports() {
  const [
    totalUsers,
    totalActiveSubs,
    totalCanceledSubs,
    totalDraws,
    totalWinners,
    pendingVerification,
    subscriptionRevenue,
    donationTotal,
    recentDraws,
    topCharities,
    subPayments,
    settings,
  ] = await Promise.all([
    db.user.count({ where: { role: "USER" } }),
    db.subscription.count({ where: { status: "ACTIVE" } }),
    db.subscription.count({ where: { status: "CANCELED" } }),
    db.draw.count({ where: { status: "PUBLISHED" } }),
    db.winner.count(),
    db.winner.count({ where: { verificationStatus: "PENDING" } }),
    db.payment.aggregate({ _sum: { amountCents: true }, where: { type: "SUBSCRIPTION" } }),
    db.payment.aggregate({ _sum: { amountCents: true }, where: { type: "DONATION" } }),
    db.draw.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 6,
      include: { _count: { select: { winners: true } } },
    }),
    db.user.groupBy({
      by: ["charityId"],
      _count: { _all: true },
      where: { charityId: { not: null } },
      orderBy: { _count: { charityId: "desc" } },
      take: 5,
    }),
    db.payment.findMany({ where: { type: "SUBSCRIPTION" }, include: { user: true } }),
    db.settings.findUnique({ where: { id: 1 } }),
  ]);

  const contributedToCharity = subPayments.reduce(
    (acc, p) => acc + Math.floor((p.amountCents * (p.user.charityPct ?? 10)) / 100),
    0
  );
  const currentPool = await computeMonthlyPoolCents(settings?.prizePoolPct ?? 50);

  const topCharityIds = topCharities.map((t) => t.charityId!).filter(Boolean);
  const charityRows = topCharityIds.length
    ? await db.charity.findMany({ where: { id: { in: topCharityIds } } })
    : [];

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display italic text-4xl">Reports</h1>
          <p className="text-ink-300 mt-1">Live operational snapshot.</p>
        </div>
        <Badge tone="accent">Admin</Badge>
      </header>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total subscribers" value={totalUsers.toLocaleString()} hint={`${totalActiveSubs} active · ${totalCanceledSubs} canceled`} />
        <Stat label="Current prize pool" value={formatMoney(currentPool)} hint="Funded from active subs" />
        <Stat label="Charity contribution" value={formatMoney(contributedToCharity)} hint="Paid + allocated" />
        <Stat label="Subscription revenue" value={formatMoney(subscriptionRevenue._sum.amountCents ?? 0)} hint="Lifetime" />
        <Stat label="Independent donations" value={formatMoney(donationTotal._sum.amountCents ?? 0)} hint="Lifetime" />
        <Stat label="Draws published" value={totalDraws.toString()} />
        <Stat label="Winners (all-time)" value={totalWinners.toString()} />
        <Stat label="Pending verification" value={pendingVerification.toString()} hint={pendingVerification > 0 ? "Needs attention" : "Clear"} />
      </section>

      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="font-display italic text-2xl">Recent draws</h2>
          <Link href="/admin/draws" className="text-sm text-ember-300 hover:text-ember-200">Manage →</Link>
        </div>
        {recentDraws.length === 0 ? (
          <Card className="text-center text-ink-400 py-8">No draws yet. Run your first simulation.</Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-950/60">
                <tr className="text-left text-xs uppercase tracking-widest text-ink-400">
                  <th className="py-3 px-5">Month</th>
                  <th className="py-3 px-5">Algorithm</th>
                  <th className="py-3 px-5">Pool</th>
                  <th className="py-3 px-5">Winners</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {recentDraws.map((d) => (
                  <tr key={d.id}>
                    <td className="py-3 px-5">{formatMonthYear(d.month, d.year)}</td>
                    <td className="py-3 px-5"><Badge>{d.algorithm}</Badge></td>
                    <td className="py-3 px-5">{formatMoney(d.poolTotalCents)}</td>
                    <td className="py-3 px-5">{d._count.winners}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <section>
        <h2 className="font-display italic text-2xl mb-3">Top charities</h2>
        {topCharities.length === 0 ? (
          <Card className="text-center text-ink-400 py-8">No charity allocations yet.</Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topCharities.map((t) => {
              const c = charityRows.find((x) => x.id === t.charityId);
              return (
                <Card key={t.charityId}>
                  <div className="text-xs uppercase tracking-widest text-ember-300">
                    {c?.category ?? "Charity"}
                  </div>
                  <h3 className="font-semibold mt-1">{c?.name ?? "Unknown"}</h3>
                  <div className="mt-2 text-sm text-ink-300">
                    {t._count._all} subscriber{t._count._all === 1 ? "" : "s"} supporting
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

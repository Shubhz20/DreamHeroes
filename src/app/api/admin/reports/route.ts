import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { computeMonthlyPoolCents } from "@/lib/draw-engine";

export const GET = handle(async () => {
  await requireRole("ADMIN");

  const [
    totalUsers,
    totalActiveSubs,
    totalCanceledSubs,
    totalDraws,
    totalWinners,
    pendingVerification,
    subscriptionRevenue,
    donationTotal,
    charityContrib,
    settings,
    recentDraws,
    topCharities,
  ] = await Promise.all([
    db.user.count({ where: { role: "USER" } }),
    db.subscription.count({ where: { status: "ACTIVE" } }),
    db.subscription.count({ where: { status: "CANCELED" } }),
    db.draw.count({ where: { status: "PUBLISHED" } }),
    db.winner.count(),
    db.winner.count({ where: { verificationStatus: "PENDING" } }),
    db.payment.aggregate({ _sum: { amountCents: true }, where: { type: "SUBSCRIPTION" } }),
    db.payment.aggregate({ _sum: { amountCents: true }, where: { type: "DONATION" } }),
    db.user.aggregate({ _sum: { charityPct: true } }), // rough metric
    db.settings.findUnique({ where: { id: 1 } }),
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
  ]);

  // Compute charity contribution from subscription payments
  const subPayments = await db.payment.findMany({
    where: { type: "SUBSCRIPTION" },
    include: { user: true },
  });
  const contributedToCharity = subPayments.reduce((acc, p) => {
    return acc + Math.floor((p.amountCents * (p.user.charityPct ?? 10)) / 100);
  }, 0);

  const currentPoolPreview = await computeMonthlyPoolCents(settings?.prizePoolPct ?? 50);

  // Attach charity names to topCharities
  const topCharityIds = topCharities.map((t) => t.charityId).filter(Boolean) as string[];
  const charityRows = topCharityIds.length
    ? await db.charity.findMany({ where: { id: { in: topCharityIds } } })
    : [];
  const topCharitiesWithNames = topCharities.map((t) => ({
    charityId: t.charityId,
    name: charityRows.find((c) => c.id === t.charityId)?.name ?? "Unknown",
    subscriberCount: t._count._all,
  }));

  return ok({
    reports: {
      totalUsers,
      totalActiveSubs,
      totalCanceledSubs,
      totalDraws,
      totalWinners,
      pendingVerification,
      subscriptionRevenueCents: subscriptionRevenue._sum.amountCents ?? 0,
      donationTotalCents: donationTotal._sum.amountCents ?? 0,
      charityContributionCents: contributedToCharity,
      currentPoolPreviewCents: currentPoolPreview,
      averageCharityPct:
        totalUsers > 0 ? Math.round((charityContrib._sum.charityPct ?? 0) / totalUsers) : 0,
      recentDraws,
      topCharities: topCharitiesWithNames,
    },
  });
});

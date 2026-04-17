import { db } from "@/lib/db";
import AdminUsersClient from "./AdminUsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, charities] = await Promise.all([
    db.user.findMany({
      include: {
        subscription: true,
        charity: true,
        _count: { select: { scores: true, winners: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.charity.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <AdminUsersClient
      users={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        charityId: u.charityId,
        charityName: u.charity?.name ?? null,
        charityPct: u.charityPct,
        scoreCount: u._count.scores,
        winCount: u._count.winners,
        subscription: u.subscription && {
          plan: u.subscription.plan,
          status: u.subscription.status,
          priceCents: u.subscription.priceCents,
          currentPeriodEnd: u.subscription.currentPeriodEnd.toISOString(),
        },
        createdAt: u.createdAt.toISOString(),
      }))}
      charities={charities.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}

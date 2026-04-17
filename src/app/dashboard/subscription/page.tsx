import { db } from "@/lib/db";
import { getCurrentUser, isSubscriptionActive } from "@/lib/auth";
import SubscriptionClient from "./SubscriptionClient";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const user = (await getCurrentUser())!;
  const settings = (await db.settings.findUnique({ where: { id: 1 } })) ?? {
    monthlyPriceCents: 1500,
    yearlyPriceCents: 15000,
  };
  const payments = await db.payment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <SubscriptionClient
      subscription={
        user.subscription && {
          plan: user.subscription.plan,
          status: user.subscription.status,
          priceCents: user.subscription.priceCents,
          currentPeriodEnd: user.subscription.currentPeriodEnd.toISOString(),
          canceledAt: user.subscription.canceledAt?.toISOString() ?? null,
        }
      }
      active={isSubscriptionActive(user.subscription)}
      monthlyPriceCents={settings.monthlyPriceCents}
      yearlyPriceCents={settings.yearlyPriceCents}
      payments={payments.map((p) => ({
        id: p.id,
        type: p.type,
        amountCents: p.amountCents,
        note: p.note,
        createdAt: p.createdAt.toISOString(),
      }))}
    />
  );
}

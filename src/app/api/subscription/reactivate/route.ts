import { db } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { handle, ok, err } from "@/lib/api";

export const POST = handle(async () => {
  await requireRole("USER");
  const user = await getCurrentUser();
  if (!user?.subscription) return err("No subscription", 404);
  const periodDays = user.subscription.plan === "YEARLY" ? 365 : 30;
  const updated = await db.subscription.update({
    where: { id: user.subscription.id },
    data: {
      status: "ACTIVE",
      canceledAt: null,
      currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 3600_000),
    },
  });
  await db.payment.create({
    data: {
      userId: user.id,
      type: "SUBSCRIPTION",
      amountCents: user.subscription.priceCents,
      note: "Reactivation",
    },
  });
  return ok({ subscription: updated });
});

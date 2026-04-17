import { db } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { handle, ok, err } from "@/lib/api";

export const POST = handle(async () => {
  await requireRole("USER");
  const user = await getCurrentUser();
  if (!user?.subscription) return err("No subscription", 404);
  const updated = await db.subscription.update({
    where: { id: user.subscription.id },
    // CANCELED state still retains access until currentPeriodEnd.
    // A scheduled job would transition to LAPSED after that moment.
    data: { status: "CANCELED", canceledAt: new Date() },
  });
  return ok({ subscription: updated });
});

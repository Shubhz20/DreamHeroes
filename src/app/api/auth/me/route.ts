import { getCurrentUser, isSubscriptionActive } from "@/lib/auth";
import { handle, ok } from "@/lib/api";

export const GET = handle(async () => {
  const user = await getCurrentUser();
  if (!user) return ok(null);
  return ok({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    charityId: user.charityId,
    charityPct: user.charityPct,
    subscription: user.subscription,
    subscriptionActive: isSubscriptionActive(user.subscription),
  });
});

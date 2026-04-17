import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handle, ok, err } from "@/lib/api";

/** PATCH a user: name, role, charityId, charityPct, subscription fields. */
export const PATCH = handle(async (req: NextRequest, ctx: { params: { id: string } }) => {
  await requireRole("ADMIN");
  const body = await req.json();

  const allowed: any = {};
  if (typeof body.name === "string") allowed.name = body.name.trim();
  if (body.role === "USER" || body.role === "ADMIN") allowed.role = body.role;
  if (typeof body.charityId === "string" || body.charityId === null) allowed.charityId = body.charityId || null;
  if (typeof body.charityPct === "number") {
    if (body.charityPct < 10 || body.charityPct > 50) return err("charityPct must be 10..50", 400);
    allowed.charityPct = body.charityPct;
  }

  const user = await db.user.update({
    where: { id: ctx.params.id },
    data: allowed,
    include: { subscription: true, charity: true },
  });

  // Subscription mutations
  if (body.subscription) {
    const s = body.subscription;
    if (user.subscription) {
      await db.subscription.update({
        where: { id: user.subscription.id },
        data: {
          ...(s.plan && { plan: s.plan }),
          ...(s.status && { status: s.status }),
          ...(typeof s.priceCents === "number" && { priceCents: s.priceCents }),
          ...(s.currentPeriodEnd && { currentPeriodEnd: new Date(s.currentPeriodEnd) }),
        },
      });
    }
  }
  return ok({ user });
});

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handle, ok, err } from "@/lib/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PATCH a user: name, role, charityId, charityPct, subscription fields. */
export const PATCH = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireRole("ADMIN");
  const { id } = await ctx.params;
  const body = await req.json();

  const allowed: any = {};
  if (typeof body.name === "string") allowed.name = body.name.trim();
  if (body.role === "USER" || body.role === "ADMIN") allowed.role = body.role;
  if (typeof body.charityId === "string") {
    // Prevent FK violations / corrupt rows — verify the charity exists.
    const charity = await db.charity.findUnique({ where: { id: body.charityId } });
    if (!charity) return err("Charity not found", 400);
    allowed.charityId = body.charityId;
  } else if (body.charityId === null) {
    allowed.charityId = null;
  }
  if (typeof body.charityPct === "number") {
    if (body.charityPct < 10 || body.charityPct > 50) return err("charityPct must be 10..50", 400);
    allowed.charityPct = body.charityPct;
  }

  const user = await db.user.update({
    where: { id: id },
    data: allowed,
    include: { subscription: true, charity: true },
  });

  // Subscription mutations — validate enum-ish fields before writing so an
  // admin typo doesn't put the row into an unrecognized state.
  if (body.subscription) {
    const s = body.subscription;
    const ALLOWED_PLANS = ["MONTHLY", "YEARLY"] as const;
    const ALLOWED_STATUSES = ["ACTIVE", "PENDING", "CANCELED", "LAPSED"] as const;
    if (s.plan && !ALLOWED_PLANS.includes(s.plan)) {
      return err(`plan must be one of ${ALLOWED_PLANS.join(", ")}`, 400);
    }
    if (s.status && !ALLOWED_STATUSES.includes(s.status)) {
      return err(`status must be one of ${ALLOWED_STATUSES.join(", ")}`, 400);
    }
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

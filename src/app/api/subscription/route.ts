/**
 * PATCH /api/subscription — update user's charity choice or charity %.
 * POST  /api/subscription/cancel — cancel (keeps access until period end).
 * POST  /api/subscription/reactivate — reactivate a lapsed/canceled sub.
 * POST  /api/subscription/checkout — start a new subscription (mock or Stripe).
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { handle, ok, err } from "@/lib/api";
import { CharityChoiceSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PATCH = handle(async (req: NextRequest) => {
  await requireRole("USER");
  const user = await getCurrentUser();
  const data = CharityChoiceSchema.parse(await req.json());
  const charity = await db.charity.findUnique({ where: { id: data.charityId } });
  if (!charity || !charity.isActive) return err("Invalid charity", 400);
  const updated = await db.user.update({
    where: { id: user!.id },
    data: { charityId: data.charityId, charityPct: data.charityPct },
    include: { charity: true },
  });
  return ok({ user: updated });
});

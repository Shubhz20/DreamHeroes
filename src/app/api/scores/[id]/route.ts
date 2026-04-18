import { NextRequest } from "next/server";
import { requireRole, getCurrentUser, isSubscriptionActive } from "@/lib/auth";
import { updateScore, deleteScore } from "@/lib/scores";
import { handle, ok, err } from "@/lib/api";
import { ScoreUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PATCH = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireRole("USER");
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return err("Not signed in", 401);
  if (!isSubscriptionActive(user.subscription)) {
    return err("An active subscription is required to edit scores", 402);
  }
  const data = ScoreUpdateSchema.parse(await req.json());
  const updated = await updateScore(user.id, id, data);
  return ok({ score: updated });
});

export const DELETE = handle(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireRole("USER");
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return err("Not signed in", 401);
  if (!isSubscriptionActive(user.subscription)) {
    return err("An active subscription is required to delete scores", 402);
  }
  await deleteScore(user.id, id);
  return ok({});
});

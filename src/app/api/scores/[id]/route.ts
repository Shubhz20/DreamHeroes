import { NextRequest } from "next/server";
import { requireRole, getCurrentUser, isSubscriptionActive } from "@/lib/auth";
import { updateScore, deleteScore } from "@/lib/scores";
import { handle, ok, err } from "@/lib/api";
import { ScoreUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PATCH = handle(async (req: NextRequest, ctx: { params: { id: string } }) => {
  await requireRole("USER");
  const user = await getCurrentUser();
  if (!isSubscriptionActive(user!.subscription)) {
    return err("An active subscription is required to edit scores", 402);
  }
  const data = ScoreUpdateSchema.parse(await req.json());
  const updated = await updateScore(user!.id, ctx.params.id, data);
  return ok({ score: updated });
});

export const DELETE = handle(async (_req: NextRequest, ctx: { params: { id: string } }) => {
  await requireRole("USER");
  const user = await getCurrentUser();
  if (!isSubscriptionActive(user!.subscription)) {
    return err("An active subscription is required to delete scores", 402);
  }
  await deleteScore(user!.id, ctx.params.id);
  return ok({});
});

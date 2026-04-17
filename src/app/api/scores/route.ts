import { NextRequest } from "next/server";
import { requireRole, getCurrentUser, isSubscriptionActive } from "@/lib/auth";
import { addScore, getUserScores } from "@/lib/scores";
import { handle, ok, err } from "@/lib/api";
import { ScoreSchema } from "@/lib/validators";

export const GET = handle(async () => {
  await requireRole("USER");
  const user = await getCurrentUser();
  const scores = await getUserScores(user!.id);
  return ok({ scores });
});

export const POST = handle(async (req: NextRequest) => {
  await requireRole("USER");
  const user = await getCurrentUser();
  if (!isSubscriptionActive(user!.subscription)) {
    return err("An active subscription is required to log scores", 402);
  }
  const data = ScoreSchema.parse(await req.json());
  const created = await addScore(user!.id, data.value, data.playedAt);
  return ok({ score: created });
});

import { NextRequest } from "next/server";
import { requireRole, getCurrentUser, requireActiveSubscription } from "@/lib/auth";
import { addScore, getUserScores } from "@/lib/scores";
import { handle, ok } from "@/lib/api";
import { ScoreSchema } from "@/lib/validators";

export const GET = handle(async () => {
  await requireRole("USER");
  const user = await getCurrentUser();
  const scores = await getUserScores(user!.id);
  return ok({ scores });
});

/**
 * Logging scores requires an active subscription — `requireActiveSubscription`
 * both *reads* status from the DB and *writes back* a LAPSED transition
 * whenever it detects a stale ACTIVE row past its `currentPeriodEnd`.
 * That's our real-time subscription status check.
 */
export const POST = handle(async (req: NextRequest) => {
  const { session } = await requireActiveSubscription();
  const data = ScoreSchema.parse(await req.json());
  const created = await addScore(session.userId, data.value, data.playedAt);
  return ok({ score: created });
});

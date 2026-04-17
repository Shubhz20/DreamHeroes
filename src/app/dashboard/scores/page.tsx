import { getCurrentUser, isSubscriptionActive } from "@/lib/auth";
import { getUserScores } from "@/lib/scores";
import ScoresClient from "./ScoresClient";

export const dynamic = "force-dynamic";

export default async function ScoresPage() {
  const user = (await getCurrentUser())!;
  const active = isSubscriptionActive(user.subscription);
  const scores = await getUserScores(user.id);
  return (
    <ScoresClient
      initialScores={scores.map((s) => ({ id: s.id, value: s.value, playedAt: s.playedAt.toISOString() }))}
      canEdit={active}
    />
  );
}

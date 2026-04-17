import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import WinningsClient from "./WinningsClient";
import { parseWinningNumbers } from "@/lib/draw-engine";

export const dynamic = "force-dynamic";

export default async function WinningsPage() {
  const user = (await getCurrentUser())!;
  const winners = await db.winner.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { draw: true },
  });

  return (
    <WinningsClient
      winners={winners.map((w) => ({
        id: w.id,
        tier: w.tier,
        matchedCount: w.matchedCount,
        matchedNumbers: JSON.parse(w.matchedNumbers),
        scoresSnapshot: JSON.parse(w.scoresSnapshot),
        prizeCents: w.prizeCents,
        verificationStatus: w.verificationStatus,
        proofUrl: w.proofUrl,
        reviewNote: w.reviewNote,
        payoutStatus: w.payoutStatus,
        paidAt: w.paidAt?.toISOString() ?? null,
        drawMonth: w.draw.month,
        drawYear: w.draw.year,
        drawNumbers: parseWinningNumbers(w.draw.winningNumbers),
      }))}
    />
  );
}

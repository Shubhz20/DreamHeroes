import { db } from "@/lib/db";
import AdminWinnersClient from "./AdminWinnersClient";
import { parseWinningNumbers } from "@/lib/draw-engine";

export const dynamic = "force-dynamic";

export default async function AdminWinnersPage() {
  const winners = await db.winner.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      draw: true,
    },
    orderBy: [{ createdAt: "desc" }],
    take: 500,
  });

  return (
    <AdminWinnersClient
      winners={winners.map((w) => ({
        id: w.id,
        tier: w.tier,
        matchedCount: w.matchedCount,
        matchedNumbers: (() => {
          try {
            return JSON.parse(w.matchedNumbers) as number[];
          } catch {
            return [];
          }
        })(),
        scoresSnapshot: (() => {
          try {
            return JSON.parse(w.scoresSnapshot) as number[];
          } catch {
            return [];
          }
        })(),
        prizeCents: w.prizeCents,
        verificationStatus: w.verificationStatus,
        payoutStatus: w.payoutStatus,
        reviewNote: w.reviewNote,
        proofUrl: w.proofUrl,
        reviewedAt: w.reviewedAt?.toISOString() ?? null,
        paidAt: w.paidAt?.toISOString() ?? null,
        createdAt: w.createdAt.toISOString(),
        user: {
          id: w.user.id,
          name: w.user.name,
          email: w.user.email,
        },
        draw: {
          id: w.draw.id,
          month: w.draw.month,
          year: w.draw.year,
          winningNumbers: parseWinningNumbers(w.draw.winningNumbers),
          algorithm: w.draw.algorithm,
        },
      }))}
    />
  );
}

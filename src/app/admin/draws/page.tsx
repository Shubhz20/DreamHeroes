import { db } from "@/lib/db";
import DrawsClient from "./DrawsClient";
import { parseWinningNumbers } from "@/lib/draw-engine";

export const dynamic = "force-dynamic";

export default async function AdminDrawsPage() {
  const draws = await db.draw.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { _count: { select: { winners: true } } },
    take: 36,
  });

  const now = new Date();
  return (
    <DrawsClient
      defaultMonth={now.getUTCMonth() + 1}
      defaultYear={now.getUTCFullYear()}
      draws={draws.map((d) => ({
        id: d.id,
        month: d.month,
        year: d.year,
        algorithm: d.algorithm,
        status: d.status,
        winningNumbers: parseWinningNumbers(d.winningNumbers),
        poolTotalCents: d.poolTotalCents,
        pool5Cents: d.pool5Cents,
        pool4Cents: d.pool4Cents,
        pool3Cents: d.pool3Cents,
        jackpotCarry: d.jackpotCarry,
        publishedAt: d.publishedAt?.toISOString() ?? null,
        winnerCount: d._count.winners,
      }))}
    />
  );
}

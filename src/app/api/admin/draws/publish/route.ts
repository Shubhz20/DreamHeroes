import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { simulate, publish } from "@/lib/draw-engine";
import { DrawRunSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { formatMoney, formatMonthYear } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/draws/publish — run a fresh simulation (or re-use one
 * supplied by the client) and persist it as the canonical draw for the
 * month. Idempotent up to the point of publication; after that,
 * republishing is refused by the engine.
 */
export const POST = handle(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const data = DrawRunSchema.parse(await req.json());
  const sim = await simulate(data.month, data.year, data.algorithm, {
    winningNumbers: data.winningNumbers,
  });
  const draw = await publish(sim);

  // Notify winners (stubbed — logs to console by default).
  const winners = await db.winner.findMany({
    where: { drawId: draw.id },
    include: { user: true },
  });
  for (const w of winners) {
    await sendEmail({
      to: w.user.email,
      subject: `You matched ${w.matchedCount} in the ${formatMonthYear(draw.month, draw.year)} draw!`,
      body: `Hi ${w.user.name},\n\nYour last five scores matched ${w.matchedCount} winning numbers. Provisional prize: ${formatMoney(
        w.prizeCents
      )}.\n\nHead to /dashboard/winnings and upload proof from your golf platform to complete verification.\n\n— Heroic`,
    });
  }

  return ok({ draw, winnerCount: winners.length });
});

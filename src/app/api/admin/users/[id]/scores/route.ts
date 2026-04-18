/**
 * Admin: list/create/update/delete a user's scores.
 * Uses the same underlying helpers as the user self-service routes so all
 * invariants (range, rolling-5, unique-per-date) are enforced identically.
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { addScore } from "@/lib/scores";
import { handle, ok } from "@/lib/api";
import { ScoreSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  await requireRole("ADMIN");
  const { id } = await ctx.params;
  const scores = await db.score.findMany({
    where: { userId: id },
    orderBy: { playedAt: "desc" },
  });
  return ok({ scores });
});

export const POST = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireRole("ADMIN");
  const { id } = await ctx.params;
  const data = ScoreSchema.parse(await req.json());
  const created = await addScore(id, data.value, data.playedAt);
  return ok({ score: created });
});

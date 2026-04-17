import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { simulate } from "@/lib/draw-engine";
import { DrawRunSchema } from "@/lib/validators";

/** POST /api/admin/draws/simulate — dry-run a draw (no persistence). */
export const POST = handle(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const data = DrawRunSchema.parse(await req.json());
  const result = await simulate(data.month, data.year, data.algorithm, {
    winningNumbers: data.winningNumbers,
  });
  return ok({ simulation: result });
});

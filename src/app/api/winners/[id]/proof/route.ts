/**
 * POST /api/winners/:id/proof
 * Winner uploads a proof-of-score URL (e.g. link to screenshot from the
 * external golf platform). In production you'd accept a direct image
 * upload and host to S3 / Supabase Storage; we keep the interface minimal.
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { handle, ok, err } from "@/lib/api";
import { WinnerProofSchema } from "@/lib/validators";

export const POST = handle(async (req: NextRequest, ctx: { params: { id: string } }) => {
  await requireRole("USER");
  const user = await getCurrentUser();
  const body = WinnerProofSchema.parse(await req.json());
  const winner = await db.winner.findFirst({
    where: { id: ctx.params.id, userId: user!.id },
  });
  if (!winner) return err("Not found", 404);
  if (winner.verificationStatus === "APPROVED") {
    return err("Already approved — proof locked", 409);
  }
  const updated = await db.winner.update({
    where: { id: winner.id },
    data: { proofUrl: body.proofUrl, verificationStatus: "PENDING" },
  });
  return ok({ winner: updated });
});

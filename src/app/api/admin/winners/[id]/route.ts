import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handle, ok, err } from "@/lib/api";
import { WinnerVerifySchema } from "@/lib/validators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PATCH /api/admin/winners/:id
 *   body: { verificationStatus: APPROVED|REJECTED, reviewNote? }
 *   OR:   { payoutStatus: PAID }
 *   OR:   both
 */
export const PATCH = handle(async (req: NextRequest, ctx: { params: { id: string } }) => {
  await requireRole("ADMIN");
  const body = await req.json();

  const data: any = { reviewedAt: new Date() };

  if (body.verificationStatus) {
    const v = WinnerVerifySchema.parse({
      verificationStatus: body.verificationStatus,
      reviewNote: body.reviewNote,
    });
    data.verificationStatus = v.verificationStatus;
    data.reviewNote = v.reviewNote ?? null;
  }

  if (body.payoutStatus === "PAID") {
    const existing = await db.winner.findUnique({ where: { id: ctx.params.id } });
    if (!existing) return err("Winner not found", 404);
    if (existing.verificationStatus !== "APPROVED") {
      return err("Cannot mark paid until winner is APPROVED", 409);
    }
    data.payoutStatus = "PAID";
    data.paidAt = new Date();
  }

  const updated = await db.winner.update({
    where: { id: ctx.params.id },
    data,
  });
  return ok({ winner: updated });
});

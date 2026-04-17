/** Independent donation (not tied to gameplay). */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { handle, ok, err } from "@/lib/api";
import { DonationSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = handle(async (req: NextRequest) => {
  await requireRole("USER");
  const user = await getCurrentUser();
  const data = DonationSchema.parse(await req.json());
  const charity = await db.charity.findUnique({ where: { id: data.charityId } });
  if (!charity || !charity.isActive) return err("Charity not found", 400);

  const donation = await db.$transaction(async (tx) => {
    const d = await tx.donation.create({
      data: {
        userId: user!.id,
        charityId: data.charityId,
        amountCents: data.amountCents,
        note: data.note,
      },
    });
    await tx.payment.create({
      data: {
        userId: user!.id,
        type: "DONATION",
        amountCents: data.amountCents,
        note: `Donation to ${charity.name}`,
      },
    });
    return d;
  });

  return ok({ donation });
});

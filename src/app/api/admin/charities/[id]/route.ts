import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { AdminCharitySchema } from "@/lib/validators";

export const PATCH = handle(async (req: NextRequest, ctx: { params: { id: string } }) => {
  await requireRole("ADMIN");
  const data = AdminCharitySchema.partial().parse(await req.json());
  const updated = await db.charity.update({ where: { id: ctx.params.id }, data });
  return ok({ charity: updated });
});

export const DELETE = handle(async (_req, ctx: { params: { id: string } }) => {
  await requireRole("ADMIN");
  // Soft delete (preserves historical links to users/donations).
  const updated = await db.charity.update({
    where: { id: ctx.params.id },
    data: { isActive: false, isFeatured: false },
  });
  return ok({ charity: updated });
});

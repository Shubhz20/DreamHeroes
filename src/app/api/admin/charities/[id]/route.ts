import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { AdminCharitySchema } from "@/lib/validators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PATCH = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireRole("ADMIN");
  const { id } = await ctx.params;
  const data = AdminCharitySchema.partial().parse(await req.json());
  const updated = await db.charity.update({ where: { id }, data });
  return ok({ charity: updated });
});

export const DELETE = handle(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  await requireRole("ADMIN");
  const { id } = await ctx.params;
  // Soft delete (preserves historical links to users/donations).
  const updated = await db.charity.update({
    where: { id },
    data: { isActive: false, isFeatured: false },
  });
  return ok({ charity: updated });
});

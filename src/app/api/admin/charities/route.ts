import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";
import { AdminCharitySchema } from "@/lib/validators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle(async () => {
  await requireRole("ADMIN");
  const charities = await db.charity.findMany({
    orderBy: [{ isActive: "desc" }, { isFeatured: "desc" }, { name: "asc" }],
    include: { _count: { select: { users: true, events: true } } },
  });
  return ok({ charities });
});

export const POST = handle(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const data = AdminCharitySchema.parse(await req.json());
  const created = await db.charity.create({ data });
  return ok({ charity: created });
});

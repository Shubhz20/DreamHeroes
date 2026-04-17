import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";

export const GET = handle(async () => {
  await requireRole("ADMIN");
  const draws = await db.draw.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { _count: { select: { winners: true } } },
  });
  return ok({ draws });
});

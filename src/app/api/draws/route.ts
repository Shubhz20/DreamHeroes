/** Public — list published draws. Used by the dashboard + marketing pages. */
import { db } from "@/lib/db";
import { handle, ok } from "@/lib/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle(async () => {
  const draws = await db.draw.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 24,
    include: { _count: { select: { winners: true } } },
  });
  return ok({ draws });
});

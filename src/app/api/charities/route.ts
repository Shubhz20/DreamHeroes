import { db } from "@/lib/db";
import { handle, ok } from "@/lib/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public charity directory endpoint. */
export const GET = handle(async () => {
  const charities = await db.charity.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
  });
  return ok({ charities });
});

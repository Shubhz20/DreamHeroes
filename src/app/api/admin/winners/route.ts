import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handle, ok } from "@/lib/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const winners = await db.winner.findMany({
    where: status ? { verificationStatus: status } : undefined,
    include: { user: true, draw: true },
    orderBy: [{ createdAt: "desc" }],
    take: 500,
  });
  return ok({ winners });
});

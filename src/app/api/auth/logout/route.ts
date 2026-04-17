/**
 * Sign out.
 *
 * The cookie is cleared *on the redirect response itself* rather than via
 * `cookies().delete()` — in a Route Handler that returns a separate
 * `NextResponse.redirect()`, a mutation on the implicit `cookies()` store is
 * not attached to the redirect response, so the browser follows the 303 with
 * the session cookie still intact. Attaching `response.cookies.set()` to the
 * returned NextResponse is the canonical fix.
 *
 * We also mark the route explicitly dynamic + node runtime so Next.js doesn't
 * try to collect page data for it at build time.
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SESSION_COOKIE = "session";

function buildRedirect(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const res = NextResponse.redirect(new URL("/", base), { status: 303 });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function POST(req: NextRequest) {
  return buildRedirect(req);
}

export async function GET(req: NextRequest) {
  return buildRedirect(req);
}

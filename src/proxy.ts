/**
 * Edge proxy (formerly middleware in Next < 16) — protects /dashboard and
 * /admin routes.
 *
 * We only verify the JWT signature here (no DB calls — proxy runs on the
 * edge where Prisma isn't available). Deeper "is-this-role" + "is-this
 * -subscription-still-active" checks happen in the page components via
 * getCurrentUser() from /src/lib/auth.ts.
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_LOGIN = "/login";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const protectedPrefix = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  if (!protectedPrefix) return NextResponse.next();

  const token = req.cookies.get("session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = PUBLIC_LOGIN;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
    const { payload } = await jwtVerify(token, secret);
    if (pathname.startsWith("/admin") && payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = PUBLIC_LOGIN;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};

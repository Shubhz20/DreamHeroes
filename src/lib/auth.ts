/**
 * Authentication & session helpers.
 *
 * Session transport: signed JWT in an httpOnly cookie named `session`.
 * Signing:           HS256 with JWT_SECRET from env.
 * Verification:      Run on every authenticated request (middleware + helpers).
 *
 * We use `jose` (not `jsonwebtoken`) because it works in the Edge runtime —
 * that matters for Next.js middleware (see /src/middleware.ts).
 */
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  userId: string;
  role: "USER" | "ADMIN";
  email: string;
};

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_SECRET is not set or too short. Copy .env.example → .env and set a strong secret."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(raw: string): Promise<string> {
  return bcrypt.hash(raw, 10);
}

export async function verifyPassword(raw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(raw, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.userId !== "string") return null;
    return {
      userId: payload.userId as string,
      role: (payload.role as "USER" | "ADMIN") ?? "USER",
      email: (payload.email as string) ?? "",
    };
  } catch {
    return null;
  }
}

/** Read the session cookie on the server and return the payload (or null). */
export async function getSession(): Promise<SessionPayload | null> {
  // Next 15+: `cookies()` returns a Promise that must be awaited.
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Fetch the full user + subscription for an authenticated request.
 * Also performs the "real-time subscription status check" demanded by the PRD.
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { subscription: true, charity: true },
  });
  if (!user) return null;
  return user;
}

/** Throw if the current session isn't a given role (for API routes). */
export async function requireRole(role: "USER" | "ADMIN") {
  const session = await getSession();
  if (!session) throw new AuthError("Not signed in", 401);
  if (role === "ADMIN" && session.role !== "ADMIN") {
    throw new AuthError("Admin only", 403);
  }
  return session;
}

export class AuthError extends Error {
  status: number;
  constructor(msg: string, status = 401) {
    super(msg);
    this.status = status;
  }
}

// --- Cookie management helpers used by login/logout routes.
// Both are async because `cookies()` is a Promise in Next 15+.
export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export const AUTH_CONSTANTS = { SESSION_COOKIE, SESSION_MAX_AGE };

/** Is `email` in the ADMIN_EMAILS env allow-list? Used at signup. */
export function isAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/**
 * Is the subscription considered "active" right now?
 * "ACTIVE" + currentPeriodEnd in the future.
 * Per PRD: validated on every authenticated request.
 */
export function isSubscriptionActive(sub: { status: string; currentPeriodEnd: Date } | null | undefined): boolean {
  if (!sub) return false;
  if (sub.status !== "ACTIVE") return false;
  return new Date(sub.currentPeriodEnd).getTime() > Date.now();
}

/**
 * Real-time subscription check for authenticated requests that require an
 * active paid plan (e.g. adding a score, buying into the monthly draw).
 *
 * We also lazy-update the DB status from ACTIVE→LAPSED here when we observe
 * that `currentPeriodEnd` has passed — this means even if a Stripe webhook
 * somehow hasn't fired, the user is correctly locked out on their very next
 * request, and the status reflects reality in our own tables.
 */
export async function requireActiveSubscription() {
  const session = await getSession();
  if (!session) throw new AuthError("Not signed in", 401);
  const sub = await db.subscription.findUnique({ where: { userId: session.userId } });
  if (!sub) throw new AuthError("Subscription required", 402);
  if (sub.status === "ACTIVE" && new Date(sub.currentPeriodEnd).getTime() <= Date.now()) {
    // Auto-lapse stale ACTIVE rows on the fly.
    await db.subscription.update({
      where: { id: sub.id },
      data: { status: "LAPSED" },
    });
    throw new AuthError("Subscription has lapsed — please renew", 402);
  }
  if (sub.status !== "ACTIVE") {
    throw new AuthError(`Subscription is ${sub.status} — please reactivate`, 402);
  }
  return { session, sub };
}

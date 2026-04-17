import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

/**
 * Top navigation. Server-rendered so the "Dashboard" link auto-appears for
 * signed-in users — no client-side flicker.
 */
export default async function Nav({ variant = "public" }: { variant?: "public" | "dashboard" | "admin" }) {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-ink-950/70 border-b border-ink-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-ember-400 to-rose-500 grid place-items-center text-ink-950 font-display text-lg italic group-hover:scale-105 transition-transform">
            H
          </span>
          <span className="font-display italic text-xl">Heroic</span>
        </Link>

        {variant === "public" && (
          <nav className="hidden md:flex items-center gap-7 text-sm text-ink-200">
            <Link href="/how-it-works" className="hover:text-white transition-colors">How it works</Link>
            <Link href="/charities" className="hover:text-white transition-colors">Charities</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          </nav>
        )}

        {variant === "dashboard" && (
          <nav className="hidden md:flex items-center gap-6 text-sm text-ink-200">
            <Link href="/dashboard" className="hover:text-white">Overview</Link>
            <Link href="/dashboard/scores" className="hover:text-white">Scores</Link>
            <Link href="/dashboard/charity" className="hover:text-white">Charity</Link>
            <Link href="/dashboard/subscription" className="hover:text-white">Subscription</Link>
            <Link href="/dashboard/winnings" className="hover:text-white">Winnings</Link>
          </nav>
        )}

        {variant === "admin" && (
          <nav className="hidden md:flex items-center gap-6 text-sm text-ink-200">
            <Link href="/admin" className="hover:text-white">Reports</Link>
            <Link href="/admin/users" className="hover:text-white">Users</Link>
            <Link href="/admin/draws" className="hover:text-white">Draws</Link>
            <Link href="/admin/charities" className="hover:text-white">Charities</Link>
            <Link href="/admin/winners" className="hover:text-white">Winners</Link>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {!user && (
            <>
              <Link href="/login" className="text-sm text-ink-200 hover:text-white">Log in</Link>
              <Link
                href="/signup"
                className="text-sm px-4 py-2 rounded-full bg-gradient-to-br from-ember-400 to-rose-500 text-ink-950 font-semibold hover:brightness-110 transition"
              >
                Start — $15/mo
              </Link>
            </>
          )}
          {user && (
            <div className="flex items-center gap-3">
              {isAdmin && variant !== "admin" && (
                <Link href="/admin" className="text-xs px-3 py-1.5 rounded-full border border-ember-500/40 text-ember-300 hover:bg-ember-500/10">
                  Admin
                </Link>
              )}
              {variant !== "dashboard" && (
                <Link href="/dashboard" className="text-sm px-4 py-2 rounded-full bg-ink-800 hover:bg-ink-700 transition">
                  Dashboard
                </Link>
              )}
              <form action="/api/auth/logout" method="POST">
                <button className="text-sm text-ink-300 hover:text-white">Sign out</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

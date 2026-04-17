import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-ink-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-ember-400 to-rose-500 grid place-items-center text-ink-950 font-display text-lg italic">H</span>
            <span className="font-display italic text-xl">Heroic</span>
          </div>
          <p className="text-ink-300 leading-relaxed">
            Play golf. Back causes. Win together.
          </p>
        </div>
        <div>
          <h5 className="font-medium mb-3">Platform</h5>
          <ul className="space-y-2 text-ink-300">
            <li><Link href="/how-it-works" className="hover:text-white">How it works</Link></li>
            <li><Link href="/charities" className="hover:text-white">Charities</Link></li>
            <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="font-medium mb-3">Account</h5>
          <ul className="space-y-2 text-ink-300">
            <li><Link href="/login" className="hover:text-white">Sign in</Link></li>
            <li><Link href="/signup" className="hover:text-white">Start subscription</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="font-medium mb-3">Trust</h5>
          <ul className="space-y-2 text-ink-300">
            <li>Stripe-secured payments</li>
            <li>HTTPS & JWT sessions</li>
            <li>Transparent pool splits</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-800/60 py-6 text-xs text-ink-400 text-center">
        © {new Date().getFullYear()} Heroic — a Digital Heroes concept build. All logos are sample content.
      </div>
    </footer>
  );
}

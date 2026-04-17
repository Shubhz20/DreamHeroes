import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import LoginForm from "./LoginForm";
import { Card } from "@/components/ui";
import Link from "next/link";

export const metadata = { title: "Sign in · Heroic" };

export default function LoginPage() {
  return (
    <>
      <Nav />
      <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <Card>
            <h1 className="font-display italic text-3xl text-center">Welcome back.</h1>
            <p className="text-center text-ink-300 text-sm mt-1 mb-6">
              Sign in to log scores and check your draw status.
            </p>
            <LoginForm />
            <p className="text-center text-sm text-ink-300 mt-6">
              No account yet? <Link href="/signup" className="text-ember-300 hover:text-ember-200">Start one</Link>
            </p>
            <div className="mt-6 text-[11px] text-center text-ink-500 border-t border-ink-800 pt-4">
              Demo: <span className="text-ink-300">alex@player.test / Player123!</span> · <span className="text-ink-300">admin@digitalheroes.test / Admin123!</span>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}

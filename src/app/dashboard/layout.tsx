import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { getCurrentUser, isSubscriptionActive } from "@/lib/auth";
import Link from "next/link";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const active = isSubscriptionActive(user.subscription);

  return (
    <>
      <Nav variant="dashboard" />
      {!active && (
        <div className="bg-rose-500/10 border-y border-rose-500/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 text-sm text-rose-200 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Your subscription isn't active — gameplay features are read-only.</span>
            <Link href="/dashboard/subscription" className="text-rose-100 underline">
              Reactivate →
            </Link>
          </div>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
      <Footer />
    </>
  );
}

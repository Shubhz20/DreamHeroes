import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";

// Same reason as the dashboard layout — this layout hits Prisma on every
// request so it must be marked dynamic, otherwise Vercel's collectPageData
// step fails during build.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <>
      <Nav variant="admin" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
      <Footer />
    </>
  );
}

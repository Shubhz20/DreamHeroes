import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";

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

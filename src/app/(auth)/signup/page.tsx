import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SignupForm from "./SignupForm";
import { db } from "@/lib/db";

export const metadata = { title: "Create your account · Heroic" };
export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: { plan?: string; charity?: string };
}) {
  const charities = await db.charity.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
  });
  const settings = (await db.settings.findUnique({ where: { id: 1 } })) ?? {
    monthlyPriceCents: 1500,
    yearlyPriceCents: 15000,
  };

  return (
    <>
      <Nav />
      <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="font-display italic text-4xl md:text-5xl">Welcome to the club.</h1>
            <p className="text-ink-300 mt-2">
              Pick a plan and a cause. You can adjust either later.
            </p>
          </div>
          <SignupForm
            charities={charities.map((c) => ({
              id: c.id,
              slug: c.slug,
              name: c.name,
              tagline: c.tagline,
              imageUrl: c.imageUrl,
            }))}
            defaultPlan={(searchParams.plan as any) === "YEARLY" ? "YEARLY" : "MONTHLY"}
            defaultCharitySlug={searchParams.charity}
            monthlyPriceCents={settings.monthlyPriceCents}
            yearlyPriceCents={settings.yearlyPriceCents}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

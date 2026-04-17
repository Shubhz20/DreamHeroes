import Link from "next/link";
import Image from "next/image";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Card, Badge } from "@/components/ui";
import { db } from "@/lib/db";

export const metadata = { title: "Charities · Heroic" };
export const dynamic = "force-dynamic";

export default async function CharitiesPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const category = (searchParams.category ?? "").trim();

  const all = await db.charity.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
  });
  const categories = Array.from(new Set(all.map((c) => c.category))).sort();

  const filtered = all.filter((c) => {
    const matchesQ = !q || [c.name, c.tagline, c.description].join(" ").toLowerCase().includes(q.toLowerCase());
    const matchesCat = !category || c.category === category;
    return matchesQ && matchesCat;
  });

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-12 text-center">
          <span className="text-ember-400 text-sm font-medium tracking-widest uppercase">Causes</span>
          <h1 className="mt-2 font-display italic text-5xl md:text-6xl">Pick your corner of the world.</h1>
          <p className="mt-3 text-ink-300 max-w-xl mx-auto">
            Choose any cause at sign-up. Your 10%+ goes directly to them. Change it any time from the dashboard.
          </p>
        </div>

        <form className="mb-10 flex flex-col sm:flex-row gap-3 items-stretch">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search charities..."
            className="flex-1 px-4 py-3 rounded-xl bg-ink-900 border border-ink-700 focus:border-ember-400 focus:outline-none"
          />
          <select
            name="category"
            defaultValue={category}
            className="px-4 py-3 rounded-xl bg-ink-900 border border-ink-700 focus:border-ember-400 focus:outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button className="px-5 py-3 rounded-xl bg-gradient-to-br from-ember-400 to-rose-500 text-ink-950 font-semibold">
            Filter
          </button>
        </form>

        {filtered.length === 0 ? (
          <Card className="text-center py-16">
            <p className="font-display italic text-2xl">Nothing matched your filter.</p>
            <p className="text-sm text-ink-300 mt-2">Try a broader search or clear the filter.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((c) => (
              <Link key={c.id} href={`/charities/${c.slug}`} className="group">
                <Card className="h-full overflow-hidden hover:-translate-y-1 transition-transform">
                  <div className="relative -mx-6 -mt-6 h-44 mb-4 overflow-hidden">
                    <Image
                      src={c.imageUrl}
                      alt={c.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {c.isFeatured && (
                      <div className="absolute top-3 left-3">
                        <Badge tone="accent">Featured</Badge>
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] uppercase tracking-widest text-ember-300 mb-1">{c.category}</div>
                  <h2 className="text-xl font-semibold">{c.name}</h2>
                  <p className="text-sm text-ink-300 mt-1">{c.tagline}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

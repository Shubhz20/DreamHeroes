import Image from "next/image";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Card, Badge, Button } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Charity detail page. Identified by slug (`params.id` — naming matches the
 * PRD's `[id]` convention but we treat it as the slug for URL friendliness).
 */
export default async function CharityDetail({ params }: { params: { id: string } }) {
  const charity = await db.charity.findFirst({
    where: { OR: [{ slug: params.id }, { id: params.id }], isActive: true },
    include: { events: { orderBy: { date: "asc" } } },
  });
  if (!charity) notFound();

  const hero = charity.heroImageUrl ?? charity.imageUrl;

  return (
    <>
      <Nav />
      <main>
        <section className="relative h-[50vh] min-h-[400px]">
          <Image src={hero} alt={charity.name} fill className="object-cover" sizes="100vw" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
          <div className="absolute bottom-0 w-full">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-10">
              <Badge tone="accent">{charity.category}</Badge>
              <h1 className="mt-3 font-display italic text-4xl md:text-6xl leading-tight">{charity.name}</h1>
              <p className="mt-2 text-ink-200 text-lg md:text-xl max-w-2xl">{charity.tagline}</p>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <h2 className="font-display italic text-3xl">About</h2>
            <p className="text-ink-200 leading-relaxed whitespace-pre-line">{charity.description}</p>

            {charity.events.length > 0 && (
              <div className="mt-10">
                <h3 className="font-display italic text-2xl mb-4">Upcoming events</h3>
                <div className="space-y-3">
                  {charity.events.map((e) => (
                    <Card key={e.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-ember-300 text-sm">{formatDate(e.date)}</div>
                          <h4 className="text-lg font-semibold mt-1">{e.title}</h4>
                          <p className="text-sm text-ink-300 mt-1">{e.description}</p>
                        </div>
                        {e.location && <Badge>{e.location}</Badge>}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
          <aside className="md:col-span-1">
            <Card shimmer>
              <div className="text-xs uppercase tracking-widest text-ember-300">Support this cause</div>
              <h3 className="font-display italic text-2xl mt-2">Start a subscription</h3>
              <p className="text-sm text-ink-300 mt-2">
                Choose <strong>{charity.name}</strong> as your recipient at sign-up. Minimum 10% of every month's fee flows straight here.
              </p>
              <div className="mt-5 space-y-3">
                <Button as="link" href={`/signup?charity=${charity.slug}`} size="md" className="w-full">
                  Subscribe & support
                </Button>
                <Button as="link" href={`/dashboard/charity?donate=${charity.slug}`} size="md" variant="secondary" className="w-full">
                  One-time donation
                </Button>
              </div>
            </Card>
          </aside>
        </section>
      </main>
      <Footer />
    </>
  );
}

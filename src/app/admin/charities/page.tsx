import { db } from "@/lib/db";
import CharitiesClient from "./CharitiesClient";

export const dynamic = "force-dynamic";

export default async function AdminCharitiesPage() {
  const charities = await db.charity.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { users: true, events: true } } },
  });
  return (
    <CharitiesClient
      charities={charities.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        tagline: c.tagline,
        description: c.description,
        imageUrl: c.imageUrl,
        heroImageUrl: c.heroImageUrl,
        category: c.category,
        isActive: c.isActive,
        isFeatured: c.isFeatured,
        subscribers: c._count.users,
        events: c._count.events,
      }))}
    />
  );
}

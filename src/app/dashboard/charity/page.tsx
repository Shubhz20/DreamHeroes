import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import CharityClient from "./CharityClient";

export const dynamic = "force-dynamic";

export default async function CharityPage() {
  const user = (await getCurrentUser())!;
  const charities = await db.charity.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
  });
  const myDonations = await db.donation.findMany({
    where: { userId: user.id },
    include: { charity: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return (
    <CharityClient
      user={{
        charityId: user.charityId,
        charityPct: user.charityPct,
        subscription: user.subscription && {
          priceCents: user.subscription.priceCents,
          plan: user.subscription.plan,
        },
      }}
      charities={charities.map((c) => ({
        id: c.id,
        name: c.name,
        tagline: c.tagline,
        imageUrl: c.imageUrl,
      }))}
      donations={myDonations.map((d) => ({
        id: d.id,
        charityName: d.charity.name,
        amountCents: d.amountCents,
        createdAt: d.createdAt.toISOString(),
      }))}
    />
  );
}

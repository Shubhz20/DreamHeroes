/**
 * Seed script — creates a predictable dataset so reviewers can log in and
 * exercise every surface of the platform immediately after install.
 *
 *   Admin:      admin@digitalheroes.test / Admin123!
 *   Subscriber: alex@player.test        / Player123!
 *   New-user:   (sign up freely on /signup)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // --- Settings singleton
  await db.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  // --- Charities
  const charitiesData = [
    {
      slug: "ocean-horizon",
      name: "Ocean Horizon",
      tagline: "Clean oceans for every tomorrow",
      description:
        "Ocean Horizon funds coastal cleanups, plastic-recovery research, and community-led marine restoration projects in eleven countries. Every dollar helps remove one kilo of plastic from coastlines.",
      imageUrl:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop",
      heroImageUrl:
        "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1600&auto=format&fit=crop",
      category: "Environment",
      isFeatured: true,
    },
    {
      slug: "second-swing",
      name: "Second Swing",
      tagline: "Golf equipment for underserved juniors",
      description:
        "Second Swing collects, refurbishes, and distributes golf equipment to junior programmes in communities that historically lack access to the sport — because potential should never be priced out.",
      imageUrl:
        "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&auto=format&fit=crop",
      category: "Youth & Sport",
      isFeatured: true,
    },
    {
      slug: "hearts-for-homes",
      name: "Hearts for Homes",
      tagline: "Shelter is not optional",
      description:
        "Hearts for Homes builds transitional housing for families emerging from crisis, pairing every unit with wrap-around services: childcare, training, healthcare.",
      imageUrl:
        "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop",
      category: "Housing",
    },
    {
      slug: "bright-minds-fund",
      name: "Bright Minds Fund",
      tagline: "Books, laptops, tuition — zero barriers",
      description:
        "Bright Minds sponsors full-ride academic scholarships and open-source learning kits for students aged 12–22 in eight cities.",
      imageUrl:
        "https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800&auto=format&fit=crop",
      category: "Education",
    },
    {
      slug: "pawsitive-futures",
      name: "Pawsitive Futures",
      tagline: "Every rescue deserves a second round",
      description:
        "A no-kill shelter network providing veterinary care, rehabilitation, and lifetime placement for abandoned animals.",
      imageUrl:
        "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&auto=format&fit=crop",
      category: "Animals",
    },
    {
      slug: "swing-for-veterans",
      name: "Swing for Veterans",
      tagline: "Golf as therapy, community as medicine",
      description:
        "Veterans transitioning out of active service receive peer-led golf and mindfulness programmes proven to reduce PTSD symptoms.",
      imageUrl:
        "https://images.unsplash.com/photo-1541872703-74c5e44368f4?w=800&auto=format&fit=crop",
      category: "Veterans",
    },
  ];

  for (const c of charitiesData) {
    await db.charity.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
  }

  // Add a couple of upcoming events to the featured charities.
  const ocean = await db.charity.findUnique({ where: { slug: "ocean-horizon" } });
  const second = await db.charity.findUnique({ where: { slug: "second-swing" } });
  if (ocean) {
    const exists = await db.charityEvent.findFirst({ where: { charityId: ocean.id } });
    if (!exists) {
      await db.charityEvent.createMany({
        data: [
          {
            charityId: ocean.id,
            title: "Spring Charity Golf Day — Goa",
            description: "18 holes + silent auction. All proceeds support reef restoration.",
            date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
            location: "Lalit Golf & Spa Resort, Goa",
          },
          {
            charityId: ocean.id,
            title: "Coastline Cleanup Weekend",
            description: "Volunteer event — bring family, gear provided.",
            date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
            location: "Juhu Beach, Mumbai",
          },
        ],
      });
    }
  }
  if (second) {
    const exists = await db.charityEvent.findFirst({ where: { charityId: second.id } });
    if (!exists) {
      await db.charityEvent.create({
        data: {
          charityId: second.id,
          title: "Junior Pro-Am Fundraiser",
          description: "Play alongside junior ambassadors; proceeds fund 500 new starter kits.",
          date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          location: "DLF Golf & Country Club, Gurugram",
        },
      });
    }
  }

  // --- Admin user
  const adminPass = await bcrypt.hash("Admin123!", 10);
  await db.user.upsert({
    where: { email: "admin@digitalheroes.test" },
    update: {},
    create: {
      email: "admin@digitalheroes.test",
      passwordHash: adminPass,
      name: "Platform Admin",
      role: "ADMIN",
      charityId: ocean?.id,
      charityPct: 10,
    },
  });

  // --- Demo subscriber with active subscription + 5 scores
  const playerPass = await bcrypt.hash("Player123!", 10);
  const player = await db.user.upsert({
    where: { email: "alex@player.test" },
    update: {},
    create: {
      email: "alex@player.test",
      passwordHash: playerPass,
      name: "Alex Morgan",
      role: "USER",
      charityId: second?.id,
      charityPct: 15,
    },
  });

  await db.subscription.upsert({
    where: { userId: player.id },
    update: {},
    create: {
      userId: player.id,
      plan: "MONTHLY",
      status: "ACTIVE",
      priceCents: 1500,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Seed scores — 5 rolling, unique dates, values 1-45 (Stableford).
  const seedScores = [
    { daysAgo: 2, value: 34 },
    { daysAgo: 9, value: 29 },
    { daysAgo: 16, value: 38 },
    { daysAgo: 23, value: 31 },
    { daysAgo: 30, value: 27 },
  ];
  for (const s of seedScores) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - s.daysAgo);
    await db.score.upsert({
      where: { userId_playedAt: { userId: player.id, playedAt: d } },
      update: { value: s.value },
      create: { userId: player.id, value: s.value, playedAt: d },
    });
  }

  // Payment record for the demo subscription
  const hasPayment = await db.payment.findFirst({
    where: { userId: player.id, type: "SUBSCRIPTION" },
  });
  if (!hasPayment) {
    await db.payment.create({
      data: {
        userId: player.id,
        type: "SUBSCRIPTION",
        amountCents: 1500,
        note: "Seeded monthly subscription payment",
      },
    });
  }

  console.log("✓ Seed complete.");
  console.log("  Admin  : admin@digitalheroes.test / Admin123!");
  console.log("  Player : alex@player.test        / Player123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

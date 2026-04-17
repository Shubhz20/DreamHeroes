/**
 * Draw Engine — the heart of the monthly prize-draw mechanic.
 *
 * Responsibilities (PRD §06, §07):
 *   1. Pick 5 distinct "winning numbers" in [1..45] for a given month.
 *       - RANDOM mode: uniform random.
 *       - ALGORITHMIC mode: weighted by user score frequency across the
 *         platform. We weight toward *most-frequent* scores — the intuition
 *         is that draws play to the community's statistical centre of
 *         gravity, producing more winners on average and a more engaging
 *         experience. (The admin can still choose RANDOM for a neutral draw.)
 *   2. Match each active subscriber's current 5 scores against the winning
 *      numbers. A "match" is set-membership — duplicates in a user's own
 *      scores don't multiply.
 *   3. Assign tier (3 / 4 / 5) based on match count.
 *   4. Compute the monthly prize pool and split it 40 / 35 / 25 across the
 *      5-match / 4-match / 3-match tiers. Splitting inside a tier is
 *      equal-share across all tier winners.
 *   5. Jackpot rollover: if no 5-match winners, the 5-tier slice carries to
 *      next month's draw. 4 / 3 tiers do NOT carry — unclaimed slices there
 *      are returned to reserve (the PRD is explicit about this: Rollover = No).
 *   6. Two modes: `simulate()` (dry run, no persistence) and
 *      `publish()` (writes draw + winner rows).
 */
import { db } from "./db";
import { isSubscriptionActive } from "./auth";

export type DrawAlgorithm = "RANDOM" | "ALGORITHMIC";

export const DRAW_SIZE = 5;
export const BALL_MIN = 1;
export const BALL_MAX = 45;

export const POOL_SPLIT = { five: 40, four: 35, three: 25 } as const;

// ---------- Winning number generation ----------

/** Cryptographic-ish integer in [min, max] inclusive. Math.random is fine here. */
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Draw 5 distinct numbers uniformly from [1..45]. */
export function drawRandomNumbers(): number[] {
  const picked = new Set<number>();
  while (picked.size < DRAW_SIZE) picked.add(randInt(BALL_MIN, BALL_MAX));
  return Array.from(picked).sort((a, b) => a - b);
}

/**
 * Weighted draw: build a frequency histogram over every score value in
 * [1..45], then sample without replacement using those counts as weights.
 * Every ball starts with weight 1 so "never-scored" numbers are still
 * possible — just rarer. (Prevents degenerate draws where nobody can win.)
 */
export async function drawAlgorithmicNumbers(): Promise<number[]> {
  const counts = new Map<number, number>();
  for (let i = BALL_MIN; i <= BALL_MAX; i++) counts.set(i, 1); // base weight

  const rows = await db.score.groupBy({
    by: ["value"],
    _count: { value: true },
  });
  for (const r of rows) {
    const n = r.value;
    if (n >= BALL_MIN && n <= BALL_MAX) {
      counts.set(n, (counts.get(n) ?? 1) + r._count.value);
    }
  }

  const picked: number[] = [];
  const pool = Array.from(counts.entries()); // [value, weight]

  for (let i = 0; i < DRAW_SIZE; i++) {
    const total = pool.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    let j = 0;
    for (; j < pool.length; j++) {
      r -= pool[j][1];
      if (r <= 0) break;
    }
    j = Math.min(j, pool.length - 1);
    picked.push(pool[j][0]);
    pool.splice(j, 1); // without replacement
  }
  return picked.sort((a, b) => a - b);
}

// ---------- Matching ----------

/**
 * How many of `userScores` appear in `winning`?
 * We use set-membership, so e.g. a user with [30,30,30,22,18] against
 * [30, 12, 4, 41, 17] matches 1 — not 3.
 */
export function countMatches(userScores: number[], winning: number[]): {
  count: number;
  matched: number[];
} {
  const win = new Set(winning);
  const matched: number[] = [];
  const seen = new Set<number>();
  for (const v of userScores) {
    if (seen.has(v)) continue;
    seen.add(v);
    if (win.has(v)) matched.push(v);
  }
  return { count: matched.length, matched: matched.sort((a, b) => a - b) };
}

// ---------- Prize pool ----------

/**
 * Compute the monthly prize pool in cents from all currently-active
 * subscriptions. Yearly plans are prorated to 1/12th per month.
 */
export async function computeMonthlyPoolCents(prizePoolPct: number): Promise<number> {
  const subs = await db.subscription.findMany({
    where: { status: "ACTIVE" },
    select: { plan: true, priceCents: true, currentPeriodEnd: true, status: true },
  });
  let total = 0;
  for (const s of subs) {
    if (!isSubscriptionActive(s)) continue;
    const monthly = s.plan === "YEARLY" ? Math.floor(s.priceCents / 12) : s.priceCents;
    total += Math.floor((monthly * prizePoolPct) / 100);
  }
  return total;
}

export function splitPool(totalCents: number) {
  const five = Math.floor((totalCents * POOL_SPLIT.five) / 100);
  const four = Math.floor((totalCents * POOL_SPLIT.four) / 100);
  // Put rounding remainder into the 3-tier so we don't "lose" pennies.
  const three = totalCents - five - four;
  return { five, four, three };
}

// ---------- Simulation & publish ----------

export type SimulatedWinner = {
  userId: string;
  userName: string;
  userEmail: string;
  tier: 3 | 4 | 5;
  matchedCount: number;
  matchedNumbers: number[];
  scoresSnapshot: number[];
};

export type SimulationResult = {
  month: number;
  year: number;
  algorithm: DrawAlgorithm;
  winningNumbers: number[];
  poolTotalCents: number;
  pool5Cents: number;
  pool4Cents: number;
  pool3Cents: number;
  jackpotCarry: number;
  winners: SimulatedWinner[];
  /** "Preview" prize per winner per tier (cents). Useful for the UI. */
  perWinnerPrizes: { tier: 5 | 4 | 3; cents: number; winnerCount: number }[];
};

/**
 * Get current settings row (creates the singleton row on first call).
 */
async function getSettings() {
  const existing = await db.settings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return db.settings.create({ data: { id: 1 } });
}

/**
 * Run a simulation without persisting a Draw row.
 * Used by the admin pre-analysis mode (PRD §06).
 */
export async function simulate(
  month: number,
  year: number,
  algorithm: DrawAlgorithm,
  opts?: { winningNumbers?: number[] }
): Promise<SimulationResult> {
  const settings = await getSettings();

  const winningNumbers =
    opts?.winningNumbers ??
    (algorithm === "ALGORITHMIC" ? await drawAlgorithmicNumbers() : drawRandomNumbers());

  if (winningNumbers.length !== DRAW_SIZE) {
    throw new Error(`Winning numbers must have exactly ${DRAW_SIZE} entries`);
  }

  // Active subscribers + their current (≤5) scores.
  const activeUsers = await db.user.findMany({
    where: {
      role: "USER",
      subscription: { status: "ACTIVE" },
    },
    include: { subscription: true, scores: true },
  });

  const winners: SimulatedWinner[] = [];
  for (const u of activeUsers) {
    if (!isSubscriptionActive(u.subscription)) continue;
    const scoreVals = u.scores.map((s) => s.value);
    const { count, matched } = countMatches(scoreVals, winningNumbers);
    if (count >= 3) {
      winners.push({
        userId: u.id,
        userName: u.name,
        userEmail: u.email,
        tier: count as 3 | 4 | 5,
        matchedCount: count,
        matchedNumbers: matched,
        scoresSnapshot: scoreVals,
      });
    }
  }

  // Pool calculation
  const baseTotal = await computeMonthlyPoolCents(settings.prizePoolPct);
  // Carry forward: any previous published draw for month-1 with no 5-tier winners.
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prev = await db.draw.findUnique({
    where: { month_year: { month: prevMonth, year: prevYear } },
  });
  const carry =
    prev && prev.status === "PUBLISHED"
      ? (await db.winner.count({ where: { drawId: prev.id, tier: 5 } })) === 0
        ? prev.pool5Cents
        : 0
      : 0;

  const totalCents = baseTotal + carry;
  const split = splitPool(totalCents);

  // Per-winner prize preview
  const byTier = { 5: [] as SimulatedWinner[], 4: [] as SimulatedWinner[], 3: [] as SimulatedWinner[] };
  for (const w of winners) byTier[w.tier].push(w);
  const perWinnerPrizes = [
    {
      tier: 5 as const,
      winnerCount: byTier[5].length,
      cents: byTier[5].length ? Math.floor(split.five / byTier[5].length) : 0,
    },
    {
      tier: 4 as const,
      winnerCount: byTier[4].length,
      cents: byTier[4].length ? Math.floor(split.four / byTier[4].length) : 0,
    },
    {
      tier: 3 as const,
      winnerCount: byTier[3].length,
      cents: byTier[3].length ? Math.floor(split.three / byTier[3].length) : 0,
    },
  ];

  return {
    month,
    year,
    algorithm,
    winningNumbers,
    poolTotalCents: totalCents,
    pool5Cents: split.five,
    pool4Cents: split.four,
    pool3Cents: split.three,
    jackpotCarry: carry,
    winners,
    perWinnerPrizes,
  };
}

/**
 * Persist a simulation as the Draw for the month. Idempotent: if a draw row
 * already exists it is updated (unless already PUBLISHED — in which case
 * we refuse). After publish, no further mutation is allowed.
 */
export async function publish(simulation: SimulationResult) {
  return db.$transaction(async (tx) => {
    const existing = await tx.draw.findUnique({
      where: { month_year: { month: simulation.month, year: simulation.year } },
    });
    if (existing?.status === "PUBLISHED") {
      throw new Error("Draw already published — cannot be republished.");
    }

    const draw = existing
      ? await tx.draw.update({
          where: { id: existing.id },
          data: {
            algorithm: simulation.algorithm,
            status: "PUBLISHED",
            winningNumbers: JSON.stringify(simulation.winningNumbers),
            poolTotalCents: simulation.poolTotalCents,
            pool5Cents: simulation.pool5Cents,
            pool4Cents: simulation.pool4Cents,
            pool3Cents: simulation.pool3Cents,
            jackpotCarry: simulation.jackpotCarry,
            publishedAt: new Date(),
          },
        })
      : await tx.draw.create({
          data: {
            month: simulation.month,
            year: simulation.year,
            algorithm: simulation.algorithm,
            status: "PUBLISHED",
            winningNumbers: JSON.stringify(simulation.winningNumbers),
            poolTotalCents: simulation.poolTotalCents,
            pool5Cents: simulation.pool5Cents,
            pool4Cents: simulation.pool4Cents,
            pool3Cents: simulation.pool3Cents,
            jackpotCarry: simulation.jackpotCarry,
            publishedAt: new Date(),
          },
        });

    // Wipe any previously generated winner rows (e.g. from a prior simulate)
    await tx.winner.deleteMany({ where: { drawId: draw.id } });

    // Group by tier for per-winner splitting
    const byTier: Record<3 | 4 | 5, SimulatedWinner[]> = { 3: [], 4: [], 5: [] };
    for (const w of simulation.winners) byTier[w.tier].push(w);

    const tierPool: Record<3 | 4 | 5, number> = {
      5: simulation.pool5Cents,
      4: simulation.pool4Cents,
      3: simulation.pool3Cents,
    };

    for (const tier of [3, 4, 5] as const) {
      const list = byTier[tier];
      if (list.length === 0) continue;
      const per = Math.floor(tierPool[tier] / list.length);
      for (const w of list) {
        await tx.winner.create({
          data: {
            drawId: draw.id,
            userId: w.userId,
            tier,
            matchedCount: w.matchedCount,
            matchedNumbers: JSON.stringify(w.matchedNumbers),
            scoresSnapshot: JSON.stringify(w.scoresSnapshot),
            prizeCents: per,
          },
        });
      }
    }

    return draw;
  });
}

/** Helper: parse a Draw row's stringified winning numbers. */
export function parseWinningNumbers(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a.map(Number) : [];
  } catch {
    return [];
  }
}

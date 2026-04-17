/**
 * Score logic.
 *
 * Rules (from PRD §05, §13):
 *   1. Stableford score range is 1..45.
 *   2. Users retain exactly their last 5 scores at any time.
 *   3. A new score replaces the oldest when the user already has 5.
 *   4. One score per date. Duplicates must be edited or deleted — not added.
 *   5. Scores are displayed most-recent-first.
 *
 * The "oldest" is defined by `playedAt`, not `createdAt`, so a back-dated
 * entry (e.g. logging Saturday's round on Monday) still correctly kicks out
 * the earliest round from the rolling window.
 */
import { db } from "./db";

export const SCORE_MIN = 1;
export const SCORE_MAX = 45;
export const MAX_SCORES = 5;

export class ScoreError extends Error {
  status: number;
  constructor(msg: string, status = 400) {
    super(msg);
    this.status = status;
  }
}

export function validateScoreValue(v: number) {
  if (!Number.isInteger(v) || v < SCORE_MIN || v > SCORE_MAX) {
    throw new ScoreError(`Score must be an integer in ${SCORE_MIN}..${SCORE_MAX}`);
  }
}

/** Normalise to a day boundary (UTC) — one score per date. */
export function normaliseDate(d: Date | string): Date {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) throw new ScoreError("Invalid date");
  const n = new Date(date);
  n.setUTCHours(0, 0, 0, 0);
  // No future dates — you can't have played a round that hasn't happened yet.
  if (n.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    throw new ScoreError("Score date cannot be in the future");
  }
  return n;
}

export async function getUserScores(userId: string) {
  return db.score.findMany({
    where: { userId },
    orderBy: { playedAt: "desc" },
  });
}

/**
 * Add a new score. Enforces all five PRD rules.
 *   - If a score already exists for the date → throw (user must edit/delete).
 *   - If user has 5 scores → oldest is evicted atomically.
 */
export async function addScore(userId: string, rawValue: number, rawDate: Date | string) {
  validateScoreValue(rawValue);
  const playedAt = normaliseDate(rawDate);

  return db.$transaction(async (tx) => {
    const existing = await tx.score.findUnique({
      where: { userId_playedAt: { userId, playedAt } },
    });
    if (existing) {
      throw new ScoreError(
        "A score already exists for that date. Edit or delete the existing entry instead.",
        409
      );
    }

    const all = await tx.score.findMany({
      where: { userId },
      orderBy: { playedAt: "asc" },
    });

    if (all.length >= MAX_SCORES) {
      // Evict the oldest (earliest playedAt). If the new score's date is
      // *older* than the current oldest, reject — it wouldn't be in the
      // rolling window anyway.
      const oldest = all[0];
      if (playedAt.getTime() <= new Date(oldest.playedAt).getTime()) {
        throw new ScoreError(
          "This date is older than your earliest stored round. Only your last 5 are tracked."
        );
      }
      await tx.score.delete({ where: { id: oldest.id } });
    }

    return tx.score.create({
      data: { userId, value: rawValue, playedAt },
    });
  });
}

export async function updateScore(
  userId: string,
  scoreId: string,
  patch: { value?: number; playedAt?: Date | string }
) {
  if (patch.value != null) validateScoreValue(patch.value);
  const newDate = patch.playedAt != null ? normaliseDate(patch.playedAt) : undefined;

  return db.$transaction(async (tx) => {
    const current = await tx.score.findFirst({ where: { id: scoreId, userId } });
    if (!current) throw new ScoreError("Score not found", 404);

    // If moving to a new date, ensure no conflict.
    if (newDate && newDate.getTime() !== new Date(current.playedAt).getTime()) {
      const clash = await tx.score.findUnique({
        where: { userId_playedAt: { userId, playedAt: newDate } },
      });
      if (clash) {
        throw new ScoreError("Another score already exists for that date", 409);
      }
    }

    return tx.score.update({
      where: { id: scoreId },
      data: {
        ...(patch.value != null && { value: patch.value }),
        ...(newDate && { playedAt: newDate }),
      },
    });
  });
}

export async function deleteScore(userId: string, scoreId: string) {
  const s = await db.score.findFirst({ where: { id: scoreId, userId } });
  if (!s) throw new ScoreError("Score not found", 404);
  await db.score.delete({ where: { id: scoreId } });
}

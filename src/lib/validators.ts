/** Zod schemas used by API routes. Keeping them co-located keeps contracts tight. */
import { z } from "zod";

export const SignupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(200).toLowerCase(),
  password: z.string().min(8).max(200),
  charityId: z.string().min(1),
  charityPct: z.number().int().min(10).max(50),
  plan: z.enum(["MONTHLY", "YEARLY"]),
  country: z.string().length(2).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const ScoreSchema = z.object({
  value: z.number().int().min(1).max(45),
  playedAt: z.string().min(4), // ISO-ish; normaliseDate does the rest
});

export const ScoreUpdateSchema = z
  .object({
    value: z.number().int().min(1).max(45).optional(),
    playedAt: z.string().optional(),
  })
  .refine((v) => v.value != null || v.playedAt != null, {
    message: "Provide value or playedAt",
  });

export const CharityChoiceSchema = z.object({
  charityId: z.string().min(1),
  charityPct: z.number().int().min(10).max(50),
});

export const DonationSchema = z.object({
  charityId: z.string().min(1),
  amountCents: z.number().int().min(100).max(1_000_000_00), // $1–$1,000,000
  note: z.string().max(300).optional(),
});

export const AdminCharitySchema = z.object({
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(120),
  tagline: z.string().min(2).max(200),
  description: z.string().min(10).max(5000),
  imageUrl: z.string().url(),
  heroImageUrl: z.string().url().optional().nullable(),
  category: z.string().max(60).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const DrawRunSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024).max(2100),
  algorithm: z.enum(["RANDOM", "ALGORITHMIC"]),
  winningNumbers: z.array(z.number().int().min(1).max(45)).length(5).optional(),
});

export const WinnerVerifySchema = z.object({
  verificationStatus: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(500).optional(),
});

export const WinnerProofSchema = z.object({
  proofUrl: z.string().url().max(1000),
});

export const SubscriptionCheckoutSchema = z.object({
  plan: z.enum(["MONTHLY", "YEARLY"]),
});

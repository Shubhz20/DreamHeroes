# Digital Heroes — Golf × Charity × Monthly Draw

A subscription-driven web application that combines golf performance tracking, charitable giving,
and a monthly prize draw. Built against the Digital Heroes trainee-selection PRD.

> **Design note.** The UI deliberately avoids the "green grass / fairway / clubs" aesthetic. Golf is
> the *mechanic*, not the *brand*. The product feels closer to a design-forward fintech or
> philanthropy app: a warm ink palette, editorial italic serifs, soft shadows, and a single ember
> accent colour. This reflects the PRD's instruction that a golfer shouldn't be able to tell from
> the landing page that the app has anything to do with golf.

---

## Table of contents

1. [Quickstart](#quickstart)
2. [Test credentials](#test-credentials)
3. [Feature tour](#feature-tour)
4. [Architecture](#architecture)
5. [Business-logic highlights](#business-logic-highlights)
6. [API surface](#api-surface)
7. [Database schema](#database-schema)
8. [Deployment (Vercel + Supabase)](#deployment-vercel--supabase)
9. [Security notes](#security-notes)
10. [Project layout](#project-layout)

---

## Quickstart

Requirements: Node 18.17+ and npm. No external services needed for local dev — the app ships with
SQLite and a mock Stripe path.

```bash
# 1. Install dependencies
npm install

# 2. Copy env and optionally edit
cp .env.example .env

# 3. Push schema + seed data (creates dev.db, admin, demo player, 6 charities)
npm run setup

# 4. Start the dev server
npm run dev
```

Open http://localhost:3000.

To explore the database directly:

```bash
npm run db:studio
```

---

## Test credentials

Both accounts are created by `prisma/seed.ts` and are idempotent — re-running the seed upserts them.

| Role  | Email                        | Password    | Notes                                              |
|-------|------------------------------|-------------|----------------------------------------------------|
| Admin | `admin@digitalheroes.test`   | `Admin123!` | Sees `/admin/*` — users, draws, charities, winners |
| User  | `alex@player.test`           | `Player123!`| Active MONTHLY subscription, 5 seeded scores       |

Also seeded: 6 charities (Ocean Horizon, Second Swing, Hearts for Homes, Bright Minds, Pawsitive
Futures, Swing for Veterans) with 2 of them carrying demo events.

---

## Feature tour

### Marketing / public

- **Homepage** — animated hero with live metrics (subscriber count, charity count, lifetime
  donations, projected pool for the month), three-step "How it works", featured charities grid, and
  a "this is not a golf app" strip.
- **Pricing** — Monthly £9.99 / Yearly £99 (a ~17% discount). Shows per-pound impact: 10–50% of the
  user's subscription flows to their chosen charity; the rest funds the shared monthly prize pool.
- **How it works** — written explanation of the Stableford → rolling-5 → match mechanic.
- **Charities** — searchable, filterable grid. Each charity has its own detail page with hero,
  mission, running total of donations, and subscriber count.

### Authenticated user flows

- **Signup (3-step wizard)**: Plan → Charity picker (image thumbnails) → Account. On submit a user,
  subscription, and first Payment row are created atomically. Stripe is optional — if no API key is
  set the app creates a "paid" mock subscription so reviewers can test everything end-to-end.
- **Dashboard** — stat cards, a preview of the latest draw with the user's matching scores
  highlighted, a recent-rounds table, and quick links.
- **Scores** — rolling last-5 Stableford scores (1–45), one per calendar day. Adding a 6th evicts
  the oldest by `playedAt`; editing past scores is allowed; back-dating an older score than the
  current oldest is refused (the window is "last five played dates").
- **Charity** — change recipient or adjust percentage (10–50%) with an inline slider; make a
  one-off donation independently of the subscription flow; view donation history.
- **Subscription** — plan/status panel, billing history, actions (switch plan, cancel at period
  end, reactivate, open Stripe checkout if configured).
- **Winnings** — stat cards (approved / pending / count), per-win cards with draw numbers, scores
  snapshot, and **proof URL upload** for the winner verification step.

### Admin flows

- **Reports** (`/admin`) — 8 stat cards (active subs, MRR, lifetime donations, pending verifications
  etc.), recent-draws table, top charities by donation volume.
- **Users** — search, role/charity/subscription editor. Scores hint to use the dedicated
  `/api/admin/users/:id/scores` endpoint (POST/PATCH/DELETE).
- **Draws** — month/year/algorithm picker (RANDOM or ALGORITHMIC). "Simulate" runs the engine
  *without* persisting, showing winning balls, pool split, jackpot carry annotation, and projected
  winner table. "Publish" persists in a single transaction and sends winner emails (currently
  stubbed — swap `src/lib/email.ts` to Resend/Postmark).
- **Charities** — full CRUD with image URLs, category, description, featured flag. Deactivate is a
  soft delete (historical user/donation links are preserved).
- **Winners** — tabbed view (PENDING / APPROVED / REJECTED / ALL) with approve, reject (with review
  note), and "Mark paid" actions. The API refuses PAID unless the winner is APPROVED.

---

## Architecture

- **Framework**: Next.js 14 App Router, React 18, TypeScript strict.
- **Styling**: Tailwind with a custom ink/ember/rose palette and editorial serif (Instrument
  Serif + Inter). Animations hand-rolled via `@keyframes`.
- **Auth**: JWT sessions signed with the `jose` library (Edge-runtime compatible — middleware
  protects `/dashboard` and `/admin` without hitting the database). Passwords bcrypt-hashed.
- **Database**: Prisma ORM. SQLite by default (zero-config); Postgres/Supabase by changing the
  `provider` in `prisma/schema.prisma` to `postgresql` and pointing `DATABASE_URL` at Supabase.
- **Validation**: Zod schemas in `src/lib/validators.ts` for every mutation endpoint.
- **API**: Thin handlers wrapped by `handle()` that converts `ZodError`, `AuthError`, and
  `ScoreError` into typed JSON responses.
- **Payments**: Stripe SDK if configured, otherwise a mock path that creates subscription +
  Payment rows directly so the flow is exercisable without a Stripe account.
- **Email**: a logging stub (`src/lib/email.ts`). In production, swap to Resend or Postmark — the
  function signatures already match their APIs.

---

## Business-logic highlights

### The draw engine (`src/lib/draw-engine.ts`)

This is the heart of the platform and the file most worth reading. Responsibilities:

- **RANDOM mode** — uniform random 5 distinct numbers in [1..45].
- **ALGORITHMIC mode** — frequency-weighted sampling without replacement. Weights are `1 + count` of
  scores at each value across all active subscribers, so the draw plays to the community's centre
  of gravity and tends to produce *more* winners.
- **Matching** — set-membership. A user scoring `[12, 12, 24, 30, 41]` against winning numbers
  `[12, 24, 30, 41, 45]` gets 4 matches (no double-count for the duplicate 12).
- **Pool computation** — iterates active subscriptions, treats yearly plans as `priceCents / 12`
  for the month's contribution, then applies the configurable `prizePoolPct` (default 50%, the
  remainder flowing to charities via the user's chosen percentage split).
- **Tier split** — 40% / 35% / 25% across 5-tier / 4-tier / 3-tier, with the remainder-cent dropping
  into the 3-tier slice.
- **Jackpot rollover** — the 5-tier slice carries forward *only* when the previous PUBLISHED draw
  had zero 5-tier winners. 4-tier and 3-tier slices don't carry (PRD is explicit).
- **Simulate vs Publish** — `simulate()` returns a `SimulationResult` for admin preview (no writes);
  `publish()` runs in a single transaction, wiping any prior winner rows for the draw to prevent
  stale tier assignments on re-simulate.

### Rolling-5 scores (`src/lib/scores.ts`)

- One score per calendar day (UTC); future dates refused.
- Adding a 6th score evicts the oldest by `playedAt`, not `createdAt`, so back-dating behaves
  correctly.
- Back-dating *older* than the current oldest is refused — the window is "last five played dates",
  not "latest five entered".

### Signup → subscription atomicity (`src/app/api/auth/signup/route.ts`)

Everything happens inside `db.$transaction`: user, subscription, first Payment row, charity link.
If Stripe is configured, the real checkout session is returned; otherwise the mock path completes
the payment locally so reviewers can exercise the rest of the app without keys.

---

## API surface

All mutation endpoints use Zod validation, session-cookie auth, and return `{ ok, data }` or
`{ ok: false, error }`.

### User-facing

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/signup` | Create user + subscription + first payment |
| `POST` | `/api/auth/login` | Session cookie |
| `POST` | `/api/auth/logout` | Clear session |
| `GET`  | `/api/auth/me` | Current user with subscription + charity |
| `GET`/`POST` | `/api/scores` | List / add score (requires active sub for POST) |
| `PATCH`/`DELETE` | `/api/scores/:id` | Edit / delete own score |
| `PATCH` | `/api/subscription` | Change charity recipient or % |
| `POST` | `/api/subscription/cancel` | Cancel at period end |
| `POST` | `/api/subscription/reactivate` | Resume after cancel-at-period-end |
| `POST` | `/api/subscription/checkout` | Create Stripe checkout (or mock) |
| `POST` | `/api/donations` | One-off donation |
| `GET` | `/api/draws` | Published draws |
| `PATCH` | `/api/winners/:id/proof` | Upload proof URL for a pending winner |

### Admin-only (`requireRole("ADMIN")`)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/admin/users` | Search users |
| `PATCH` | `/api/admin/users/:id` | Edit name/role/charity/subscription |
| `POST`/`PATCH`/`DELETE` | `/api/admin/users/:id/scores` | Manage a user's scores |
| `GET` | `/api/admin/draws` | List draws with winner counts |
| `POST` | `/api/admin/draws/simulate` | Dry-run simulation |
| `POST` | `/api/admin/draws/publish` | Persist draw + winners, send emails |
| `GET`/`POST` | `/api/admin/charities` | List / create |
| `PATCH`/`DELETE` | `/api/admin/charities/:id` | Update / soft-deactivate |
| `GET` | `/api/admin/winners` | Filter by status |
| `PATCH` | `/api/admin/winners/:id` | Approve/Reject + reviewNote, or Mark PAID |
| `GET` | `/api/admin/reports` | Aggregated metrics |

---

## Database schema

Defined in `prisma/schema.prisma`. Enum values are string columns so the schema ports 1:1 from
SQLite to Postgres without migrations.

Key models:

- `User` — role (USER/ADMIN), optional charity + percentage (10–50, default 10).
- `Subscription` — plan MONTHLY/YEARLY, status ACTIVE/CANCELED/LAPSED/PENDING, `currentPeriodEnd`.
- `Score` — `@@unique([userId, playedAt])` to enforce one score per calendar day.
- `Charity` — slug, isActive (soft-delete), isFeatured, imageUrl + heroImageUrl.
- `CharityEvent` — upcoming tournament / event schedule per charity.
- `Draw` — `@@unique([month, year])`, `winningNumbers` stored as JSON string (portable across
  engines), pool fields in cents, `jackpotCarry`, algorithm, status
  PENDING/SIMULATED/PUBLISHED.
- `Winner` — `@@unique([drawId, userId, tier])`, verificationStatus, payoutStatus, proofUrl,
  scoresSnapshot + matchedNumbers as JSON.
- `Donation`, `Payment` — auditable money-movement logs.
- `Settings` — singleton row (`id=1`) with `prizePoolPct` (default 50).

---

## Deployment (Vercel + Supabase)

1. **Supabase**
   - Create a project, note the connection string.
   - In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
   - Locally: `DATABASE_URL="postgresql://..." npx prisma db push` to materialise the schema.
   - Seed if desired: `DATABASE_URL="postgresql://..." npm run db:seed`.
2. **Vercel**
   - Import the GitHub repo into Vercel.
   - Environment variables: `DATABASE_URL`, `JWT_SECRET` (32+ chars), `NEXT_PUBLIC_APP_URL`,
     `ADMIN_EMAILS`, and optionally `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` /
     `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
   - Build command: `npm run build`. Output: `.next`. Vercel auto-detects Next.js.
3. **Stripe (optional)**
   - In test mode, create two Products/Prices (MONTHLY, YEARLY) and put their IDs into the
     checkout route if you move off the mock path.
   - Webhook endpoint: `/api/stripe/webhook` (stubbed — wire up when you productionise payments).

Because the app uses a JWT session cookie signed with `JWT_SECRET`, **rotating the secret logs
everyone out** — desirable if you ever suspect a leak.

---

## Security notes

- **Passwords**: bcrypt (`bcryptjs`, 10 rounds).
- **Session token**: `jose` HS256 JWT, 30-day expiry, `httpOnly` + `sameSite: lax` + `secure` in
  production, path `/`.
- **Middleware**: Edge-runtime JWT verification on `/dashboard` and `/admin` — *fast* and doesn't
  touch the database per request.
- **Admin gate**: double-checked at the middleware layer (redirects non-admin → `/dashboard`) and
  on every admin API handler via `requireRole("ADMIN")`.
- **Input validation**: every mutation endpoint runs a Zod schema from `src/lib/validators.ts`.
- **SQL safety**: Prisma parameterises everything.
- **Transactional invariants**: signup, draw publish, score eviction, and
  subscription reactivation all run inside `db.$transaction`.
- **Soft deletes for charities**: preserves historical links so a deactivated charity can't orphan
  a user's subscription or a donation.

---

## Project layout

```
golf-charity-platform/
├── prisma/
│   ├── schema.prisma       # Data model
│   └── seed.ts             # Admin + demo user + 6 charities + events
├── public/
├── src/
│   ├── app/
│   │   ├── (marketing)/    # Home, pricing, how-it-works, charities
│   │   ├── (auth)/         # /login, /signup
│   │   ├── dashboard/      # User area (scores, charity, sub, winnings)
│   │   ├── admin/          # Admin area (users, draws, charities, winners)
│   │   └── api/            # REST endpoints
│   ├── components/
│   │   ├── ui.tsx          # Button, Card, Badge, Ball, Field, Input, ...
│   │   ├── Nav.tsx         # Public + dashboard + admin variants
│   │   └── Footer.tsx
│   ├── lib/
│   │   ├── db.ts           # Prisma singleton
│   │   ├── auth.ts         # Sessions, getCurrentUser, requireRole
│   │   ├── scores.ts       # Rolling-5 with back-date semantics
│   │   ├── draw-engine.ts  # Simulate + publish + pool math
│   │   ├── stripe.ts       # Optional Stripe client + isStripeConfigured
│   │   ├── format.ts       # Money/date formatters
│   │   ├── email.ts        # Logging stub — swap to Resend/Postmark
│   │   ├── api.ts          # handle(), ok(), err()
│   │   └── validators.ts   # Zod schemas
│   └── middleware.ts       # Edge-runtime JWT gate for /dashboard and /admin
├── .env.example
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## What's deliberately stubbed

These are small, clearly-marked surfaces that a reviewer or future contributor would swap out
against a real service before shipping to production:

- **Email** (`src/lib/email.ts`) — currently logs to stdout. Drop-in replacement with Resend or
  Postmark is a 10-line edit.
- **File upload for proof** — the dashboard takes a URL (easy to paste an S3/Cloudinary link).
  Swapping to a presigned-PUT flow is a focused change inside `WinningsClient.tsx` and a new
  `/api/upload` route.
- **Stripe** — the mock path exists so you can run end-to-end without keys; see `src/lib/stripe.ts`
  and `src/app/api/subscription/checkout/route.ts`.

Everything else is first-class: auth, draw engine, rolling scores, transactional signup, admin
verification flow, soft-delete for charities, pool math with rollover, and the full API surface.

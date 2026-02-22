# Iron Viking

A Norse-themed leaderboard app for 6 friends training together for a 42K Iron Viking obstacle course race. 28 weeks of gamified competition, RPG-style progression, and Viking glory.

## Stack

- **Next.js 15** (App Router) — frontend + API
- **Drizzle ORM** — type-safe database queries
- **Neon** — serverless PostgreSQL
- **Vercel** — hosting
- **Tailwind CSS v4** — styling with custom Norse theme

## Setup

1. Clone the repo
2. `npm install`
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `DATABASE_URL` — your Neon connection string
   - `JWT_SECRET` — any long random string
4. Push the schema to your database:
   ```bash
   npx drizzle-kit push
   ```
5. Seed the database with weeks and default challenges:
   ```bash
   npx tsx src/db/seed.ts
   ```
6. Run the dev server:
   ```bash
   npm run dev
   ```

## Deployment

1. Push to GitHub
2. Import into Vercel
3. Connect Neon via the Vercel integration
4. Add `JWT_SECRET` environment variable
5. Run `npx drizzle-kit push` against production DB
6. Run seed script against production DB
7. Deploy

## First-time admin setup

1. Go to `/login` and create the first account via an invite link
2. Player slot 1 is automatically admin
3. From the admin panel, generate invite links for the remaining 5 players
4. Set active challenges for Week 1

## Key routes

- `/dashboard` — main leaderboard + countdown
- `/submit` — weekly input form
- `/profile/[id]` — player profile
- `/challenges` — challenge board
- `/guide` — training plan
- `/admin` — admin panel
- `/portal?rune=XXXXX` — onboarding via invite link
- `/login` — login page

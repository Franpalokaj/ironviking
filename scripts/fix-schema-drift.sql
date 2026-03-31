-- Fix "Failed query" / everyone showing 0 XP after a deploy:
-- The app expects these columns; if they are missing in Neon, SELECT * fails and APIs return errors,
-- so the dashboard falls back to empty scores (0 pts / 0 XP for everyone).
--
-- Prefer: from iron-viking/, with DATABASE_URL pointing at production:
--   npx drizzle-kit push
--
-- Or run this file in the Neon SQL Editor (safe to re-run: IF NOT EXISTS).

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS berserker_gym boolean NOT NULL DEFAULT false;

ALTER TABLE weekly_scores
  ADD COLUMN IF NOT EXISTS forge_bonus integer NOT NULL DEFAULT 0;

ALTER TABLE hype_votes
  ADD COLUMN IF NOT EXISTS message text;

ALTER TABLE benchmark_goals
  ADD COLUMN IF NOT EXISTS latest_recorded_value real;

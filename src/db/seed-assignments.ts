import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { getPhaseForWeek } from "../lib/constants";

async function seedAssignments() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle(sql, { schema });

  const allWeeks = await db.select().from(schema.weeks);
  const allChallenges = await db.select().from(schema.challenges);

  const weeks = allWeeks.sort((a, b) => a.weekNumber - b.weekNumber);

  const soloByPhase: Record<string, typeof allChallenges> = {};
  const competitiveByPhase: Record<string, typeof allChallenges> = {};
  const collaborativeByPhase: Record<string, typeof allChallenges> = {};

  for (const c of allChallenges) {
    const phase = c.phase.toLowerCase();
    if (c.track === "solo") {
      (soloByPhase[phase] ??= []).push(c);
    } else if (c.track === "competitive") {
      (competitiveByPhase[phase] ??= []).push(c);
    } else if (c.track === "collaborative") {
      (collaborativeByPhase[phase] ??= []).push(c);
    }
  }

  function pickCycling(pool: typeof allChallenges, index: number) {
    if (!pool || pool.length === 0) return null;
    return pool[index % pool.length];
  }

  const soloCounters: Record<string, number> = {};
  const compCounters: Record<string, number> = {};
  const collabCounters: Record<string, number> = {};

  let assigned = 0;

  for (const week of weeks) {
    if (week.soloChallengeId && week.secondChallengeId) {
      console.log(`Week ${week.weekNumber}: already assigned, skipping`);
      continue;
    }

    const phase = getPhaseForWeek(week.weekNumber);
    const phaseLower = phase.name.toLowerCase();

    // Solo challenge
    let soloId = week.soloChallengeId;
    if (!soloId) {
      const soloPool = soloByPhase[phaseLower] || soloByPhase["any"] || soloByPhase["foundation"] || [];
      const idx = (soloCounters[phaseLower] ?? 0);
      const pick = pickCycling(soloPool, idx);
      if (pick) {
        soloId = pick.id;
        soloCounters[phaseLower] = idx + 1;
      }
    }

    // Second challenge (competitive or collaborative based on week type)
    let secondId = week.secondChallengeId;
    if (!secondId) {
      if (week.type === "competition") {
        const pool = competitiveByPhase[phaseLower] || competitiveByPhase["any"] || competitiveByPhase["foundation"] || [];
        const idx = (compCounters[phaseLower] ?? 0);
        const pick = pickCycling(pool, idx);
        if (pick) {
          secondId = pick.id;
          compCounters[phaseLower] = idx + 1;
        }
      } else {
        const pool = collaborativeByPhase[phaseLower] || collaborativeByPhase["any"] || collaborativeByPhase["foundation"] || [];
        const idx = (collabCounters[phaseLower] ?? 0);
        const pick = pickCycling(pool, idx);
        if (pick) {
          secondId = pick.id;
          collabCounters[phaseLower] = idx + 1;
        }
      }
    }

    if (soloId || secondId) {
      const updates: Record<string, unknown> = {};
      if (soloId && !week.soloChallengeId) updates.soloChallengeId = soloId;
      if (secondId && !week.secondChallengeId) updates.secondChallengeId = secondId;

      await db.update(schema.weeks).set(updates).where(eq(schema.weeks.id, week.id));

      const soloName = soloId ? allChallenges.find(c => c.id === soloId)?.title : "—";
      const secondName = secondId ? allChallenges.find(c => c.id === secondId)?.title : "—";
      console.log(`Week ${week.weekNumber} (${phaseLower}, ${week.type}): solo="${soloName}" | second="${secondName}"`);
      assigned++;
    }
  }

  console.log(`\nDone! Assigned defaults to ${assigned} weeks.`);
  console.log("You can change any of these from the admin panel.");
}

seedAssignments().catch(console.error);

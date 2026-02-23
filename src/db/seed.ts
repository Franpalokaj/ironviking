import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { TRAINING_START } from "../lib/constants";

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle(sql, { schema });

  console.log("Seeding weeks...");
  // Use UTC noon to avoid timezone boundary issues when converting to date strings
  const baseDate = new Date(Date.UTC(2026, 1, 23, 12, 0, 0)); // Feb 23, 2026
  for (let w = 1; w <= 28; w++) {
    const start = new Date(baseDate);
    start.setUTCDate(baseDate.getUTCDate() + (w - 1) * 7);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);

    const type = w % 2 === 1 ? "competition" : "collaboration";

    await db.insert(schema.weeks).values({
      weekNumber: w,
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      type,
      isLocked: false,
    }).onConflictDoNothing();
  }

  console.log("Seeding challenges...");
  const defaultChallenges = [
    // Solo - Phase 1
    { title: "Run Before 8am", description: "Log a run that starts before 8am at least once this week", track: "solo", dataType: "boolean", phase: "foundation" },
    { title: "New Route Explorer", description: "Run a new route you've never done before", track: "solo", dataType: "boolean", phase: "foundation" },
    { title: "Phone-Free Run", description: "Complete a run without checking your phone", track: "solo", dataType: "boolean", phase: "foundation" },
    { title: "Daily Mobility", description: "Do 10 minutes of mobility or stretching every day this week", track: "solo", dataType: "boolean", phase: "foundation" },
    { title: "Willpower Run", description: "Workout on a day you really didn't feel like it", track: "solo", dataType: "boolean", phase: "foundation" },
    // Solo - Phase 2
    { title: "Four Runs Week", description: "Log 4 runs this week", track: "solo", dataType: "boolean", phase: "building" },
    { title: "Triple Gym", description: "Complete 3 gym sessions this week", track: "solo", dataType: "boolean", phase: "building" },
    { title: "Four Day Runner", description: "Run on 4 separate days this week", track: "solo", dataType: "boolean", phase: "building" },
    { title: "Trail Seeker", description: "Log a trail or outdoor run this week", track: "solo", dataType: "boolean", phase: "building" },
    // Solo - Phase 3
    { title: "Back-to-Back", description: "Run two days back-to-back", track: "solo", dataType: "boolean", phase: "peak" },
    { title: "Two-Hour Session", description: "Complete a 2-hour continuous movement session", track: "solo", dataType: "boolean", phase: "peak" },
    { title: "Gear Test Run", description: "Do a gear test run in full race kit", track: "solo", dataType: "boolean", phase: "taper" },

    // Competitive - Phase 1
    { title: "Most Runs Logged", description: "Who can log the most runs this week?", track: "competitive", dataType: "count", phase: "foundation" },
    { title: "Most Gym Sessions", description: "Who completes the most gym sessions this week?", track: "competitive", dataType: "count", phase: "foundation" },
    // Competitive - Phase 2
    { title: "Fastest 10K", description: "Record your fastest 10K time this week", track: "competitive", dataType: "time_mmss", phase: "building" },
    { title: "Longest Single Run", description: "Who can log the longest single run this week?", track: "competitive", dataType: "distance_km", phase: "building" },
    { title: "Pull-up King", description: "Most pull-ups in one unbroken set", track: "competitive", dataType: "count", phase: "building" },
    // Competitive - Phase 3
    { title: "Elevation Hunter", description: "Most elevation gain in a single run", track: "competitive", dataType: "count", phase: "peak" },
    { title: "Fastest 21K", description: "Record your fastest 21K (half marathon) time", track: "competitive", dataType: "time_mmss", phase: "peak" },
    { title: "Farmer Carry Distance", description: "Heaviest farmer carry distance", track: "competitive", dataType: "distance_km", phase: "peak" },

    // Collaborative - Phase 1
    { title: "All Six Log a Run", description: "All six Vikings must log at least one run this week", track: "collaborative", dataType: "boolean", targetValue: 6, phase: "foundation" },
    { title: "Combined 60km", description: "Combined group total of 60km this week", track: "collaborative", dataType: "distance_km", targetValue: 60, phase: "foundation" },
    { title: "All Submit On Time", description: "All six Vikings submit their stats by Sunday midnight", track: "collaborative", dataType: "boolean", targetValue: 6, phase: "foundation" },
    // Collaborative - Phase 2
    { title: "Combined 120km", description: "Combined group total of 120km this week", track: "collaborative", dataType: "distance_km", targetValue: 120, phase: "building" },
    { title: "All Gym Warriors", description: "All six Vikings complete at least one gym session", track: "collaborative", dataType: "boolean", targetValue: 6, phase: "building" },
    { title: "Combined 200 Pull-ups", description: "Combined 200 pull-ups across the group this week", track: "collaborative", dataType: "count", targetValue: 200, phase: "building" },
    // Collaborative - Phase 3
    { title: "Combined 200km", description: "Combined group total of 200km this week", track: "collaborative", dataType: "distance_km", targetValue: 200, phase: "peak" },
    { title: "All 10K+ Runs", description: "All six Vikings complete a run over 10km", track: "collaborative", dataType: "boolean", targetValue: 6, phase: "peak" },
    { title: "Group Long Run 100km", description: "Group longest run total exceeds 100km combined", track: "collaborative", dataType: "distance_km", targetValue: 100, phase: "peak" },
  ];

  for (const c of defaultChallenges) {
    await db.insert(schema.challenges).values({
      title: c.title,
      description: c.description,
      track: c.track,
      dataType: c.dataType || null,
      targetValue: ("targetValue" in c ? c.targetValue : null) as number | null,
      phase: c.phase,
      submittedBy: null,
      used: false,
    }).onConflictDoNothing();
  }

  console.log("Seed complete!");
}

seed().catch(console.error);

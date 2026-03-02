import { NextResponse } from "next/server";
import { db } from "@/db";
import { weeks, challenges } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentWeekNumber } from "@/lib/constants";

export async function GET() {
  try {
    const weekNum = getCurrentWeekNumber();

    const [week] = await db
      .select()
      .from(weeks)
      .where(eq(weeks.weekNumber, weekNum))
      .limit(1);

    if (!week) {
      return NextResponse.json({ error: "Week not found" }, { status: 404 });
    }

    let soloChallenge = null;
    let secondChallenge = null;

    if (week.soloChallengeId) {
      const [c] = await db.select().from(challenges).where(eq(challenges.id, week.soloChallengeId)).limit(1);
      soloChallenge = c || null;
    }

    if (week.secondChallengeId) {
      const [c] = await db.select().from(challenges).where(eq(challenges.id, week.secondChallengeId)).limit(1);
      secondChallenge = c || null;
    }

    // Find the most recently scored (locked) week for the leaderboard
    const [lastScoredWeek] = await db
      .select()
      .from(weeks)
      .where(eq(weeks.isLocked, true))
      .orderBy(desc(weeks.weekNumber))
      .limit(1);

    let prevWeekId: number | null = null;
    if (lastScoredWeek && lastScoredWeek.weekNumber > 1) {
      const [pw] = await db
        .select({ id: weeks.id })
        .from(weeks)
        .where(eq(weeks.weekNumber, lastScoredWeek.weekNumber - 1))
        .limit(1);
      if (pw) prevWeekId = pw.id;
    }

    return NextResponse.json({
      week,
      soloChallenge,
      secondChallenge,
      prevWeekId,
      lastScoredWeek: lastScoredWeek || null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load week" }, { status: 500 });
  }
}

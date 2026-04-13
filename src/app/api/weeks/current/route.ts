import { NextResponse } from "next/server";
import { db } from "@/db";
import { weeks, challenges, weeklyScores, players } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { BERSERKER_MULTIPLIER } from "@/lib/constants";
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
    let buddyChallenge = null;

    if (week.soloChallengeId) {
      const [c] = await db.select().from(challenges).where(eq(challenges.id, week.soloChallengeId)).limit(1);
      soloChallenge = c || null;
    }

    if (week.secondChallengeId) {
      const [c] = await db.select().from(challenges).where(eq(challenges.id, week.secondChallengeId)).limit(1);
      secondChallenge = c || null;
    }

    if (week.buddyChallengeId) {
      const [c] = await db.select().from(challenges).where(eq(challenges.id, week.buddyChallengeId)).limit(1);
      buddyChallenge = c || null;
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

    // Compute which players are in berserker mode for the CURRENT week
    // (last in both of the two most recent scored weeks)
    const berserkerPlayerIds: number[] = [];
    if (week.weekNumber >= 3 && lastScoredWeek && lastScoredWeek.weekNumber >= 2) {
      const allPlayers = await db
        .select({ id: players.id })
        .from(players)
        .where(eq(players.onboardingComplete, true));

      for (const p of allPlayers) {
        const prevScores = await db
          .select({ realmRankWeek: weeklyScores.realmRankWeek })
          .from(weeklyScores)
          .innerJoin(weeks, eq(weeklyScores.weekId, weeks.id))
          .where(and(
            eq(weeklyScores.playerId, p.id),
            sql`${weeks.weekNumber} >= ${week.weekNumber - 2}`,
            sql`${weeks.weekNumber} < ${week.weekNumber}`
          ))
          .orderBy(desc(weeks.weekNumber))
          .limit(2);

        if (prevScores.length === 2 && prevScores.every(s => s.realmRankWeek >= 6)) {
          berserkerPlayerIds.push(p.id);
        }
      }
    }

    return NextResponse.json({
      week,
      soloChallenge,
      secondChallenge,
      buddyChallenge,
      prevWeekId,
      lastScoredWeek: lastScoredWeek || null,
      berserkerPlayerIds,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load week" }, { status: 500 });
  }
}

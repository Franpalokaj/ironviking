import { NextResponse } from "next/server";
import { db } from "@/db";
import { weeks, challenges, weeklyScores } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
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
    // (last in total weekly XP in both of the two most recent scored weeks)
    const berserkerPlayerIds: number[] = [];
    if (week.weekNumber >= 3 && lastScoredWeek && lastScoredWeek.weekNumber >= 2) {
      const prevAllScores = await db
        .select({
          playerId: weeklyScores.playerId,
          totalFinal: weeklyScores.totalFinal,
          weekNumber: weeks.weekNumber,
        })
        .from(weeklyScores)
        .innerJoin(weeks, eq(weeklyScores.weekId, weeks.id))
        .where(and(
          sql`${weeks.weekNumber} >= ${week.weekNumber - 2}`,
          sql`${weeks.weekNumber} < ${week.weekNumber}`
        ));

      const scoresByWeek: Record<number, { playerId: number; totalFinal: number }[]> = {};
      for (const s of prevAllScores) {
        if (!scoresByWeek[s.weekNumber]) scoresByWeek[s.weekNumber] = [];
        scoresByWeek[s.weekNumber].push({ playerId: s.playerId, totalFinal: s.totalFinal });
      }

      const prevWeekNums = Object.keys(scoresByWeek).map(Number);

      if (prevWeekNums.length === 2) {
        const xpRank: Record<number, Record<number, number>> = {};
        for (const wn of prevWeekNums) {
          const sorted = [...scoresByWeek[wn]].sort((a, b) => b.totalFinal - a.totalFinal);
          xpRank[wn] = {};
          for (let i = 0; i < sorted.length; i++) {
            let rank = i + 1;
            for (let j = i - 1; j >= 0; j--) {
              if (sorted[j].totalFinal === sorted[i].totalFinal) rank = j + 1;
              else break;
            }
            xpRank[wn][sorted[i].playerId] = rank;
          }
        }

        const uniquePlayerIds = [...new Set(prevAllScores.map(s => s.playerId))];
        for (const pid of uniquePlayerIds) {
          if (prevWeekNums.every(wn => (xpRank[wn][pid] ?? 0) >= 6)) {
            berserkerPlayerIds.push(pid);
          }
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

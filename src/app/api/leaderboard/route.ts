import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { weeklyScores, players, weeks, submissions, hypeVotes } from "@/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const view = request.nextUrl.searchParams.get("view") || "week";
    const weekId = request.nextUrl.searchParams.get("weekId");

    const allPlayers = await db.select().from(players).where(eq(players.onboardingComplete, true));

    if (view === "week" && weekId) {
      const rawScores = await db
        .select()
        .from(weeklyScores)
        .where(eq(weeklyScores.weekId, Number(weekId)));

      // Find the previous week's xpTotalAfter per player to compute true weekly gain
      const [thisWeek] = await db.select().from(weeks).where(eq(weeks.id, Number(weekId))).limit(1);
      const prevXpMap: Record<number, number> = {};
      if (thisWeek && thisWeek.weekNumber > 1) {
        const [prevWeek] = await db
          .select()
          .from(weeks)
          .where(eq(weeks.weekNumber, thisWeek.weekNumber - 1))
          .limit(1);
        if (prevWeek) {
          const prevScores = await db
            .select({ playerId: weeklyScores.playerId, xpTotalAfter: weeklyScores.xpTotalAfter })
            .from(weeklyScores)
            .where(eq(weeklyScores.weekId, prevWeek.id));
          prevScores.forEach(s => { prevXpMap[s.playerId] = s.xpTotalAfter; });
        }
      }

      // weeklyGained = xpTotalAfter - previous cumulative (includes conquest XP)
      const scores = rawScores
        .map(s => ({
          ...s,
          weeklyGained: Math.round((s.xpTotalAfter - (prevXpMap[s.playerId] || 0)) * 10) / 10,
        }))
        .sort((a, b) => b.weeklyGained - a.weeklyGained);

      const subs = await db
        .select()
        .from(submissions)
        .where(eq(submissions.weekId, Number(weekId)));

      const shields = await db
        .select()
        .from(hypeVotes)
        .where(eq(hypeVotes.weekId, Number(weekId)));

      const shieldCounts: Record<number, number> = {};
      shields.forEach((s) => {
        shieldCounts[s.receiverId] = (shieldCounts[s.receiverId] || 0) + 1;
      });

      const submittedPlayerIds = new Set(subs.map((s) => s.playerId));

      return NextResponse.json({
        scores,
        players: allPlayers,
        submittedPlayerIds: Array.from(submittedPlayerIds),
        shieldCounts,
      });
    }

    if (view === "month") {
      const month = request.nextUrl.searchParams.get("month");
      if (!month) {
        return NextResponse.json({ error: "Month param required" }, { status: 400 });
      }

      const monthWeeks = await db
        .select()
        .from(weeks)
        .where(
          and(
            sql`to_char(${weeks.endDate}::date, 'YYYY-MM') = ${month}`
          )
        );

      const weekIds = monthWeeks.map((w) => w.id);
      if (weekIds.length === 0) {
        return NextResponse.json({ scores: [], players: allPlayers });
      }

      const scores = await db
        .select({
          playerId: weeklyScores.playerId,
          totalPoints: sql<number>`max(${weeklyScores.xpTotalAfter})`,
          xpTotal: sql<number>`max(${weeklyScores.xpTotalAfter})`,
          titleAfter: sql<string>`(array_agg(${weeklyScores.titleAfter} order by ${weeklyScores.weekId} desc))[1]`,
        })
        .from(weeklyScores)
        .where(inArray(weeklyScores.weekId, weekIds))
        .groupBy(weeklyScores.playerId)
        .orderBy(desc(sql`max(${weeklyScores.xpTotalAfter})`));

      return NextResponse.json({ scores, players: allPlayers });
    }

    if (view === "alltime") {
      const scores = await db
        .select({
          playerId: weeklyScores.playerId,
          totalPoints: sql<number>`max(${weeklyScores.xpTotalAfter})`,
          xpTotal: sql<number>`max(${weeklyScores.xpTotalAfter})`,
          titleAfter: sql<string>`(array_agg(${weeklyScores.titleAfter} order by ${weeklyScores.weekId} desc))[1]`,
        })
        .from(weeklyScores)
        .groupBy(weeklyScores.playerId)
        .orderBy(desc(sql`max(${weeklyScores.xpTotalAfter})`));

      return NextResponse.json({ scores, players: allPlayers });
    }

    return NextResponse.json({ error: "Invalid view" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to load leaderboard" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { players, weeklyScores, submissions, hypeVotes, milestones, conquests, weeks, challenges } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const playerId = request.nextUrl.searchParams.get("id");

    if (playerId) {
      const [player] = await db
        .select()
        .from(players)
        .where(eq(players.id, Number(playerId)))
        .limit(1);

      if (!player) {
        return NextResponse.json({ error: "Player not found" }, { status: 404 });
      }

      const rawScores = await db
        .select()
        .from(weeklyScores)
        .where(eq(weeklyScores.playerId, Number(playerId)))
        .orderBy(desc(weeklyScores.weekId));

      const subs = await db
        .select()
        .from(submissions)
        .where(eq(submissions.playerId, Number(playerId)));

      const shieldsReceived = await db
        .select({ count: sql<number>`count(*)` })
        .from(hypeVotes)
        .where(eq(hypeVotes.receiverId, Number(playerId)));

      const shieldsGiven = await db
        .select({ count: sql<number>`count(*)` })
        .from(hypeVotes)
        .where(eq(hypeVotes.giverId, Number(playerId)));

      const playerMilestones = await db
        .select()
        .from(milestones)
        .where(eq(milestones.playerId, Number(playerId)));

      const playerConquests = await db
        .select()
        .from(conquests)
        .where(eq(conquests.playerId, Number(playerId)));

      // Build quest log: join submissions with weeks and challenges
      const allWeeks = await db.select().from(weeks);
      const allChallenges = await db.select().from(challenges);

      const weekMap = Object.fromEntries(allWeeks.map(w => [w.id, w]));
      const challengeMap = Object.fromEntries(allChallenges.map(c => [c.id, c]));

      const scores = rawScores.map(s => ({
        ...s,
        weekNumber: weekMap[s.weekId]?.weekNumber ?? 0,
      }));

      const questLog = subs.map(sub => {
        const week = weekMap[sub.weekId];
        if (!week) return null;
        const solo = week.soloChallengeId ? challengeMap[week.soloChallengeId] : null;
        const second = week.secondChallengeId ? challengeMap[week.secondChallengeId] : null;
        return {
          weekNumber: week.weekNumber,
          weekId: sub.weekId,
          soloChallenge: solo ? { title: solo.title, track: solo.track, difficulty: solo.difficulty } : null,
          soloDone: sub.soloChallengeDone,
          secondChallenge: second ? { title: second.title, track: second.track, difficulty: second.difficulty } : null,
          secondAttempted: sub.secondChallengeAttempted,
          secondResult: sub.secondChallengeResult,
        };
      }).filter(Boolean).sort((a, b) => (b?.weekNumber ?? 0) - (a?.weekNumber ?? 0));

      const totalKm = subs.reduce((sum, s) => sum + s.kmRun, 0);
      const totalRuns = subs.reduce((sum, s) => sum + s.runsCount, 0);
      const totalGym = subs.reduce((sum, s) => sum + s.gymSessions, 0);

      const latestScore = rawScores[0];

      return NextResponse.json({
        player: {
          ...player,
          pinHash: undefined,
        },
        stats: {
          totalKm,
          totalRuns,
          totalGym,
          shieldsReceived: Number(shieldsReceived[0]?.count || 0),
          shieldsGiven: Number(shieldsGiven[0]?.count || 0),
          currentXp: latestScore?.xpTotalAfter || 0,
          currentTitle: latestScore?.titleAfter || "Thrall",
        },
        scores,
        submissions: subs,
        milestones: playerMilestones,
        conquests: playerConquests,
        questLog,
      });
    }

    const allPlayers = await db
      .select({
        id: players.id,
        vikingName: players.vikingName,
        sigil: players.sigil,
        isAdmin: players.isAdmin,
        onboardingComplete: players.onboardingComplete,
      })
      .from(players);

    return NextResponse.json({ players: allPlayers });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

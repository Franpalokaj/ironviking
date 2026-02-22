import { NextResponse } from "next/server";
import { db } from "@/db";
import { players, weeks, challenges, submissions, weeklyScores, hypeVotes, prTrials, milestones, baselines, conquests, inviteTokens } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const [
      allPlayers,
      allWeeks,
      allChallenges,
      allSubmissions,
      allScores,
      allVotes,
      allTrials,
      allMilestones,
      allBaselines,
      allConquests,
      allInvites,
    ] = await Promise.all([
      db.select({ id: players.id, vikingName: players.vikingName, isAdmin: players.isAdmin, weeklyKmGoal: players.weeklyKmGoal, sigil: players.sigil, createdAt: players.createdAt }).from(players),
      db.select().from(weeks),
      db.select().from(challenges),
      db.select().from(submissions),
      db.select().from(weeklyScores),
      db.select().from(hypeVotes),
      db.select().from(prTrials),
      db.select().from(milestones),
      db.select().from(baselines),
      db.select().from(conquests),
      db.select().from(inviteTokens),
    ]);

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      players: allPlayers,
      weeks: allWeeks,
      challenges: allChallenges,
      submissions: allSubmissions,
      weeklyScores: allScores,
      hypeVotes: allVotes,
      prTrials: allTrials,
      milestones: allMilestones,
      baselines: allBaselines,
      conquests: allConquests,
      inviteTokens: allInvites,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

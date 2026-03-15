import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { submissions, hypeVotes, weeks, players } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { getWeekDeadline } from "@/lib/constants";
import { scoreWeek } from "@/lib/scoring";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const {
      weekId,
      kmRun,
      runsCount,
      gymSessions,
      soloChallengeDone,
      secondChallengeResult,
      secondChallengeAttempted,
      hypeVoteFor,
      prTrialResult,
      mtbKm,
      hikingKm,
      swimmingKm,
      ballSportSessions,
    } = body;

    if (!weekId || kmRun === undefined || runsCount === undefined || gymSessions === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (hypeVoteFor && hypeVoteFor === session.playerId) {
      return NextResponse.json({ error: "You cannot vote for yourself" }, { status: 400 });
    }

    const [week] = await db.select().from(weeks).where(eq(weeks.id, weekId)).limit(1);
    if (!week) {
      return NextResponse.json({ error: "Week not found" }, { status: 404 });
    }
    if (week.isLocked) {
      return NextResponse.json({ error: "This week is locked" }, { status: 403 });
    }

    const existing = await db
      .select()
      .from(submissions)
      .where(and(eq(submissions.playerId, session.playerId), eq(submissions.weekId, weekId)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "You have already submitted for this week" }, { status: 409 });
    }

    const now = new Date();
    const weekEnd = getWeekDeadline(week.endDate);
    const isLate = now > weekEnd;

    const [submission] = await db
      .insert(submissions)
      .values({
        playerId: session.playerId,
        weekId,
        kmRun: Number(kmRun),
        runsCount: Number(runsCount),
        gymSessions: Number(gymSessions),
        soloChallengeDone: Boolean(soloChallengeDone),
        secondChallengeResult: secondChallengeResult != null ? Number(secondChallengeResult) : null,
        secondChallengeAttempted: secondChallengeAttempted !== false,
        hypeVoteFor: hypeVoteFor ? Number(hypeVoteFor) : null,
        prTrialResult: prTrialResult != null ? Number(prTrialResult) : null,
        mtbKm: mtbKm != null ? Number(mtbKm) : null,
        hikingKm: hikingKm != null ? Number(hikingKm) : null,
        swimmingKm: swimmingKm != null ? Number(swimmingKm) : null,
        ballSportSessions: ballSportSessions != null ? Number(ballSportSessions) : null,
        submittedAt: now,
        isLate,
      })
      .returning();

    if (hypeVoteFor) {
      await db.insert(hypeVotes).values({
        giverId: session.playerId,
        receiverId: Number(hypeVoteFor),
        weekId,
      });
    }

    // Auto-score if all onboarded players have now submitted
    const allPlayers = await db.select().from(players).where(eq(players.onboardingComplete, true));
    const weekSubs = await db.select().from(submissions).where(eq(submissions.weekId, weekId));
    if (weekSubs.length >= allPlayers.length && allPlayers.length > 0) {
      await scoreWeek(weekId);
    }

    return NextResponse.json({ submission, isLate });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submission failed";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const weekId = request.nextUrl.searchParams.get("weekId");

    if (weekId) {
      const [sub] = await db
        .select()
        .from(submissions)
        .where(
          and(
            eq(submissions.playerId, session.playerId),
            eq(submissions.weekId, Number(weekId))
          )
        )
        .limit(1);
      return NextResponse.json({ submission: sub || null });
    }

    const subs = await db
      .select()
      .from(submissions)
      .where(eq(submissions.playerId, session.playerId));
    return NextResponse.json({ submissions: subs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { submissions, hypeVotes, weeks, players } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

/** Create a submission for a player/week (e.g. retroactive). Works even if the week is locked. Admin must rescore that week afterward. */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const {
      playerId,
      weekId,
      kmRun = 0,
      runsCount = 0,
      gymSessions = 0,
      berserkerGym = false,
      soloChallengeDone = false,
      secondChallengeResult = null,
      secondChallengeAttempted = true,
      buddyChallengeDone = false,
      buddyChallengeResult = null,
      hypeVoteFor = null,
      hypeVoteMessage = null,
      isLate = false,
      prTrialResult = null,
      mtbKm = null,
      hikingKm = null,
      swimmingKm = null,
      ballSportSessions = null,
    } = body;

    if (!playerId || !weekId) {
      return NextResponse.json({ error: "playerId and weekId required" }, { status: 400 });
    }

    const pid = Number(playerId);
    const wid = Number(weekId);

    if (hypeVoteFor != null && Number(hypeVoteFor) === pid) {
      return NextResponse.json({ error: "Cannot hype yourself" }, { status: 400 });
    }

    const [week] = await db.select().from(weeks).where(eq(weeks.id, wid)).limit(1);
    if (!week) return NextResponse.json({ error: "Week not found" }, { status: 404 });

    const [ply] = await db.select().from(players).where(eq(players.id, pid)).limit(1);
    if (!ply) return NextResponse.json({ error: "Player not found" }, { status: 404 });

    const existing = await db
      .select()
      .from(submissions)
      .where(and(eq(submissions.playerId, pid), eq(submissions.weekId, wid)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "This player already has a submission for this week" }, { status: 409 });
    }

    const now = new Date();
    const [submission] = await db
      .insert(submissions)
      .values({
        playerId: pid,
        weekId: wid,
        kmRun: Number(kmRun),
        runsCount: Number(runsCount),
        gymSessions: Number(gymSessions),
        berserkerGym: Boolean(berserkerGym),
        soloChallengeDone: Boolean(soloChallengeDone),
        secondChallengeResult: secondChallengeResult != null && secondChallengeResult !== "" ? Number(secondChallengeResult) : null,
        secondChallengeAttempted: secondChallengeAttempted !== false,
        buddyChallengeDone: Boolean(buddyChallengeDone),
        buddyChallengeResult: buddyChallengeResult != null && buddyChallengeResult !== "" ? Number(buddyChallengeResult) : null,
        hypeVoteFor: hypeVoteFor != null && hypeVoteFor !== "" ? Number(hypeVoteFor) : null,
        prTrialResult: prTrialResult != null ? Number(prTrialResult) : null,
        mtbKm: mtbKm != null ? Number(mtbKm) : null,
        hikingKm: hikingKm != null ? Number(hikingKm) : null,
        swimmingKm: swimmingKm != null ? Number(swimmingKm) : null,
        ballSportSessions: ballSportSessions != null ? Number(ballSportSessions) : null,
        submittedAt: now,
        isLate: Boolean(isLate),
      })
      .returning();

    if (hypeVoteFor != null && hypeVoteFor !== "") {
      const rid = Number(hypeVoteFor);
      const msg =
        typeof hypeVoteMessage === "string" && hypeVoteMessage.trim()
          ? hypeVoteMessage.trim().slice(0, 300)
          : null;
      const dupVote = await db
        .select()
        .from(hypeVotes)
        .where(and(eq(hypeVotes.giverId, pid), eq(hypeVotes.weekId, wid)))
        .limit(1);
      if (dupVote.length === 0) {
        await db.insert(hypeVotes).values({
          giverId: pid,
          receiverId: rid,
          weekId: wid,
          message: msg,
        });
      }
    }

    return NextResponse.json({
      submission,
      hint: week.isLocked ? "Week is locked — open Weeks tab and click Rescore so XP updates for everyone." : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const weekId = request.nextUrl.searchParams.get("weekId");

    if (weekId) {
      const subs = await db
        .select()
        .from(submissions)
        .where(eq(submissions.weekId, Number(weekId)));
      return NextResponse.json({ submissions: subs });
    }

    const allSubs = await db.select().from(submissions);
    return NextResponse.json({ submissions: allSubs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const { submissionId, ...updates } = await request.json();

    if (!submissionId) {
      return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
    }

    await db.update(submissions).set(updates).where(eq(submissions.id, submissionId));
    const [updated] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
    return NextResponse.json({ submission: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const { submissionId } = await request.json();

    if (!submissionId) {
      return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
    }

    await db.delete(submissions).where(eq(submissions.id, submissionId));
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

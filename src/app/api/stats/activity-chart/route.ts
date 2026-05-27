import { NextResponse } from "next/server";
import { db } from "@/db";
import { players, submissions, weeks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    await requireSession();

    const [allPlayers, allWeeks, allSubmissions] = await Promise.all([
      db
        .select({
          id: players.id,
          vikingName: players.vikingName,
          sigil: players.sigil,
        })
        .from(players)
        .where(eq(players.onboardingComplete, true)),
      db
        .select({
          id: weeks.id,
          weekNumber: weeks.weekNumber,
        })
        .from(weeks)
        .orderBy(asc(weeks.weekNumber)),
      db
        .select({
          playerId: submissions.playerId,
          weekId: submissions.weekId,
          kmRun: submissions.kmRun,
          runsCount: submissions.runsCount,
          gymSessions: submissions.gymSessions,
          mtbKm: submissions.mtbKm,
          hikingKm: submissions.hikingKm,
          swimmingKm: submissions.swimmingKm,
          ballSportSessions: submissions.ballSportSessions,
        })
        .from(submissions),
    ]);

    // Map weekId -> weekNumber for the client
    const weekIdToNumber: Record<number, number> = {};
    for (const w of allWeeks) weekIdToNumber[w.id] = w.weekNumber;

    const mappedSubmissions = allSubmissions.map((s) => ({
      playerId: s.playerId,
      weekNumber: weekIdToNumber[s.weekId],
      kmRun: s.kmRun,
      runsCount: s.runsCount,
      gymSessions: s.gymSessions,
      mtbKm: s.mtbKm,
      hikingKm: s.hikingKm,
      swimmingKm: s.swimmingKm,
      ballSportSessions: s.ballSportSessions,
    }));

    return NextResponse.json({
      players: allPlayers,
      weeks: allWeeks.map((w) => w.weekNumber),
      submissions: mappedSubmissions,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Activity chart error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

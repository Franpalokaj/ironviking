import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { weeks, submissions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { scoreWeek } from "@/lib/scoring";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find the most recent unlocked week that has at least one submission.
    // This avoids timezone-boundary issues where getCurrentWeekNumber()
    // might already return the next week at Sunday-midnight CET.
    const unlockedWeeks = await db
      .select()
      .from(weeks)
      .where(eq(weeks.isLocked, false))
      .orderBy(desc(weeks.weekNumber));

    let weekToScore: typeof unlockedWeeks[0] | null = null;
    for (const w of unlockedWeeks) {
      const subs = await db
        .select({ id: submissions.id })
        .from(submissions)
        .where(eq(submissions.weekId, w.id))
        .limit(1);
      if (subs.length > 0) {
        weekToScore = w;
        break;
      }
    }

    if (!weekToScore) {
      return NextResponse.json({ message: "No unlocked week with submissions found" });
    }

    const result = await scoreWeek(weekToScore.id);
    return NextResponse.json({
      message: result.message,
      weekNumber: weekToScore.weekNumber,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron scoring failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

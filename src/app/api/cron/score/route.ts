import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { weeks, submissions } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { scoreWeek } from "@/lib/scoring";
import { getWeekDeadline } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Score ALL unlocked weeks whose deadline has passed and that have
    // at least one submission.  Process oldest first so cumulative XP
    // totals stay correct.
    const now = new Date();
    const unlockedWeeks = await db
      .select()
      .from(weeks)
      .where(eq(weeks.isLocked, false))
      .orderBy(asc(weeks.weekNumber));

    const scored: { weekNumber: number; message: string }[] = [];

    for (const w of unlockedWeeks) {
      const deadline = getWeekDeadline(w.endDate);
      if (now <= deadline) continue; // week still open

      const subs = await db
        .select({ id: submissions.id })
        .from(submissions)
        .where(eq(submissions.weekId, w.id))
        .limit(1);
      if (subs.length === 0) continue; // no submissions

      const result = await scoreWeek(w.id);
      scored.push({ weekNumber: w.weekNumber, message: result.message });
    }

    if (scored.length === 0) {
      return NextResponse.json({ message: "No weeks to score" });
    }

    return NextResponse.json({ scored });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron scoring failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

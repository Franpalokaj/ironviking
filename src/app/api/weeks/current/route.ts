import { NextResponse } from "next/server";
import { db } from "@/db";
import { weeks, challenges } from "@/db/schema";
import { eq } from "drizzle-orm";
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

    if (week.soloChallengeId) {
      const [c] = await db.select().from(challenges).where(eq(challenges.id, week.soloChallengeId)).limit(1);
      soloChallenge = c || null;
    }

    if (week.secondChallengeId) {
      const [c] = await db.select().from(challenges).where(eq(challenges.id, week.secondChallengeId)).limit(1);
      secondChallenge = c || null;
    }

    return NextResponse.json({ week, soloChallenge, secondChallenge });
  } catch {
    return NextResponse.json({ error: "Failed to load week" }, { status: 500 });
  }
}

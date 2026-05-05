import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { weeks, challenges } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const weekNumber = request.nextUrl.searchParams.get("n");
    if (!weekNumber) {
      return NextResponse.json({ error: "Missing week number" }, { status: 400 });
    }

    const [week] = await db
      .select()
      .from(weeks)
      .where(eq(weeks.weekNumber, Number(weekNumber)))
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

    return NextResponse.json({
      week,
      soloChallenge,
      secondChallenge,
      buddyChallenge,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load week" }, { status: 500 });
  }
}

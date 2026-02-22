import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { prTrials, weeks, baselines } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { getCurrentWeekNumber } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const { skill, skillLabel } = await request.json();

    if (!skill) {
      return NextResponse.json({ error: "Skill is required" }, { status: 400 });
    }

    const weekNum = getCurrentWeekNumber();
    const [currentWeek] = await db
      .select()
      .from(weeks)
      .where(eq(weeks.weekNumber, weekNum))
      .limit(1);

    const [nextWeek] = await db
      .select()
      .from(weeks)
      .where(eq(weeks.weekNumber, weekNum + 1))
      .limit(1);

    if (!nextWeek) {
      return NextResponse.json({ error: "No next week available" }, { status: 400 });
    }

    const [baseline] = await db
      .select()
      .from(baselines)
      .where(and(eq(baselines.playerId, session.playerId), eq(baselines.skill, skill)))
      .limit(1);

    const previousBest = baseline?.value || 0;

    const [trial] = await db
      .insert(prTrials)
      .values({
        playerId: session.playerId,
        weekId: nextWeek.id,
        declaredWeekId: currentWeek.id,
        skill,
        skillLabel: skillLabel || null,
        previousBest,
      })
      .returning();

    return NextResponse.json({ trial });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const trials = await db
      .select()
      .from(prTrials)
      .where(eq(prTrials.playerId, session.playerId));
    return NextResponse.json({ trials });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

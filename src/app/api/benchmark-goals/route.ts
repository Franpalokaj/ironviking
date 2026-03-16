import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { benchmarkGoals, baselines } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { BENCHMARK_DEFINITIONS, calculateBenchmarkXP } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const { skill, goalValue } = await request.json();

    if (!skill || goalValue === undefined) {
      return NextResponse.json({ error: "skill and goalValue required" }, { status: 400 });
    }

    const def = BENCHMARK_DEFINITIONS.find(d => d.skill === skill);
    if (!def) {
      return NextResponse.json({ error: "Unknown benchmark skill" }, { status: 400 });
    }

    // Require a recorded baseline before setting a goal
    const [baseline] = await db
      .select()
      .from(baselines)
      .where(and(eq(baselines.playerId, session.playerId), eq(baselines.skill, skill)))
      .limit(1);

    if (!baseline) {
      return NextResponse.json(
        { error: "Record a baseline for this skill first (use Record / Update)" },
        { status: 400 }
      );
    }

    const currentValue = baseline.value;
    const xpReward = calculateBenchmarkXP(skill, Number(goalValue), currentValue);

    // Upsert: one goal per player per skill
    const [existing] = await db
      .select()
      .from(benchmarkGoals)
      .where(and(eq(benchmarkGoals.playerId, session.playerId), eq(benchmarkGoals.skill, skill)))
      .limit(1);

    let goal;
    if (existing && !existing.achieved) {
      [goal] = await db
        .update(benchmarkGoals)
        .set({ goalValue: Number(goalValue), xpReward })
        .where(eq(benchmarkGoals.id, existing.id))
        .returning();
    } else if (!existing) {
      [goal] = await db
        .insert(benchmarkGoals)
        .values({ playerId: session.playerId, skill, goalValue: Number(goalValue), xpReward })
        .returning();
    } else {
      return NextResponse.json({ error: "Goal already achieved" }, { status: 409 });
    }

    return NextResponse.json({ goal });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

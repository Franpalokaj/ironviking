import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { baselines, benchmarkGoals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { BENCHMARK_DEFINITIONS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const playerId = request.nextUrl.searchParams.get("playerId")
      ? Number(request.nextUrl.searchParams.get("playerId"))
      : session.playerId;

    const playerBaselines = await db
      .select()
      .from(baselines)
      .where(eq(baselines.playerId, playerId));

    const playerGoals = await db
      .select()
      .from(benchmarkGoals)
      .where(eq(benchmarkGoals.playerId, playerId));

    return NextResponse.json({ baselines: playerBaselines, goals: playerGoals });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const { skill, value } = await request.json();

    if (!skill || value === undefined || value === null) {
      return NextResponse.json({ error: "skill and value required" }, { status: 400 });
    }

    // Check if a baseline already exists for this skill
    const [existing] = await db
      .select()
      .from(baselines)
      .where(and(eq(baselines.playerId, session.playerId), eq(baselines.skill, skill)))
      .limit(1);

    let baseline;
    if (existing) {
      [baseline] = await db
        .update(baselines)
        .set({ value: Number(value), setAt: new Date() })
        .where(eq(baselines.id, existing.id))
        .returning();
    } else {
      [baseline] = await db
        .insert(baselines)
        .values({ playerId: session.playerId, skill, value: Number(value), setAt: new Date() })
        .returning();
    }

    // Check if any benchmark goals are now achieved
    const def = BENCHMARK_DEFINITIONS.find(d => d.skill === skill);
    if (def) {
      const goals = await db
        .select()
        .from(benchmarkGoals)
        .where(and(
          eq(benchmarkGoals.playerId, session.playerId),
          eq(benchmarkGoals.skill, skill),
          eq(benchmarkGoals.achieved, false),
        ));

      for (const goal of goals) {
        const achieved = def.higherIsBetter
          ? Number(value) >= goal.goalValue
          : Number(value) <= goal.goalValue;

        if (achieved) {
          await db
            .update(benchmarkGoals)
            .set({ achieved: true, achievedAt: new Date() })
            .where(eq(benchmarkGoals.id, goal.id));
        }
      }
    }

    return NextResponse.json({ baseline });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

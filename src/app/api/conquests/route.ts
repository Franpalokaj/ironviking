import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conquests, weeklyScores } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const playerId = request.nextUrl.searchParams.get("playerId");
    const id = playerId ? Number(playerId) : session.playerId;

    const playerConquests = await db
      .select()
      .from(conquests)
      .where(eq(conquests.playerId, id));

    return NextResponse.json({ conquests: playerConquests });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    const { conquestId, completed } = await request.json();

    if (!conquestId) {
      return NextResponse.json({ error: "conquestId required" }, { status: 400 });
    }

    const [conquest] = await db
      .select()
      .from(conquests)
      .where(and(eq(conquests.id, conquestId), eq(conquests.playerId, session.playerId)))
      .limit(1);

    if (!conquest) {
      return NextResponse.json({ error: "Conquest not found" }, { status: 404 });
    }

    if (conquest.completed) {
      return NextResponse.json({ error: "Already completed" }, { status: 400 });
    }

    await db
      .update(conquests)
      .set({ completed: true, completedAt: new Date() })
      .where(eq(conquests.id, conquestId));

    // Award XP: add to the player's latest weekly score xpTotalAfter
    // (If no scores yet, XP will be picked up next scoring run)
    const [latestScore] = await db
      .select()
      .from(weeklyScores)
      .where(eq(weeklyScores.playerId, session.playerId))
      .orderBy(desc(weeklyScores.weekId))
      .limit(1);

    if (latestScore) {
      await db
        .update(weeklyScores)
        .set({ xpTotalAfter: latestScore.xpTotalAfter + conquest.xpReward })
        .where(eq(weeklyScores.id, latestScore.id));
    }

    return NextResponse.json({ success: true, xpAwarded: conquest.xpReward });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

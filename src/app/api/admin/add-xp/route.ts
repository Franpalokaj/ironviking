import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { players, weeklyScores } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const { playerId, amount } = await request.json();

    if (!playerId || amount == null) {
      return NextResponse.json({ error: "playerId and amount required" }, { status: 400 });
    }

    const xp = Math.round(Number(amount));
    if (!Number.isFinite(xp) || xp < 1) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.id, Number(playerId)))
      .limit(1);

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const [latest] = await db
      .select()
      .from(weeklyScores)
      .where(eq(weeklyScores.playerId, player.id))
      .orderBy(desc(weeklyScores.weekId))
      .limit(1);

    if (!latest) {
      return NextResponse.json({ error: "Player has no weekly scores yet. Score a week first." }, { status: 400 });
    }

    const newTotal = Math.round((latest.xpTotalAfter + xp) * 10) / 10;
    await db
      .update(weeklyScores)
      .set({ xpTotalAfter: newTotal })
      .where(eq(weeklyScores.id, latest.id));

    return NextResponse.json({
      success: true,
      message: `Added ${xp} XP to ${player.vikingName}. New total: ${newTotal}.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Failed to add XP" }, { status: 500 });
  }
}

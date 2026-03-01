import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const { playerId, sigil, weeklyKmGoal, vikingName } = await request.json();

    if (!playerId) {
      return NextResponse.json({ error: "playerId required" }, { status: 400 });
    }

    const updates: Partial<{ sigil: string; weeklyKmGoal: number; vikingName: string }> = {};
    if (sigil !== undefined) updates.sigil = sigil;
    if (weeklyKmGoal !== undefined) updates.weeklyKmGoal = Number(weeklyKmGoal);
    if (vikingName !== undefined) updates.vikingName = vikingName;

    const [updated] = await db
      .update(players)
      .set(updates)
      .where(eq(players.id, Number(playerId)))
      .returning();

    return NextResponse.json({ player: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update player" }, { status: 500 });
  }
}

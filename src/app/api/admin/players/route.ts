import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const {
      playerId,
      sigil,
      weeklyKmGoal,
      vikingName,
      clearCatchUp,
      catchUpXpMultiplier,
      catchUpStartWeek,
      catchUpEndWeek,
      buddyTeamId,
    } = body;

    if (!playerId) {
      return NextResponse.json({ error: "playerId required" }, { status: 400 });
    }

    if (clearCatchUp === true) {
      const [updated] = await db
        .update(players)
        .set({
          catchUpXpMultiplier: 1,
          catchUpStartWeek: null,
          catchUpEndWeek: null,
        })
        .where(eq(players.id, Number(playerId)))
        .returning();
      return NextResponse.json({ player: updated });
    }

    const patch: {
      sigil?: string;
      weeklyKmGoal?: number;
      vikingName?: string;
      buddyTeamId?: number | null;
      catchUpXpMultiplier?: number;
      catchUpStartWeek?: number | null;
      catchUpEndWeek?: number | null;
    } = {};

    if (sigil !== undefined) patch.sigil = sigil;
    if (weeklyKmGoal !== undefined) patch.weeklyKmGoal = Number(weeklyKmGoal);
    if (buddyTeamId !== undefined) patch.buddyTeamId = buddyTeamId != null ? Number(buddyTeamId) : null;
    if (vikingName !== undefined) {
      const n = String(vikingName).trim().normalize("NFC");
      if (n) patch.vikingName = n;
    }

    if (catchUpXpMultiplier !== undefined || catchUpStartWeek !== undefined || catchUpEndWeek !== undefined) {
      if (
        catchUpXpMultiplier === undefined ||
        catchUpStartWeek === undefined ||
        catchUpEndWeek === undefined
      ) {
        return NextResponse.json(
          { error: "Catch-up requires catchUpXpMultiplier, catchUpStartWeek, and catchUpEndWeek together" },
          { status: 400 }
        );
      }
      const mult = Number(catchUpXpMultiplier);
      const start = Number(catchUpStartWeek);
      const end = Number(catchUpEndWeek);
      if (!Number.isFinite(mult) || mult < 1 || mult > 5) {
        return NextResponse.json({ error: "catchUpXpMultiplier must be between 1 and 5" }, { status: 400 });
      }
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
        return NextResponse.json({ error: "Invalid catch-up week range" }, { status: 400 });
      }
      patch.catchUpXpMultiplier = mult;
      patch.catchUpStartWeek = start;
      patch.catchUpEndWeek = end;
    }

    if (Object.keys(patch).length === 0) {
      const [p] = await db.select().from(players).where(eq(players.id, Number(playerId))).limit(1);
      return NextResponse.json({ player: p });
    }

    const [updated] = await db
      .update(players)
      .set(patch)
      .where(eq(players.id, Number(playerId)))
      .returning();

    return NextResponse.json({ player: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "Unauthorized" || msg === "Forbidden") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Failed to update player" }, { status: 500 });
  }
}

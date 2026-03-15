import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conquests, weeklyScores } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireSession, requireAdmin } from "@/lib/auth";

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

// Create a new conquest — players create their own; admins can target any playerId
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { title, description, xpReward, playerId: targetId } = body;

    if (!title || !description || !xpReward) {
      return NextResponse.json({ error: "title, description, and xpReward required" }, { status: 400 });
    }

    // Admins can create for any player; others can only create for themselves
    const resolvedPlayerId = session.isAdmin && targetId ? Number(targetId) : session.playerId;

    const [conquest] = await db
      .insert(conquests)
      .values({
        playerId: resolvedPlayerId,
        title,
        description,
        xpReward: Number(xpReward),
        isCustom: true,
        adminApproved: true,
        completed: false,
      })
      .returning();

    return NextResponse.json({ conquest });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Mark complete — players can complete their own; admins can complete any
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    const { conquestId, completed } = await request.json();

    if (!conquestId) {
      return NextResponse.json({ error: "conquestId required" }, { status: 400 });
    }

    // Find conquest — admins can access any; others only their own
    const whereClause = session.isAdmin
      ? eq(conquests.id, conquestId)
      : and(eq(conquests.id, conquestId), eq(conquests.playerId, session.playerId));

    const [conquest] = await db
      .select()
      .from(conquests)
      .where(whereClause)
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

    // Award XP on the quest owner's latest weekly score
    const [latestScore] = await db
      .select()
      .from(weeklyScores)
      .where(eq(weeklyScores.playerId, conquest.playerId))
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

// Update a conquest (title, description, xpReward) — admin only
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { conquestId, title, description, xpReward } = body;

    if (!conquestId) {
      return NextResponse.json({ error: "conquestId required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(conquests)
      .where(eq(conquests.id, conquestId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Conquest not found" }, { status: 404 });
    }

    const updates: { title?: string; description?: string; xpReward?: number } = {};
    if (typeof title === "string" && title.trim()) updates.title = title.trim();
    if (typeof description === "string") updates.description = description.trim();
    if (typeof xpReward === "number" && xpReward >= 0) updates.xpReward = xpReward;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(existing);
    }

    const [updated] = await db
      .update(conquests)
      .set(updates)
      .where(eq(conquests.id, conquestId))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Delete a conquest — admin only
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const { conquestId } = await request.json();

    if (!conquestId) {
      return NextResponse.json({ error: "conquestId required" }, { status: 400 });
    }

    await db.delete(conquests).where(eq(conquests.id, conquestId));

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireSession, requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const allChallenges = await db.select().from(challenges);
    return NextResponse.json({ challenges: allChallenges });
  } catch {
    return NextResponse.json({ error: "Failed to load challenges" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();

    const { title, description, track, dataType, targetValue, phase, difficulty } = body;

    if (!title || !description || !track || !phase) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [challenge] = await db
      .insert(challenges)
      .values({
        title,
        description,
        track,
        dataType: dataType || null,
        targetValue: targetValue || null,
        phase,
        difficulty: difficulty || "normal",
        submittedBy: session.playerId,
        used: false,
      })
      .returning();

    return NextResponse.json({ challenge });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Update an existing challenge — admin only
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { challengeId, title, description, track, dataType, targetValue, phase, difficulty } = body;

    if (!challengeId) {
      return NextResponse.json({ error: "challengeId required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, Number(challengeId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    const updates: Partial<{
      title: string;
      description: string;
      track: string;
      dataType: string | null;
      targetValue: number | null;
      phase: string;
      difficulty: string;
    }> = {};
    if (typeof title === "string" && title.trim()) updates.title = title.trim();
    if (typeof description === "string") updates.description = description.trim();
    if (typeof track === "string" && track.trim()) updates.track = track.trim();
    if (dataType !== undefined) updates.dataType = dataType === null || dataType === "" ? null : String(dataType);
    if (targetValue !== undefined) updates.targetValue = targetValue === null || targetValue === "" ? null : Number(targetValue);
    if (typeof phase === "string" && phase.trim()) updates.phase = phase.trim();
    if (typeof difficulty === "string" && difficulty.trim()) updates.difficulty = difficulty.trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(existing);
    }

    const [updated] = await db
      .update(challenges)
      .set(updates)
      .where(eq(challenges.id, Number(challengeId)))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

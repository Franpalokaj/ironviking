import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { requireSession } from "@/lib/auth";

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

    const { title, description, track, dataType, targetValue, phase } = body;

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

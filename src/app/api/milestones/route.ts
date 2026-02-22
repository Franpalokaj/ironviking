import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { milestones } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSession();
    const uncelebrated = await db
      .select()
      .from(milestones)
      .where(
        and(
          eq(milestones.playerId, session.playerId),
          eq(milestones.celebrated, false)
        )
      );
    return NextResponse.json({ milestones: uncelebrated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireSession();
    const { milestoneId } = await request.json();

    await db
      .update(milestones)
      .set({ celebrated: true })
      .where(eq(milestones.id, milestoneId));

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

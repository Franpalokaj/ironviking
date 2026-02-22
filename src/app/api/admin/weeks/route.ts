import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { weeks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const { weekId, soloChallengeId, secondChallengeId } = await request.json();

    if (!weekId) {
      return NextResponse.json({ error: "weekId is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (soloChallengeId !== undefined) updates.soloChallengeId = soloChallengeId;
    if (secondChallengeId !== undefined) updates.secondChallengeId = secondChallengeId;

    await db.update(weeks).set(updates).where(eq(weeks.id, weekId));

    const [updated] = await db.select().from(weeks).where(eq(weeks.id, weekId)).limit(1);
    return NextResponse.json({ week: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await requireAdmin();
    const allWeeks = await db.select().from(weeks);
    return NextResponse.json({ weeks: allWeeks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

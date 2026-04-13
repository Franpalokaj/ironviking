import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const weekId = request.nextUrl.searchParams.get("weekId");
    const playerId = request.nextUrl.searchParams.get("playerId");

    if (!weekId || !playerId) {
      return NextResponse.json({ error: "weekId and playerId required" }, { status: 400 });
    }

    const [sub] = await db
      .select({
        buddyChallengeDone: submissions.buddyChallengeDone,
        buddyChallengeResult: submissions.buddyChallengeResult,
      })
      .from(submissions)
      .where(
        and(
          eq(submissions.playerId, Number(playerId)),
          eq(submissions.weekId, Number(weekId))
        )
      )
      .limit(1);

    return NextResponse.json(sub || { buddyChallengeDone: false, buddyChallengeResult: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

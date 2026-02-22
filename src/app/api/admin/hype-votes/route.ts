import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { hypeVotes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const weekId = request.nextUrl.searchParams.get("weekId");

    if (weekId) {
      const votes = await db
        .select()
        .from(hypeVotes)
        .where(eq(hypeVotes.weekId, Number(weekId)));
      return NextResponse.json({ votes });
    }

    const allVotes = await db.select().from(hypeVotes);
    return NextResponse.json({ votes: allVotes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

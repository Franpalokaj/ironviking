import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { weeks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scoreWeek } from "@/lib/scoring";
import { getCurrentWeekNumber } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const currentWeekNumber = getCurrentWeekNumber();

    const [week] = await db
      .select()
      .from(weeks)
      .where(eq(weeks.weekNumber, currentWeekNumber))
      .limit(1);

    if (!week) {
      return NextResponse.json({ message: "No current week found" });
    }

    if (week.isLocked) {
      return NextResponse.json({ message: `Week ${currentWeekNumber} already scored` });
    }

    const result = await scoreWeek(week.id);
    return NextResponse.json({ message: result.message });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron scoring failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

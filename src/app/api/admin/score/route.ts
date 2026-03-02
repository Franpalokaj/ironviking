import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { scoreWeek } from "@/lib/scoring";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const { weekId, force } = await request.json();

    if (!weekId) {
      return NextResponse.json({ error: "weekId is required" }, { status: 400 });
    }

    const result = await scoreWeek(weekId, !!force);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

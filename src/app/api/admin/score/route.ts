import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { scoreWeek } from "@/lib/scoring";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const { weekId, force, groupChallengeOverride } = await request.json();

    if (!weekId) {
      return NextResponse.json({ error: "weekId is required" }, { status: 400 });
    }

    const override = groupChallengeOverride === true ? true : groupChallengeOverride === false ? false : null;
    const result = await scoreWeek(weekId, !!force, override);
    return NextResponse.json(
      { ...result, message: result.detail ? `${result.message} ${result.detail}` : result.message },
      { status: result.success ? 200 : 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

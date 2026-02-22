import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { prTrials } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const pending = await db
      .select()
      .from(prTrials)
      .where(isNull(prTrials.success));
    return NextResponse.json({ trials: pending });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const { trialId, success } = await request.json();

    if (!trialId || success === undefined) {
      return NextResponse.json({ error: "trialId and success are required" }, { status: 400 });
    }

    await db
      .update(prTrials)
      .set({ success: Boolean(success) })
      .where(eq(prTrials.id, trialId));

    const [updated] = await db.select().from(prTrials).where(eq(prTrials.id, trialId)).limit(1);
    return NextResponse.json({ trial: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

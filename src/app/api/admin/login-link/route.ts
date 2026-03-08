import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { players, loginLinks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { generateToken } from "@/lib/utils";

const EXPIRY_HOURS = 24;

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const { playerId } = await request.json();

    if (!playerId) {
      return NextResponse.json({ error: "playerId required" }, { status: 400 });
    }

    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.id, Number(playerId)))
      .limit(1);

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const token = generateToken(24);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + EXPIRY_HOURS);

    await db.insert(loginLinks).values({
      token,
      playerId: player.id,
      expiresAt,
    });

    return NextResponse.json({
      token,
      expiresAt: expiresAt.toISOString(),
      message: "Link valid for 24 hours. Copy and send it to the warrior.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Failed to create login link" }, { status: 500 });
  }
}

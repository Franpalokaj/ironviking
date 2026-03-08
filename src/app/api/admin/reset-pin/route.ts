import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin, hashPin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const { playerId, newPin } = await request.json();

    if (!playerId || newPin == null) {
      return NextResponse.json({ error: "playerId and newPin required" }, { status: 400 });
    }

    const pin = String(newPin).trim().replace(/\s/g, "");
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
    }

    const pinHash = await hashPin(pin);
    const [updated] = await db
      .update(players)
      .set({ pinHash })
      .where(eq(players.id, Number(playerId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "PIN updated. Share the new PIN with the warrior." });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Failed to reset PIN" }, { status: 500 });
  }
}

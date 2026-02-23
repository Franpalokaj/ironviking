import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { players } from "@/db/schema";
import { sql } from "drizzle-orm";
import { verifyPin, signToken, setTokenCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { vikingName, pin } = await request.json();

    if (!vikingName || !pin) {
      return NextResponse.json({ error: "Name and PIN are required" }, { status: 400 });
    }

    const [player] = await db
      .select()
      .from(players)
      .where(sql`lower(${players.vikingName}) = ${vikingName.toLowerCase()}`)
      .limit(1);

    if (!player) {
      return NextResponse.json({ error: "Warrior not found" }, { status: 401 });
    }

    const valid = await verifyPin(pin, player.pinHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid rune-code" }, { status: 401 });
    }

    const token = signToken({
      playerId: player.id,
      vikingName: player.vikingName!,
      isAdmin: player.isAdmin,
    });

    const cookie = setTokenCookie(token);
    const response = NextResponse.json({
      player: {
        id: player.id,
        vikingName: player.vikingName,
        isAdmin: player.isAdmin,
        sigil: player.sigil,
      },
    });

    response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2]);
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { players } from "@/db/schema";
import { sql } from "drizzle-orm";
import { verifyPin, signToken, setTokenCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawName = body.vikingName;
    const rawPin = body.pin;

    if (rawName == null || rawPin == null) {
      return NextResponse.json({ error: "Name and PIN are required" }, { status: 400 });
    }

    const vikingName = String(rawName).trim().normalize("NFC");
    const pin = String(rawPin).trim().replace(/\s/g, "");

    if (!vikingName || !pin) {
      return NextResponse.json({ error: "Name and PIN are required" }, { status: 400 });
    }

    const nameLower = vikingName.toLowerCase().normalize("NFC");
    const [player] = await db
      .select()
      .from(players)
      .where(sql`lower(trim(${players.vikingName})) = ${nameLower}`)
      .limit(1);

    if (!player) {
      return NextResponse.json({ error: "Warrior not found. Check your name (including spelling and special characters)." }, { status: 401 });
    }

    const valid = await verifyPin(pin, player.pinHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid rune-code. Check your 4-digit PIN." }, { status: 401 });
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

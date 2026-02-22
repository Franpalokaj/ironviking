import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inviteTokens, players, conquests } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { hashPin, signToken, setTokenCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const rune = request.nextUrl.searchParams.get("rune");
  if (!rune) {
    return NextResponse.json({ error: "No rune provided" }, { status: 400 });
  }

  const [token] = await db
    .select()
    .from(inviteTokens)
    .where(and(eq(inviteTokens.token, rune), isNull(inviteTokens.usedAt)))
    .limit(1);

  if (!token) {
    return NextResponse.json({ error: "Invalid or expired rune" }, { status: 404 });
  }

  if (new Date() > token.expiresAt) {
    return NextResponse.json({ error: "This rune has expired" }, { status: 410 });
  }

  return NextResponse.json({ valid: true, playerSlot: token.playerSlot });
}

export async function POST(request: NextRequest) {
  try {
    const { rune, vikingName, pin, sigil, conquests: selectedConquests } = await request.json();

    if (!rune || !vikingName || !pin || !sigil) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
    }

    const [token] = await db
      .select()
      .from(inviteTokens)
      .where(and(eq(inviteTokens.token, rune), isNull(inviteTokens.usedAt)))
      .limit(1);

    if (!token) {
      return NextResponse.json({ error: "Invalid or used rune" }, { status: 404 });
    }

    if (new Date() > token.expiresAt) {
      return NextResponse.json({ error: "This rune has expired" }, { status: 410 });
    }

    const existing = await db
      .select()
      .from(players)
      .where(eq(players.vikingName, vikingName))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "Another warrior already bears this name. Choose another." }, { status: 409 });
    }

    const pinHash = await hashPin(pin);

    const [player] = await db
      .insert(players)
      .values({
        vikingName,
        pinHash,
        isAdmin: false,
        sigil,
        onboardingComplete: true,
      })
      .returning();

    // Insert player conquests
    if (selectedConquests && Array.isArray(selectedConquests)) {
      for (const c of selectedConquests) {
        await db.insert(conquests).values({
          playerId: player.id,
          title: c.title,
          description: c.description || "",
          xpReward: c.xpReward || 50,
          isCustom: c.isCustom || false,
          adminApproved: !c.isCustom,
        });
      }
    }

    await db
      .update(inviteTokens)
      .set({ usedAt: new Date(), usedByPlayer: player.id })
      .where(eq(inviteTokens.id, token.id));

    const jwtToken = signToken({
      playerId: player.id,
      vikingName: player.vikingName!,
      isAdmin: player.isAdmin,
    });

    const cookie = setTokenCookie(jwtToken);
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
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { players, inviteTokens, conquests } from "@/db/schema";
import { hashPin, signToken, setTokenCookie } from "@/lib/auth";
import { generateToken } from "@/lib/utils";
import { sql } from "drizzle-orm";

export async function GET() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(players);
  return NextResponse.json({ hasPlayers: Number(count) > 0 });
}

export async function POST(request: NextRequest) {
  try {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(players);
    if (Number(count) > 0) {
      return NextResponse.json({ error: "Setup already complete" }, { status: 400 });
    }

    const { vikingName, pin, sigil, conquests: selectedConquests } = await request.json();

    if (!vikingName || !pin || !sigil) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    const pinHash = await hashPin(pin);

    const [player] = await db
      .insert(players)
      .values({
        vikingName,
        pinHash,
        isAdmin: true,
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

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const generatedInvites = [];
    for (let slot = 2; slot <= 6; slot++) {
      const token = generateToken(5);
      const [invite] = await db
        .insert(inviteTokens)
        .values({ token, playerSlot: slot, expiresAt })
        .returning();
      generatedInvites.push(invite);
    }

    const jwtToken = signToken({
      playerId: player.id,
      vikingName: player.vikingName!,
      isAdmin: true,
    });

    const cookie = setTokenCookie(jwtToken);
    const response = NextResponse.json({
      player: { id: player.id, vikingName: player.vikingName, isAdmin: true, sigil: player.sigil },
      invites: generatedInvites,
    });

    response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2]);
    return response;
  } catch {
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { players, loginLinks } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { signToken, setTokenCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.redirect(new URL("/login?error=missing", request.url));
    }

    const [link] = await db
      .select()
      .from(loginLinks)
      .where(and(eq(loginLinks.token, token), isNull(loginLinks.usedAt)))
      .limit(1);

    if (!link) {
      return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));
    }
    if (new Date() > link.expiresAt) {
      return NextResponse.redirect(new URL("/login?error=expired", request.url));
    }

    const [player] = await db.select().from(players).where(eq(players.id, link.playerId)).limit(1);
    if (!player) {
      return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));
    }

    await db.update(loginLinks).set({ usedAt: new Date() }).where(eq(loginLinks.id, link.id));

    const jwtToken = signToken({
      playerId: player.id,
      vikingName: player.vikingName!,
      isAdmin: player.isAdmin,
    });
    const cookie = setTokenCookie(jwtToken);
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2]);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=failed", request.url));
  }
}

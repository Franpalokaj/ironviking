import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inviteTokens, players } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { generateToken } from "@/lib/utils";
import { sql, eq } from "drizzle-orm";

const MAX_PLAYERS = 10;

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => ({}));
    const count = Math.min(Math.max(body.count || 1, 1), 4);

    const [{ playerCount }] = await db.select({ playerCount: sql<number>`count(*)` }).from(players);
    const allInvites = await db.select().from(inviteTokens);
    const pendingInvites = allInvites.filter(i => !i.usedAt);

    if (Number(playerCount) + pendingInvites.length + count > MAX_PLAYERS) {
      return NextResponse.json(
        { error: `Would exceed ${MAX_PLAYERS} player cap. Currently ${playerCount} players + ${pendingInvites.length} pending invites.` },
        { status: 400 }
      );
    }

    const maxSlot = allInvites.length > 0
      ? Math.max(...allInvites.map(i => i.playerSlot))
      : 0;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const tokens = [];
    for (let i = 0; i < count; i++) {
      const token = generateToken(5);
      const [invite] = await db
        .insert(inviteTokens)
        .values({
          token,
          playerSlot: maxSlot + i + 1,
          expiresAt,
        })
        .returning();
      tokens.push(invite);
    }

    return NextResponse.json({ invites: tokens });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await requireAdmin();
    const invites = await db.select().from(inviteTokens);
    return NextResponse.json({ invites });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await db.delete(inviteTokens).where(eq(inviteTokens.id, Number(id)));
    return NextResponse.json({ success: true });
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
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const newToken = generateToken(5);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const [updated] = await db
      .update(inviteTokens)
      .set({ token: newToken, expiresAt })
      .where(eq(inviteTokens.id, Number(id)))
      .returning();

    return NextResponse.json({ invite: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

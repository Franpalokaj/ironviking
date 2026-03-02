"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SIGIL_EMOJIS, type Sigil, TITLE_STYLES } from "@/lib/constants";

interface RevealPlayer {
  playerId: number;
  vikingName: string;
  sigil: string;
  rank: number;
  prevRank: number;
  totalFinal: number;
  titleAfter: string;
}

interface LeaderboardRevealProps {
  players: RevealPlayer[];
  myPlayerId: number;
  onDismiss: () => void;
}

const REALM_MESSAGES: Record<number, { up: string; down: string; same: string }> = {
  1: { up: "You sit among the gods. Asgard bows to its champion.", down: "You sit among the gods. Asgard bows to its champion.", same: "You hold Asgard. The gods nod." },
  2: { up: "Vanaheim honours your rising strength, warrior.", down: "The halls of Vanaheim await you. Reclaim them.", same: "Vanaheim holds firm. Keep pushing." },
  3: { up: "The light of Alfheim shines upon you. Well earned.", down: "Alfheim remains within reach. One more push.", same: "Alfheim recognises your steady blade." },
  4: { up: "You hold the line in Midgard. Onwards.", down: "Midgard is a battlefield. Fight through it.", same: "Midgard endures. So do you." },
  5: { up: "The frost giants grow bold. Reclaim your honour.", down: "Jotunheim tests the worthy. You will rise.", same: "Jotunheim's cold reminds you why you train." },
  6: { up: "You've clawed from the depths. The gods took notice.", down: "The mists of Niflheim surround you. Rise, warrior.", same: "Niflheim is not your fate. Rise." },
};

function getRankMessage(rank: number, prevRank: number): string {
  const msgs = REALM_MESSAGES[rank] || REALM_MESSAGES[6];
  if (rank < prevRank) return msgs.up;
  if (rank > prevRank) return msgs.down;
  return msgs.same;
}

const CARD_HEIGHT = 60;
const CARD_GAP = 8;

export default function LeaderboardReveal({ players, myPlayerId, onDismiss }: LeaderboardRevealProps) {
  const [phase, setPhase] = useState<"intro" | "old" | "shuffle" | "highlight">("intro");
  const me = players.find(p => p.playerId === myPlayerId);

  // Sorted arrays — stable across renders
  const byPrev = useRef(
    [...players].sort((a, b) => a.prevRank - b.prevRank)
  ).current;

  const thudAudio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const a = new Audio("/sounds/thud.mp3");
      a.volume = 0.85;
      a.load();
      thudAudio.current = a;
    } catch { /* audio not available */ }
  }, []);

  const playThud = useCallback(() => {
    const a = thudAudio.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  }, []);

  // Phase transitions — double rAF before shuffle ensures mobile paints the "old" frame first
  useEffect(() => {
    if (phase === "intro") {
      const t = setTimeout(() => setPhase("old"), 1200);
      return () => clearTimeout(t);
    }
    if (phase === "old") {
      const t = setTimeout(() => {
        playThud();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setPhase("shuffle");
          });
        });
      }, 800);
      return () => clearTimeout(t);
    }
    if (phase === "shuffle") {
      const t = setTimeout(() => setPhase("highlight"), 1400);
      return () => clearTimeout(t);
    }
  }, [phase, playThud]);

  // For each player in byPrev order, compute the Y-offset to move from prevRank position to rank position
  function getTranslateY(player: RevealPlayer): number {
    if (phase !== "shuffle" && phase !== "highlight") return 0;
    const fromIndex = player.prevRank - 1;
    const toIndex = player.rank - 1;
    return (toIndex - fromIndex) * (CARD_HEIGHT + CARD_GAP);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/98 flex flex-col px-4 py-6">
      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col">

        {phase === "intro" && (
          <div className="flex-1 flex items-center justify-center text-center animate-[fadeIn_0.8s_ease-out]">
            <div>
              <div className="text-5xl mb-4 animate-pulse">⚔️</div>
              <h2 className="text-xl font-[family-name:var(--font-cinzel)] font-bold text-fire">
                The Realm Shifts
              </h2>
              <p className="text-muted text-sm mt-2">Warriors take their positions...</p>
            </div>
          </div>
        )}

        {phase !== "intro" && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-center text-sm font-[family-name:var(--font-cinzel)] font-bold text-fire mb-4">
              This Week&apos;s Realm
            </h2>

            {/* Container with fixed height so cards can move within it */}
            <div
              className="relative flex-1"
              style={{ minHeight: byPrev.length * (CARD_HEIGHT + CARD_GAP) - CARD_GAP }}
            >
              {byPrev.map((p, i) => {
                const isMe = p.playerId === myPlayerId;
                const moved = p.rank !== p.prevRank;
                const wentUp = p.rank < p.prevRank;
                const translateY = getTranslateY(p);
                const displayRank = (phase === "shuffle" || phase === "highlight") ? p.rank : p.prevRank;

                return (
                  <div
                    key={p.playerId}
                    className={`absolute left-0 right-0 rounded-lg border p-3 flex items-center gap-3 ${
                      phase === "highlight" && isMe
                        ? "border-fire bg-fire/10 shadow-[0_0_20px_rgba(var(--fire-rgb),0.3)] z-10"
                        : phase === "highlight" && !isMe
                        ? "opacity-40 border-card-border"
                        : "border-card-border bg-card"
                    }`}
                    style={{
                      height: CARD_HEIGHT,
                      top: i * (CARD_HEIGHT + CARD_GAP),
                      transform: `translateY(${translateY}px) translateZ(0)`,
                      WebkitTransform: `translateY(${translateY}px) translateZ(0)`,
                      willChange: "transform",
                      transition: (phase === "shuffle" || phase === "highlight")
                        ? "transform 0.9s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease, border-color 0.5s ease, background-color 0.5s ease, box-shadow 0.5s ease"
                        : "none",
                    }}
                  >
                    <span className="text-xl flex-shrink-0">{SIGIL_EMOJIS[(p.sigil || "axe") as Sigil]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-muted w-4">#{displayRank}</span>
                        <span className="font-semibold text-sm text-foreground truncate">{p.vikingName}</span>
                      </div>
                      {(() => {
                        const ts = TITLE_STYLES[p.titleAfter] || TITLE_STYLES["Thrall"];
                        return (
                          <div className={`text-[10px] ${ts.color} ${ts.glowClass || ""}`}>
                            {ts.icon} {p.titleAfter}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {moved && (phase === "shuffle" || phase === "highlight") && (
                        <span className={`text-xs font-bold ${wentUp ? "text-green-400" : "text-red-400"}`}>
                          {wentUp ? "▲" : "▼"}{Math.abs(p.rank - p.prevRank)}
                        </span>
                      )}
                      <span className="text-xs text-fire font-bold">{Math.round(p.totalFinal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {phase === "highlight" && me && (
              <div className="mt-4 bg-fire/10 border border-fire/30 rounded-lg p-4 text-center animate-[fadeIn_0.6s_ease-out]">
                <p className="text-sm font-[family-name:var(--font-cinzel)] text-fire leading-relaxed">
                  {getRankMessage(me.rank, me.prevRank)}
                </p>
                <button
                  onClick={onDismiss}
                  className="mt-4 w-full bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold py-2.5 rounded-lg hover:bg-fire/90 transition-colors text-sm"
                >
                  Enter the Realm
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

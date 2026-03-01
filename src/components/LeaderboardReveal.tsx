"use client";

import { useState, useEffect, useRef } from "react";
import { SIGIL_EMOJIS, type Sigil } from "@/lib/constants";

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

export default function LeaderboardReveal({ players, myPlayerId, onDismiss }: LeaderboardRevealProps) {
  const [phase, setPhase] = useState<"intro" | "animate" | "settle" | "highlight">("intro");
  const [settledCount, setSettledCount] = useState(0);
  const [animating, setAnimating] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);

  const me = players.find(p => p.playerId === myPlayerId);

  function playThud(delay: number) {
    try {
      if (!audioRef.current) {
        audioRef.current = new AudioContext();
      }
      const ctx = audioRef.current;
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(60, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }, delay);
    } catch { /* audio not available */ }
  }

  // Intro → animate after 1s
  useEffect(() => {
    if (phase !== "intro") return;
    const t = setTimeout(() => {
      setPhase("animate");
      setAnimating(true);
    }, 1000);
    return () => clearTimeout(t);
  }, [phase]);

  // Animate: settle cards one at a time
  useEffect(() => {
    if (phase !== "animate") return;
    if (settledCount >= players.length) {
      const t = setTimeout(() => setPhase("settle"), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      playThud(0);
      setSettledCount(c => c + 1);
    }, 600);
    return () => clearTimeout(t);
  }, [phase, settledCount, players.length]);

  useEffect(() => {
    if (phase !== "settle") return;
    setAnimating(false);
    const t = setTimeout(() => setPhase("highlight"), 500);
    return () => clearTimeout(t);
  }, [phase]);

  const sortedByFinal = [...players].sort((a, b) => a.rank - b.rank);
  const sortedByPrev = [...players].sort((a, b) => a.prevRank - b.prevRank);

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

        {(phase === "animate" || phase === "settle" || phase === "highlight") && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-center text-sm font-[family-name:var(--font-cinzel)] font-bold text-fire mb-4">
              This Week&apos;s Realm
            </h2>

            <div className="space-y-2 flex-1">
              {(phase === "animate" ? sortedByPrev : sortedByFinal).map((p, i) => {
                const isSettled = !animating || i < settledCount;
                const isMe = p.playerId === myPlayerId;
                const moved = p.rank !== p.prevRank;
                const wentUp = p.rank < p.prevRank;
                const wentDown = p.rank > p.prevRank;

                return (
                  <div
                    key={p.playerId}
                    className={`rounded-lg border p-3 flex items-center gap-3 transition-all duration-500 ${
                      phase === "highlight" && isMe
                        ? "border-fire bg-fire/10 shadow-[0_0_20px_rgba(var(--fire-rgb),0.3)]"
                        : phase === "highlight" && !isMe
                        ? "opacity-40 border-card-border"
                        : "border-card-border bg-card"
                    } ${
                      !isSettled ? "opacity-0 scale-95" : "opacity-100 scale-100"
                    }`}
                    style={{ transitionDelay: isSettled ? `${i * 80}ms` : "0ms" }}
                  >
                    <span className="text-xl flex-shrink-0">{SIGIL_EMOJIS[(p.sigil || "axe") as Sigil]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-bold text-muted w-4`}>#{p.rank}</span>
                        <span className="font-semibold text-sm text-foreground truncate">{p.vikingName}</span>
                      </div>
                      <div className="text-[10px] text-muted">{p.titleAfter}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {moved && isSettled && (
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

            {/* Personal realm message */}
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

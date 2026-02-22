"use client";

import { getRealmForRank, TITLE_STYLES } from "@/lib/constants";
import { SIGIL_EMOJIS, type Sigil } from "@/lib/constants";
import XPProgressBar from "./XPProgressBar";
import RealmBadge from "./RealmBadge";

interface Props {
  vikingName: string;
  sigil: string;
  title: string;
  rank: number;
  weekPoints: number;
  xp: number;
  hasSubmitted: boolean;
  shieldCount: number;
  isBerserker: boolean;
  isSkald: boolean;
}

const RANK_BORDER_COLORS: Record<number, string> = {
  1: "border-gold/60",
  2: "border-silver/50",
  3: "border-bronze/50",
  4: "border-stone/40",
  5: "border-purple/40",
  6: "border-ice/40",
};

const RANK_GLOW: Record<number, string> = {
  1: "asgard-glow",
  2: "vanaheim-glow",
  3: "midgard-glow",
  6: "niflheim-glow",
};

export default function LeaderboardCard({
  vikingName,
  sigil,
  title,
  rank,
  weekPoints,
  xp,
  hasSubmitted,
  shieldCount,
  isBerserker,
  isSkald,
}: Props) {
  const realm = getRealmForRank(rank);
  const borderColor = RANK_BORDER_COLORS[rank] || "border-card-border";
  const glow = RANK_GLOW[rank] || "";
  const sigilEmoji = SIGIL_EMOJIS[sigil as Sigil] || "⚔️";
  const titleStyle = TITLE_STYLES[title] || TITLE_STYLES["Thrall"];

  return (
    <div
      className={`relative bg-card border ${borderColor} rounded-lg p-4 ${glow} transition-all duration-300`}
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl flex-shrink-0">{sigilEmoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-foreground truncate">
              {vikingName}
            </h3>
            {!hasSubmitted && <span title="Awaiting submission">🔥</span>}
            {shieldCount > 0 && (
              <span title={`${shieldCount} shield${shieldCount > 1 ? "s" : ""} received`}>
                {"🛡️".repeat(Math.min(shieldCount, 3))}
              </span>
            )}
            {isBerserker && <span title="Berserker Mode" className="text-lg">🔥</span>}
            {isSkald && <span title="Skald of the Month" className="text-lg">📜</span>}
          </div>
          <div className={`text-sm ${titleStyle.color} font-[family-name:var(--font-cinzel)] ${titleStyle.glow ? "einherjar-glow" : ""}`}>
            <span className="mr-1 opacity-60">{titleStyle.rune}</span>
            {title}
          </div>
          <RealmBadge rank={rank} />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-fire font-bold text-lg">{Math.round(weekPoints)} pts</span>
          </div>
          <XPProgressBar xp={xp} compact />
        </div>
      </div>
    </div>
  );
}

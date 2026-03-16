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
      className={`relative bg-card border rounded-lg p-4 transition-all duration-300 ${
        isBerserker ? "border-fire/50 berserker-card-glow" : `${borderColor} ${glow}`
      }`}
    >
      {isBerserker && (
        <>
          <span className="berserker-ember-2" />
          <span className="berserker-ember-3" />
        </>
      )}
      <div className="flex items-start gap-3">
        <div className="text-3xl flex-shrink-0">{sigilEmoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-foreground truncate">
              {vikingName}
            </h3>
            {isBerserker && (
              <span
                title="Last twice in a row — +50% XP this week"
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-fire/20 text-fire border border-fire/40"
              >
                Berserker
              </span>
            )}
            {!hasSubmitted && <span title="Awaiting submission">🔥</span>}
            {shieldCount > 0 && (
              <span title={`${shieldCount} shield${shieldCount > 1 ? "s" : ""} received`}>
                {"🛡️".repeat(Math.min(shieldCount, 3))}
              </span>
            )}
            {isSkald && <span title="Skald of the Month" className="text-lg">📜</span>}
          </div>
          <div className={`text-sm ${titleStyle.color} font-[family-name:var(--font-cinzel)] ${titleStyle.glowClass || ""}`}>
            <span className="mr-1">{titleStyle.icon}</span>
            <span className="mr-1 opacity-50 text-xs">{titleStyle.rune}</span>
            {title}
          </div>
          <RealmBadge rank={rank} />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-fire font-bold text-lg">{Math.round(weekPoints)} pts</span>
            <span className="text-xs text-gold font-semibold">{Math.round(xp)} XP</span>
          </div>
          <XPProgressBar xp={xp} compact />
        </div>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { getRealmForRank, TITLE_STYLES, SIGIL_IMAGES, TITLE_IMAGES, REALM_IMAGES } from "@/lib/constants";
import XPProgressBar from "./XPProgressBar";

interface Props {
  vikingName: string;
  sigil: string;
  title: string;
  rank: number;
  weekPoints: number;
  xp: number;
  hasSubmitted: boolean;
  currentWeekSubmitted?: boolean;
  shieldCount: number;
  isBerserker: boolean;
  isSkald: boolean;
  buddyTeamName?: string | null;
}

const RANK_COLORS: Record<string, string> = {
  gold: "#c8a22a",
  silver: "#a8a8a8",
  bronze: "#b87333",
  stone: "#6b6b6b",
  purple: "#5a3e6b",
  ice: "#7ab8d4",
};

export default function LeaderboardCard({
  vikingName,
  sigil,
  title,
  rank,
  weekPoints,
  xp,
  hasSubmitted,
  currentWeekSubmitted,
  shieldCount,
  isBerserker,
  isSkald,
  buddyTeamName,
}: Props) {
  const realm = getRealmForRank(rank);
  const titleStyle = TITLE_STYLES[title] || TITLE_STYLES["Thrall"];
  const sigilSrc = SIGIL_IMAGES[sigil] || SIGIL_IMAGES["axe"];
  const titleSrc = TITLE_IMAGES[title] || TITLE_IMAGES["Thrall"];
  const realmSrc = REALM_IMAGES[realm.name] || REALM_IMAGES["Midgard"];
  const realmColor = RANK_COLORS[realm.color] || RANK_COLORS["stone"];

  return (
    <div
      className={`relative overflow-hidden ${isBerserker ? "berserker-card-glow" : ""}`}
      style={{
        backgroundImage: "url(/images/ui/backgrounds/card-bg-1.png)",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        aspectRatio: "800 / 448",
      }}
    >
      {/* Rank color diagonal light from top-left */}
      <div
        className="absolute left-0 right-0 bottom-0 pointer-events-none"
        style={{
          top: "3px",
          background: `linear-gradient(135deg, ${realmColor}20 0%, transparent 40%)`,
        }}
      />

      {/* Week points + shield top-left */}
      <div className="absolute z-20 flex flex-col items-start" style={{ top: "16px", left: "calc(2.5% + 20px)" }}>
        <div className="text-fire font-bold flex items-center" style={{ fontSize: "16px", lineHeight: "1" }}>
          {Math.round(weekPoints)} <span className="font-normal ml-1">pts</span>
          {currentWeekSubmitted && (
            <span className="ml-2 text-foreground/60" style={{ fontSize: "12px" }}>✓</span>
          )}
        </div>
        {shieldCount > 0 && (
          <span className="text-[9px] font-bold uppercase tracking-wider mt-2 px-1.5 py-0.5 rounded bg-muted/10 text-muted border border-muted/30">
            {shieldCount} shield{shieldCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Title icon watermark */}
      <div className="absolute right-[0.5%] top-[47%] -translate-y-1/2 opacity-[0.077] pointer-events-none">
        <Image
          unoptimized
          src={titleSrc}
          alt=""
          width={180}
          height={180}
          className="select-none"
          draggable={false}
        />
      </div>

      {buddyTeamName && (
        <div className="absolute text-xs text-muted/70 font-[family-name:var(--font-cinzel)] z-20 flex items-center" style={{ top: "20px", right: "calc(2.5% + 20px)", lineHeight: "1", height: "16px" }}>
          Team {buddyTeamName}
        </div>
      )}

      {isBerserker && (
        <>
          <span className="berserker-ember-2" />
          <span className="berserker-ember-3" />
        </>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center h-full py-5 px-5">
        {/* Sigil centered */}
        <div className="flex justify-center" style={{ marginTop: "-10px" }}>
          <Image
            unoptimized
            src={sigilSrc}
            alt={`${sigil} sigil`}
            width={84}
            height={84}
            className="drop-shadow-lg"
          />
        </div>

        {/* Name + badges */}
        <div className="flex items-center justify-center gap-2 flex-wrap" style={{ marginTop: "4px" }}>
          <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-xl tracking-wide" style={{ color: "#d4ccc0" }}>
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
          {isSkald && (
            <span title="Skald of the Month" className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30">
              Skald
            </span>
          )}
        </div>

        {/* Realm + Title centered row */}
        <div className="flex items-center w-full px-3" style={{ marginTop: "10px" }}>
          <div className="flex-1 flex items-center justify-end gap-1 min-w-0">
            <Image unoptimized src={realmSrc} alt={realm.name} width={18} height={18} className="shrink-0" />
            <span className={`font-[family-name:var(--font-cinzel)] text-xs sm:text-sm font-semibold ${realm.cssClass} truncate`}>
              {realm.name}
            </span>
          </div>
          <div className="mx-2 shrink-0" style={{ width: "1px" }} />
          <div className="flex-1 flex items-center justify-start gap-1 min-w-0">
            <Image unoptimized src={titleSrc} alt={title} width={18} height={18} className="shrink-0" />
            <span className={`${titleStyle.color} font-[family-name:var(--font-cinzel)] text-xs sm:text-sm font-semibold ${titleStyle.glowClass || ""} truncate`}>
              {title}
            </span>
          </div>
        </div>

        {/* XP Bar */}
        <div style={{ marginTop: "20px" }} className="w-[95%] mx-auto">
          <XPProgressBar xp={xp} compact />
        </div>
      </div>
    </div>
  );
}

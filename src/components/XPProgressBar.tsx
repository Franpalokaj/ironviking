"use client";

import { getTitleForXP, getNextTitle, TITLE_STYLES } from "@/lib/constants";

interface Props {
  xp: number;
  compact?: boolean;
}

export default function XPProgressBar({ xp, compact }: Props) {
  const current = getTitleForXP(xp);
  const next = getNextTitle(xp);
  const style = TITLE_STYLES[current.name] || TITLE_STYLES["Thrall"];
  const nextStyle = next ? TITLE_STYLES[next.name] : null;

  if (!next) {
    return (
      <div className={compact ? "" : "mt-2"}>
        <div className="flex justify-between text-xs text-muted mb-1">
          <span className={`${style.color} font-semibold ${style.glow ? "einherjar-glow" : ""}`}>
            {style.rune} {current.name}
          </span>
          <span>{Math.round(xp)} XP — Max title reached</span>
        </div>
        <div className="h-2 bg-card-border rounded-full overflow-hidden">
          <div className="h-full bg-gold rounded-full" style={{ width: "100%" }} />
        </div>
      </div>
    );
  }

  const progress = ((xp - current.threshold) / (next.threshold - current.threshold)) * 100;
  const remaining = Math.round(next.threshold - xp);

  return (
    <div className={compact ? "" : "mt-2"}>
      <div className="flex justify-between text-xs text-muted mb-1">
        <span className={`${style.color} font-semibold`}>
          {style.rune} {current.name}
        </span>
        <span>{remaining} XP to {nextStyle ? `${nextStyle.rune} ` : ""}{next.name}</span>
      </div>
      <div className="h-2 bg-card-border rounded-full overflow-hidden">
        <div
          className="h-full bg-fire rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    </div>
  );
}

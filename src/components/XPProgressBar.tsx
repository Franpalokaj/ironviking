"use client";

import Image from "next/image";
import { getTitleForXP, getNextTitle, TITLE_STYLES, TITLE_IMAGES } from "@/lib/constants";

interface Props {
  xp: number;
  compact?: boolean;
}

export default function XPProgressBar({ xp, compact }: Props) {
  const current = getTitleForXP(xp);
  const next = getNextTitle(xp);
  const style = TITLE_STYLES[current.name] || TITLE_STYLES["Thrall"];
  const currentImg = TITLE_IMAGES[current.name];
  const nextImg = next ? TITLE_IMAGES[next.name] : null;

  if (!next) {
    return (
      <div className={compact ? "" : "mt-2"}>
        <div className="flex justify-between items-center text-xs text-muted mb-1">
          <span>{Math.round(xp)} XP</span>
          <span>Max title reached</span>
        </div>
        <div className="h-2 bg-card-border rounded-full overflow-hidden">
          <div className="h-full bg-gold rounded-full" style={{ width: "100%" }} />
        </div>
      </div>
    );
  }

  const progress = ((xp - current.threshold) / (next.threshold - current.threshold)) * 100;
  const remaining = Math.round(next.threshold - xp);
  const nextStyle = TITLE_STYLES[next.name];

  return (
    <div className={compact ? "" : "mt-2"}>
      <div className="flex justify-between items-center text-xs text-muted mb-1">
        <span>{Math.round(xp)} XP</span>
        <span className="inline-flex items-center gap-1">
          {remaining} XP to
          {nextImg && <Image unoptimized src={nextImg} alt={next.name} width={16} height={16} />}
          {nextStyle ? ` ${next.name}` : ` ${next.name}`}
        </span>
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

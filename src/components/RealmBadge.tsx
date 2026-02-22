"use client";

import { getRealmForRank } from "@/lib/constants";

const REALM_COLORS: Record<string, string> = {
  gold: "text-gold",
  silver: "text-silver",
  bronze: "text-bronze",
  stone: "text-stone",
  purple: "text-purple",
  ice: "text-ice",
};

interface Props {
  rank: number;
  showIcon?: boolean;
}

export default function RealmBadge({ rank, showIcon = true }: Props) {
  const realm = getRealmForRank(rank);
  const color = REALM_COLORS[realm.color] || "text-foreground";

  return (
    <span className={`${color} font-[family-name:var(--font-cinzel)] font-semibold text-sm`}>
      {showIcon && "⚔️ "}{realm.name}
    </span>
  );
}

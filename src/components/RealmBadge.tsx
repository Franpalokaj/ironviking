"use client";

import Image from "next/image";
import { getRealmForRank, REALM_IMAGES } from "@/lib/constants";

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
  const realmSrc = REALM_IMAGES[realm.name];

  return (
    <span className={`${color} font-[family-name:var(--font-cinzel)] font-semibold text-sm inline-flex items-center gap-1.5`}>
      {showIcon && realmSrc && (
        <Image unoptimized src={realmSrc} alt={realm.name} width={20} height={20} className="inline-block" />
      )}
      {realm.name}
    </span>
  );
}

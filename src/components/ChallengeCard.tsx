"use client";

import { DIFFICULTY_LABELS, type Difficulty } from "@/lib/constants";

interface Challenge {
  id: number;
  title: string;
  description: string;
  track: string;
  dataType: string | null;
  targetValue: number | null;
  difficulty?: string;
}

interface Props {
  challenge: Challenge;
  weekType: "competition" | "collaboration";
  isSolo?: boolean;
}

export default function ChallengeCard({ challenge, weekType, isSolo }: Props) {
  const icon = isSolo ? "🎯" : weekType === "competition" ? "⚔️" : "🛡️";
  const label = isSolo ? "Solo Challenge" : weekType === "competition" ? "Competitive Challenge" : "Team Challenge";
  const tint = isSolo
    ? "border-fire/20"
    : weekType === "competition"
    ? "border-fire/30 bg-fire/5"
    : "border-ice/30 bg-ice/5";

  const diff = (challenge.difficulty || "normal") as Difficulty;
  const diffStyle = DIFFICULTY_LABELS[diff];

  return (
    <div className={`border ${tint} rounded-lg p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs uppercase tracking-wider text-muted font-semibold">{label}</span>
        {diff !== "normal" && (
          <span className={`text-[10px] font-bold uppercase tracking-wider ${diffStyle.color} bg-card border border-card-border rounded px-1.5 py-0.5`}>
            {diffStyle.label}
          </span>
        )}
      </div>
      <h4 className="font-[family-name:var(--font-cinzel)] font-bold text-foreground">
        {challenge.title}
      </h4>
      <p className="text-sm text-muted mt-1 break-words">{challenge.description}</p>
      {challenge.targetValue && challenge.track === "collaborative" && (
        <div className="mt-2 text-xs text-muted">
          Target: {challenge.targetValue} {challenge.dataType === "distance_km" ? "km" : challenge.dataType === "count" ? "reps" : ""}
        </div>
      )}
    </div>
  );
}

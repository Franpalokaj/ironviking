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
  isBuddy?: boolean;
}

const CHALLENGE_GRADIENTS = {
  solo: "linear-gradient(135deg, rgba(232, 120, 42, 0.15) 0%, transparent 50%)",
  buddy: "linear-gradient(135deg, rgba(200, 162, 42, 0.15) 0%, transparent 50%)",
  competitive: "linear-gradient(135deg, rgba(232, 90, 48, 0.15) 0%, transparent 50%)",
  team: "linear-gradient(135deg, rgba(122, 184, 212, 0.15) 0%, transparent 50%)",
};

export default function ChallengeCard({ challenge, weekType, isSolo, isBuddy }: Props) {
  const label = isBuddy ? "Buddy Challenge" : isSolo ? "Solo Challenge" : weekType === "competition" ? "Competitive Challenge" : "Team Challenge";
  const gradient = isBuddy
    ? CHALLENGE_GRADIENTS.buddy
    : isSolo
    ? CHALLENGE_GRADIENTS.solo
    : weekType === "competition"
    ? CHALLENGE_GRADIENTS.competitive
    : CHALLENGE_GRADIENTS.team;

  const diff = (challenge.difficulty || "normal") as Difficulty;
  const diffStyle = DIFFICULTY_LABELS[diff];

  return (
    <div
      className="relative overflow-hidden p-4"
      style={{
        backgroundImage: "url(/images/ui/backgrounds/card-bg-2.png)",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        aspectRatio: "800 / 429",
      }}
    >
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center" style={{ marginTop: "-6%" }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm uppercase tracking-wider text-muted font-semibold">{label}</span>
          {diff !== "normal" && (
            <span className={`text-[10px] font-bold uppercase tracking-wider ${diffStyle.color} bg-card border border-card-border rounded px-1.5 py-0.5`}>
              {diffStyle.label}
            </span>
          )}
        </div>
        <h4 className="font-[family-name:var(--font-cinzel)] font-bold text-foreground text-2xl">
          {challenge.title}
        </h4>
        <p className="text-base text-muted mt-2 break-words max-w-[80%]">{challenge.description}</p>
        {challenge.targetValue && challenge.track === "collaborative" && (
          <div className="mt-2 text-xs text-muted">
            Target: {challenge.targetValue} {challenge.dataType === "distance_km" ? "km" : challenge.dataType === "count" ? "reps" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

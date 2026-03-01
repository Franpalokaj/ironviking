"use client";

import { useState, useEffect } from "react";
import { getTitleForXP, TITLE_STYLES } from "@/lib/constants";

interface WeekScore {
  weekId: number;
  weekNumber: number;
  totalFinal: number;
  xpTotalAfter: number;
  titleAfter: string;
  kmPoints: number;
  rankBonus: number;
  soloChallengePoints: number;
  secondChallengePoints: number;
  streakBonus: number;
  shieldPoints: number;
  prBonus: number;
  ontimeBonus: number;
  berserkerMultiplier: number;
}

interface WeeklyRevealProps {
  score: WeekScore;
  prevXp: number;
  prevTitle: string;
  onDismiss: () => void;
}

const XP_LINES = [
  { key: "kmPoints",             label: "Kilometres run",    icon: "🏃" },
  { key: "rankBonus",            label: "Realm rank",        icon: "🏆" },
  { key: "soloChallengePoints",  label: "Solo challenge",    icon: "🎯" },
  { key: "secondChallengePoints",label: "Group challenge",   icon: "⚔️" },
  { key: "streakBonus",          label: "Streak",            icon: "🔥" },
  { key: "shieldPoints",         label: "Shields received",  icon: "🛡️" },
  { key: "prBonus",              label: "PR trial",          icon: "💪" },
  { key: "ontimeBonus",          label: "On time",           icon: "⏱️" },
] as const;

type ScoreKey = typeof XP_LINES[number]["key"];

export default function WeeklyReveal({ score, prevXp, prevTitle, onDismiss }: WeeklyRevealProps) {
  const [phase, setPhase] = useState<"intro" | "breakdown" | "total" | "levelup" | "done">("intro");
  const [visibleLines, setVisibleLines] = useState(0);
  const [displayXp, setDisplayXp] = useState(prevXp);

  const didLevelUp = score.titleAfter !== prevTitle;

  // Intro → breakdown after 1.5s
  useEffect(() => {
    if (phase !== "intro") return;
    const t = setTimeout(() => setPhase("breakdown"), 1500);
    return () => clearTimeout(t);
  }, [phase]);

  // Reveal breakdown lines one by one
  useEffect(() => {
    if (phase !== "breakdown") return;
    if (visibleLines >= XP_LINES.length) {
      const t = setTimeout(() => setPhase("total"), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisibleLines(v => v + 1), 280);
    return () => clearTimeout(t);
  }, [phase, visibleLines]);

  // Count up XP display
  useEffect(() => {
    if (phase !== "total") return;
    const target = score.xpTotalAfter;
    const start = prevXp;
    const duration = 1200;
    const steps = 40;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayXp(Math.round(start + (target - start) * eased));
      if (step >= steps) {
        clearInterval(interval);
        setDisplayXp(target);
        setTimeout(() => {
          if (didLevelUp) setPhase("levelup");
          else setPhase("done");
        }, 800);
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [phase, prevXp, score.xpTotalAfter, didLevelUp]);

  const titleStyle = TITLE_STYLES[score.titleAfter] || TITLE_STYLES["Thrall"];
  const berserker = score.berserkerMultiplier > 1;

  return (
    <div className="fixed inset-0 z-50 bg-background/98 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* INTRO */}
        {phase === "intro" && (
          <div className="text-center animate-[fadeIn_0.8s_ease-out]">
            <div className="text-5xl mb-4 animate-pulse">ᚱ</div>
            <h2 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-fire">
              The Runes Have Spoken
            </h2>
            <p className="text-muted text-sm mt-2">Reading your deeds from the saga...</p>
          </div>
        )}

        {/* BREAKDOWN */}
        {(phase === "breakdown" || phase === "total" || phase === "done") && (
          <div className="animate-[fadeIn_0.4s_ease-out]">
            <div className="text-center mb-4">
              <h2 className="text-lg font-[family-name:var(--font-cinzel)] font-bold text-fire">
                Week {score.weekNumber} Results
              </h2>
            </div>

            <div className="bg-card border border-card-border rounded-lg overflow-hidden mb-4">
              {XP_LINES.map((line, i) => {
                const value = score[line.key as ScoreKey] as number;
                if (value === 0 && i >= visibleLines) return null;
                return (
                  <div
                    key={line.key}
                    className={`flex items-center justify-between px-4 py-2 border-b border-card-border/50 last:border-0 transition-all duration-300 ${
                      i < visibleLines ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                    }`}
                    style={{ transitionDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span>{line.icon}</span>
                      <span className="text-muted">{line.label}</span>
                    </div>
                    <span className={`font-bold text-sm ${value > 0 ? "text-fire" : "text-muted"}`}>
                      {value > 0 ? `+${Math.round(value * 10) / 10}` : "—"}
                    </span>
                  </div>
                );
              })}
              {berserker && visibleLines >= XP_LINES.length && (
                <div className="flex items-center justify-between px-4 py-2 bg-fire/10 animate-[fadeIn_0.4s_ease-out]">
                  <div className="flex items-center gap-2 text-sm">
                    <span>⚡</span>
                    <span className="text-fire font-bold">Berserker Rage!</span>
                  </div>
                  <span className="text-fire font-bold">×1.5</span>
                </div>
              )}
            </div>

            {(phase === "total" || phase === "done") && (
              <div className="bg-fire/10 border border-fire/30 rounded-lg p-4 text-center animate-[fadeIn_0.5s_ease-out]">
                <div className="text-xs text-muted mb-1">XP Earned This Week</div>
                <div className="text-3xl font-bold text-fire font-[family-name:var(--font-cinzel)]">
                  +{Math.round(score.totalFinal * 10) / 10}
                </div>
                <div className="text-xs text-muted mt-2">Total XP: <span className="text-gold font-bold">{Math.round(displayXp)}</span></div>
              </div>
            )}

            {phase === "done" && (
              <button
                onClick={onDismiss}
                className="w-full mt-4 bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold py-3 rounded-lg hover:bg-fire/90 transition-colors animate-[fadeIn_0.4s_ease-out]"
              >
                To the Leaderboard →
              </button>
            )}
          </div>
        )}

        {/* LEVEL UP */}
        {phase === "levelup" && (
          <div className="text-center animate-[fadeIn_0.6s_ease-out]">
            <div className="relative inline-block mb-4">
              <div className={`text-7xl ${titleStyle.glow ? "einherjar-glow" : ""}`}>
                {titleStyle.rune}
              </div>
              <div className="absolute inset-0 blur-2xl opacity-50 text-7xl">{titleStyle.rune}</div>
            </div>
            <div className="text-xs text-muted uppercase tracking-widest mb-2">Title unlocked</div>
            <h2 className={`text-3xl font-[family-name:var(--font-cinzel)] font-bold mb-1 ${titleStyle.color} ${titleStyle.glow ? "einherjar-glow" : ""}`}>
              {score.titleAfter}
            </h2>
            <p className="text-muted text-sm mb-2">{getTitleForXP(score.xpTotalAfter).description}</p>
            <div className="rune-divider my-6" />
            <button
              onClick={() => setPhase("done")}
              className="w-full bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold py-3 rounded-lg hover:bg-fire/90 transition-colors"
            >
              Claim Your Title →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

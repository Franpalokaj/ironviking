"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PHASES, WEEKLY_KM_TARGETS, getCurrentWeekNumber, getPhaseForWeek } from "@/lib/constants";
import BottomNav from "@/components/BottomNav";

const weekDates: Record<number, string> = {
  1: "Feb 23 – Mar 1", 2: "Mar 2 – 8", 3: "Mar 9 – 15", 4: "Mar 16 – 22",
  5: "Mar 23 – 29", 6: "Mar 30 – Apr 5", 7: "Apr 6 – 12",
  8: "Apr 13 – 19", 9: "Apr 20 – 26", 10: "Apr 27 – May 3", 11: "May 4 – 10",
  12: "May 11 – 17", 13: "May 18 – 24", 14: "May 25 – 31", 15: "Jun 1 – 7", 16: "Jun 8 – 14",
  17: "Jun 15 – 21", 18: "Jun 22 – 28", 19: "Jun 29 – Jul 5", 20: "Jul 6 – 12",
  21: "Jul 13 – 19", 22: "Jul 20 – 26", 23: "Jul 27 – Aug 2", 24: "Aug 3 – 9",
  25: "Aug 10 – 16", 26: "Aug 17 – 23", 27: "Aug 24 – 30", 28: "Sep 1 – 7",
};

const consolidationWeeks = [6, 11, 15, 19];
const backoffWeek = 22;

const strengthBenchmarks = [
  { exercise: "Pull-ups", baseline: "0–3 reps", midpoint: "5–8 reps", raceReady: "10–15 reps" },
  { exercise: "Push-ups", baseline: "10–15 reps", midpoint: "20–25 reps", raceReady: "35–40 reps" },
  { exercise: "Dead hang", baseline: "20 sec", midpoint: "40 sec", raceReady: "60+ sec" },
  { exercise: "Farmer carry", baseline: "20kg/50m", midpoint: "24kg/100m", raceReady: "28kg/100m" },
  { exercise: "Plank hold", baseline: "45 sec", midpoint: "90 sec", raceReady: "2 min+" },
];

export default function GuidePage() {
  const router = useRouter();
  const currentWeek = getCurrentWeekNumber();
  const currentPhase = getPhaseForWeek(currentWeek);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(currentPhase.name);

  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-card-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="text-muted hover:text-foreground">← Back</button>
          <h1 className="text-sm font-[family-name:var(--font-cinzel)] font-bold text-fire">Training Guide</h1>
          <div />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Current status */}
        <div className="bg-card border border-fire/20 rounded-lg p-4 mb-6 text-center">
          <div className="text-xs uppercase tracking-wider text-muted mb-1">Current Phase</div>
          <div className="text-xl font-[family-name:var(--font-cinzel)] font-bold text-fire">
            {currentPhase.name}
          </div>
          <div className="text-sm text-muted mt-1">
            Week {currentWeek} · Target: {WEEKLY_KM_TARGETS[currentWeek]?.min || "–"} km
          </div>
        </div>

        {/* Phase overview */}
        <h2 className="font-[family-name:var(--font-cinzel)] font-bold mb-3">28-Week Plan</h2>
        {PHASES.map(phase => {
          const isExpanded = expandedPhase === phase.name;
          const isCurrent = phase.name === currentPhase.name;
          const weekRange = Array.from(
            { length: phase.weeks[1] - phase.weeks[0] + 1 },
            (_, i) => phase.weeks[0] + i
          );

          return (
            <div key={phase.name} className={`mb-3 border rounded-lg ${isCurrent ? "border-fire/30" : "border-card-border"}`}>
              <button
                onClick={() => setExpandedPhase(isExpanded ? null : phase.name)}
                className="w-full p-4 flex justify-between items-center"
              >
                <div className="text-left">
                  <div className={`font-[family-name:var(--font-cinzel)] font-bold ${isCurrent ? "text-fire" : "text-foreground"}`}>
                    {phase.name}
                  </div>
                  <div className="text-xs text-muted">
                    Weeks {phase.weeks[0]}–{phase.weeks[1]} · {phase.dates} · {phase.kmRange}
                  </div>
                </div>
                <span className="text-muted">{isExpanded ? "▲" : "▼"}</span>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4">
                  <div className="space-y-1">
                    {weekRange.map(w => {
                      const target = WEEKLY_KM_TARGETS[w];
                      const isCurrentWeek = w === currentWeek;
                      const isConsolidation = consolidationWeeks.includes(w);
                      const isBackoff = w === backoffWeek;

                      return (
                        <div
                          key={w}
                          className={`flex items-center justify-between py-2 px-3 rounded text-sm ${
                            isCurrentWeek ? "bg-fire/10 border border-fire/30" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isCurrentWeek ? "text-fire" : "text-foreground"}`}>
                              W{w}
                            </span>
                            <span className="text-xs text-muted">{weekDates[w]}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-foreground font-semibold">{target?.min} km</span>
                            <span className="text-xs text-muted">LR: {target?.longRun} km</span>
                            {isConsolidation && <span className="text-[10px] text-ice">Hold</span>}
                            {isBackoff && <span className="text-[10px] text-yellow-400">Back-off</span>}
                            {isCurrentWeek && <span className="text-[10px] text-fire">Now</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="rune-divider my-6" />

        {/* Strength benchmarks */}
        <h2 className="font-[family-name:var(--font-cinzel)] font-bold mb-3">Strength Benchmarks</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted border-b border-card-border">
                <th className="text-left py-2 pr-2">Exercise</th>
                <th className="text-center py-2 px-1">Baseline</th>
                <th className="text-center py-2 px-1">Week 14</th>
                <th className="text-center py-2 px-1">Race Ready</th>
              </tr>
            </thead>
            <tbody>
              {strengthBenchmarks.map(b => (
                <tr key={b.exercise} className="border-b border-card-border/50">
                  <td className="py-2 pr-2 font-semibold text-foreground">{b.exercise}</td>
                  <td className="py-2 px-1 text-center text-muted">{b.baseline}</td>
                  <td className="py-2 px-1 text-center text-foreground">{b.midpoint}</td>
                  <td className="py-2 px-1 text-center text-fire">{b.raceReady}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rune-divider my-6" />

        {/* Tips */}
        <div className="bg-card border border-card-border rounded-lg p-4 text-sm text-muted">
          <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-foreground mb-2">Key Principles</h3>
          <ul className="space-y-2">
            <li><strong className="text-foreground">10% Rule:</strong> Never increase weekly volume by more than 10%.</li>
            <li><strong className="text-foreground">Consolidation weeks:</strong> Hold volume steady. Let your body absorb the training.</li>
            <li><strong className="text-foreground">Back-off week (W22):</strong> Mandatory recovery. Drop volume. Trust the process.</li>
            <li><strong className="text-foreground">Taper:</strong> Reduce volume 25% per week for the last 4 weeks. Arrive fresh, not tired.</li>
          </ul>
        </div>
      </div>

      <BottomNav active="guide" />
    </div>
  );
}

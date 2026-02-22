"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SIGIL_EMOJIS, type Sigil, getPhaseForWeek, WEEKLY_KM_TARGETS, getWeekDeadline } from "@/lib/constants";

interface Player {
  id: number;
  vikingName: string | null;
  sigil: string | null;
}

interface Challenge {
  id: number;
  title: string;
  description: string;
  track: string;
  dataType: string | null;
  targetValue: number | null;
}

interface Week {
  id: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  type: "competition" | "collaboration";
  isLocked: boolean;
}

export default function SubmitPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ playerId: number; vikingName: string } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [week, setWeek] = useState<Week | null>(null);
  const [soloChallenge, setSoloChallenge] = useState<Challenge | null>(null);
  const [secondChallenge, setSecondChallenge] = useState<Challenge | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form state
  const [kmRun, setKmRun] = useState("");
  const [runsCount, setRunsCount] = useState(0);
  const [gymSessions, setGymSessions] = useState(0);
  const [soloChallengeDone, setSoloChallengeDone] = useState(false);
  const [secondChallengeResult, setSecondChallengeResult] = useState("");
  const [secondChallengeAttempted, setSecondChallengeAttempted] = useState(true);
  const [hypeVoteFor, setHypeVoteFor] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) { router.push("/login"); return; }
      const { session: s } = await sessionRes.json();
      setSession(s);

      const [weekRes, playersRes] = await Promise.all([
        fetch("/api/weeks/current"),
        fetch("/api/players"),
      ]);
      const weekData = await weekRes.json();
      const playersData = await playersRes.json();

      setWeek(weekData.week);
      setSoloChallenge(weekData.soloChallenge);
      setSecondChallenge(weekData.secondChallenge);
      setPlayers((playersData.players || []).filter((p: Player) => p.id !== s.playerId));

      if (weekData.week) {
        const subRes = await fetch(`/api/submissions?weekId=${weekData.week.id}`);
        const subData = await subRes.json();
        if (subData.submission) setAlreadySubmitted(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!week || !session || !hypeVoteFor) return;

    setError("");
    setSubmitting(true);

    try {
      let resultValue: number | null = null;
      if (secondChallengeAttempted && secondChallengeResult) {
        if (secondChallenge?.dataType === "time_mmss") {
          const parts = secondChallengeResult.split(":");
          if (parts.length === 2) {
            resultValue = parseInt(parts[0]) * 60 + parseInt(parts[1]);
          }
        } else {
          resultValue = parseFloat(secondChallengeResult);
        }
      }

      // For collaborative weeks with boolean challenge, use 1.0 for attempted
      if (week.type === "collaboration" && secondChallenge?.dataType === "boolean") {
        resultValue = secondChallengeAttempted ? 1.0 : null;
      }

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekId: week.id,
          kmRun: parseFloat(kmRun) || 0,
          runsCount,
          gymSessions,
          soloChallengeDone,
          secondChallengeResult: resultValue,
          secondChallengeAttempted,
          hypeVoteFor,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Submission failed");
        return;
      }

      const data = await res.json();
      setSuccess(true);
      setAlreadySubmitted(true);

      if (data.isLate) {
        setError("Submitted late — your stats count but no scroll bonus this week.");
      }
    } catch {
      setError("Connection failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-fire font-[family-name:var(--font-cinzel)] animate-pulse">
          Preparing your scroll...
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">⚔️</div>
          <h2 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-fire mb-2">
            Your Deeds Are Recorded
          </h2>
          <p className="text-muted mb-2">
            Week {week?.weekNumber} scroll submitted.
          </p>
          {error && <p className="text-yellow-400 text-sm mb-4">{error}</p>}
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold px-8 py-3 rounded-lg mt-4"
          >
            Return to the Board
          </button>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">📜</div>
          <h2 className="text-xl font-[family-name:var(--font-cinzel)] font-bold text-foreground mb-2">
            Already Submitted
          </h2>
          <p className="text-muted mb-4">
            Your scroll for Week {week?.weekNumber} has already been recorded.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-card border border-card-border px-8 py-3 rounded-lg text-muted hover:text-foreground transition-colors"
          >
            Back to Board
          </button>
        </div>
      </div>
    );
  }

  const phase = week ? getPhaseForWeek(week.weekNumber) : null;
  const kmTarget = week ? WEEKLY_KM_TARGETS[week.weekNumber] : null;

  // Deadline countdown
  const deadlineStr = week ? (() => {
    const end = getWeekDeadline(week.endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return "Deadline passed";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return days > 0 ? `${days}d ${hours}h remaining` : `${hours}h remaining`;
  })() : "";

  return (
    <div className="min-h-dvh pb-8">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-card-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="text-muted hover:text-foreground">
            ← Back
          </button>
          <h1 className="text-sm font-[family-name:var(--font-cinzel)] font-bold text-fire">
            Week {week?.weekNumber} Scroll
          </h1>
          <div className="text-xs text-muted">{deadlineStr}</div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-6 space-y-8">
        {/* SECTION 1: Training */}
        <section>
          <h2 className="text-lg font-[family-name:var(--font-cinzel)] font-bold mb-4 flex items-center gap-2">
            <span>🏃</span> Training This Week
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1">Total km run this week</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="200"
                  value={kmRun}
                  onChange={(e) => setKmRun(e.target.value)}
                  className="flex-1 bg-card border border-card-border rounded-lg px-4 py-3 text-foreground text-xl focus:outline-none focus:border-fire/50"
                  placeholder="0.0"
                  required
                />
                <span className="text-muted text-sm">km</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Number of runs</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRunsCount(Math.max(0, runsCount - 1))}
                  className="w-12 h-12 bg-card border border-card-border rounded-lg text-foreground text-xl hover:border-fire/30"
                >−</button>
                <span className="text-xl font-bold w-8 text-center">{runsCount}</span>
                <button
                  type="button"
                  onClick={() => setRunsCount(Math.min(14, runsCount + 1))}
                  className="w-12 h-12 bg-card border border-card-border rounded-lg text-foreground text-xl hover:border-fire/30"
                >+</button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Gym / strength sessions</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setGymSessions(Math.max(0, gymSessions - 1))}
                  className="w-12 h-12 bg-card border border-card-border rounded-lg text-foreground text-xl hover:border-fire/30"
                >−</button>
                <span className="text-xl font-bold w-8 text-center">{gymSessions}</span>
                <button
                  type="button"
                  onClick={() => setGymSessions(Math.min(7, gymSessions + 1))}
                  className="w-12 h-12 bg-card border border-card-border rounded-lg text-foreground text-xl hover:border-fire/30"
                >+</button>
              </div>
            </div>

            {kmTarget && (
              <div className="text-xs text-muted bg-card border border-card-border rounded-lg p-3">
                Recommended this week: {kmTarget.min} km · {phase?.name}
              </div>
            )}
          </div>
        </section>

        <div className="rune-divider" />

        {/* SECTION 2: Challenges */}
        <section>
          <h2 className="text-lg font-[family-name:var(--font-cinzel)] font-bold mb-1 flex items-center gap-2">
            <span>{week?.type === "competition" ? "⚔️" : "🛡️"}</span>
            {week?.type === "competition" ? "Competition Week" : "Collaboration Week"}
          </h2>

          <div className="space-y-4 mt-4">
            {soloChallenge && (
              <div className="bg-card border border-card-border rounded-lg p-4">
                <div className="text-xs uppercase tracking-wider text-muted mb-1">Solo Challenge</div>
                <div className="font-semibold text-foreground mb-1">{soloChallenge.title}</div>
                <p className="text-sm text-muted mb-3">{soloChallenge.description}</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSoloChallengeDone(true)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                      soloChallengeDone
                        ? "bg-fire/20 border-fire text-fire"
                        : "border-card-border text-muted hover:border-fire/30"
                    }`}
                  >Yes</button>
                  <button
                    type="button"
                    onClick={() => setSoloChallengeDone(false)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                      !soloChallengeDone
                        ? "bg-card-border/50 border-card-border text-foreground"
                        : "border-card-border text-muted hover:border-card-border"
                    }`}
                  >No</button>
                </div>
              </div>
            )}

            {secondChallenge && week?.type === "competition" && (
              <div className="bg-card border border-fire/20 rounded-lg p-4">
                <div className="text-xs uppercase tracking-wider text-muted mb-1">Competitive Challenge</div>
                <div className="font-semibold text-foreground mb-1">{secondChallenge.title}</div>
                <p className="text-sm text-muted mb-3">{secondChallenge.description}</p>

                <div className="flex gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setSecondChallengeAttempted(true)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                      secondChallengeAttempted
                        ? "bg-fire/20 border-fire text-fire"
                        : "border-card-border text-muted"
                    }`}
                  >Attempted</button>
                  <button
                    type="button"
                    onClick={() => { setSecondChallengeAttempted(false); setSecondChallengeResult(""); }}
                    className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                      !secondChallengeAttempted
                        ? "bg-card-border/50 border-card-border text-foreground"
                        : "border-card-border text-muted"
                    }`}
                  >Did Not Attempt</button>
                </div>

                {secondChallengeAttempted && (
                  <div>
                    <label className="block text-xs text-muted mb-1">
                      Your result
                      {secondChallenge.dataType === "time_mmss" && " (mm:ss)"}
                      {secondChallenge.dataType === "distance_km" && " (km)"}
                      {secondChallenge.dataType === "count" && " (reps)"}
                      {secondChallenge.dataType === "weight_kg" && " (kg)"}
                    </label>
                    <input
                      type={secondChallenge.dataType === "time_mmss" ? "text" : "number"}
                      step={secondChallenge.dataType === "distance_km" ? "0.1" : "1"}
                      value={secondChallengeResult}
                      onChange={(e) => setSecondChallengeResult(e.target.value)}
                      className="w-full bg-background border border-card-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-fire/50"
                      placeholder={secondChallenge.dataType === "time_mmss" ? "45:30" : "0"}
                    />
                  </div>
                )}
              </div>
            )}

            {secondChallenge && week?.type === "collaboration" && (
              <div className="bg-card border border-ice/20 rounded-lg p-4">
                <div className="text-xs uppercase tracking-wider text-muted mb-1">Team Challenge</div>
                <div className="font-semibold text-foreground mb-1">{secondChallenge.title}</div>
                <p className="text-sm text-muted mb-3">{secondChallenge.description}</p>

                {secondChallenge.dataType === "boolean" ? (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSecondChallengeAttempted(true)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                        secondChallengeAttempted
                          ? "bg-ice/20 border-ice text-ice"
                          : "border-card-border text-muted"
                      }`}
                    >Yes, I contributed</button>
                    <button
                      type="button"
                      onClick={() => setSecondChallengeAttempted(false)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                        !secondChallengeAttempted
                          ? "bg-card-border/50 border-card-border text-foreground"
                          : "border-card-border text-muted"
                      }`}
                    >No</button>
                  </div>
                ) : (
                  <div className="text-xs text-muted">
                    Your km from Section 1 counts toward the group target.
                    {secondChallenge.targetValue && ` Target: ${secondChallenge.targetValue} ${secondChallenge.dataType === "distance_km" ? "km" : ""}`}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <div className="rune-divider" />

        {/* SECTION 3: Hype Vote */}
        <section>
          <h2 className="text-lg font-[family-name:var(--font-cinzel)] font-bold mb-1">
            🛡️ Give Your Shield
          </h2>
          <p className="text-sm text-muted mb-4">Who deserves recognition this week?</p>

          <div className="grid grid-cols-3 gap-3">
            {players.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setHypeVoteFor(p.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                  hypeVoteFor === p.id
                    ? "border-fire bg-fire/10 scale-105"
                    : "border-card-border bg-card hover:border-fire/30"
                }`}
              >
                <span className="text-2xl">{SIGIL_EMOJIS[(p.sigil || "axe") as Sigil]}</span>
                <span className="text-xs truncate w-full text-center">{p.vikingName}</span>
              </button>
            ))}
          </div>
          {!hypeVoteFor && (
            <p className="text-xs text-red-400 mt-2">You must select one warrior.</p>
          )}
        </section>

        <div className="rune-divider" />

        {/* Submit */}
        {error && (
          <div className="text-red-400 text-sm text-center">{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting || !hypeVoteFor || !kmRun}
          className="w-full bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold py-4 rounded-lg text-lg hover:bg-fire/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Recording your deeds..." : "Submit My Week"}
        </button>
      </form>
    </div>
  );
}

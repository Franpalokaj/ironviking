"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { SIGIL_EMOJIS, type Sigil, getPhaseForWeek, WEEKLY_KM_TARGETS, getWeekDeadline, ACTIVITY_MULTIPLIERS } from "@/lib/constants";
import BottomNav from "@/components/BottomNav";

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
  const [draftSaved, setDraftSaved] = useState(false);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Other activities
  const [showOtherActivities, setShowOtherActivities] = useState(false);
  const [mtbKm, setMtbKm] = useState("");
  const [hikingKm, setHikingKm] = useState("");
  const [swimmingKm, setSwimmingKm] = useState("");
  const [ballSportSessions, setBallSportSessions] = useState(0);

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

  // Restore draft on week load
  useEffect(() => {
    if (!week) return;
    const draftKey = `iron-viking-draft-week-${week.id}`;
    const saved = localStorage.getItem(draftKey);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      if (draft.kmRun !== undefined) setKmRun(draft.kmRun);
      if (draft.runsCount !== undefined) setRunsCount(draft.runsCount);
      if (draft.gymSessions !== undefined) setGymSessions(draft.gymSessions);
      if (draft.soloChallengeDone !== undefined) setSoloChallengeDone(draft.soloChallengeDone);
      if (draft.secondChallengeResult !== undefined) setSecondChallengeResult(draft.secondChallengeResult);
      if (draft.secondChallengeAttempted !== undefined) setSecondChallengeAttempted(draft.secondChallengeAttempted);
      if (draft.hypeVoteFor !== undefined) setHypeVoteFor(draft.hypeVoteFor);
    } catch { /* ignore */ }
  }, [week]);

  // Auto-save draft on form changes
  function saveDraft(updates: Record<string, unknown>) {
    if (!week) return;
    const draftKey = `iron-viking-draft-week-${week.id}`;
    const current = {
      kmRun, runsCount, gymSessions, soloChallengeDone,
      secondChallengeResult, secondChallengeAttempted, hypeVoteFor,
      ...updates,
    };
    localStorage.setItem(draftKey, JSON.stringify(current));
    setDraftSaved(true);
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => setDraftSaved(false), 2000);
  }

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

      const runKm = parseFloat(kmRun) || 0;
      const mtbKmVal = parseFloat(mtbKm) || 0;
      const hikingKmVal = parseFloat(hikingKm) || 0;
      const swimmingKmVal = parseFloat(swimmingKm) || 0;
      const ballVal = ballSportSessions || 0;

      const effectiveKm = Math.round((
        runKm +
        mtbKmVal * ACTIVITY_MULTIPLIERS.mtb +
        hikingKmVal * ACTIVITY_MULTIPLIERS.hiking +
        swimmingKmVal * ACTIVITY_MULTIPLIERS.swimming +
        ballVal * ACTIVITY_MULTIPLIERS.ballSport
      ) * 10) / 10;

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekId: week.id,
          kmRun: effectiveKm,
          runsCount,
          gymSessions,
          soloChallengeDone,
          secondChallengeResult: resultValue,
          secondChallengeAttempted,
          hypeVoteFor,
          mtbKm: mtbKmVal || null,
          hikingKm: hikingKmVal || null,
          swimmingKm: swimmingKmVal || null,
          ballSportSessions: ballVal || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Submission failed");
        return;
      }

      const data = await res.json();
      // Clear draft after successful submission
      if (week) localStorage.removeItem(`iron-viking-draft-week-${week.id}`);
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
      <div className="min-h-dvh flex items-center justify-center px-4 bg-background">
        <div className="text-center max-w-sm animate-[fadeIn_0.6s_ease-out]">
          {/* Ember particles background feel */}
          <div className="relative inline-block mb-6">
            <div className="text-8xl animate-[ember_2s_ease-in-out_infinite]">⚔️</div>
            <div className="absolute inset-0 blur-xl opacity-40 text-8xl">⚔️</div>
          </div>
          <h2 className="text-3xl font-[family-name:var(--font-cinzel)] font-bold text-fire mb-3">
            Your Deeds Are Recorded
          </h2>
          <p className="text-muted mb-2 font-[family-name:var(--font-cinzel)]">
            The gods have witnessed your sacrifice.
          </p>
          <p className="text-sm text-muted/70 mb-2">
            Week {week?.weekNumber} scroll sealed.
          </p>
          {error && <p className="text-yellow-400 text-sm mb-4">{error}</p>}
          <div className="rune-divider my-6" />
          <p className="text-xs text-muted mb-6 italic">
            &ldquo;Not the strength, but the constancy of effort is what wins the war.&rdquo;
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold px-8 py-3 rounded-lg hover:bg-fire/90 transition-colors"
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
    <div className="min-h-dvh pb-28">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-card-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="text-muted hover:text-foreground">
            ← Back
          </button>
          <h1 className="text-sm font-[family-name:var(--font-cinzel)] font-bold text-fire">
            Week {week?.weekNumber} Scroll
          </h1>
          <div className="text-xs text-muted">
            {draftSaved ? <span className="text-green-400">Draft saved</span> : deadlineStr}
          </div>
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
                  onChange={(e) => { setKmRun(e.target.value); saveDraft({ kmRun: e.target.value }); }}
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
                  onClick={() => { const v = Math.max(0, runsCount - 1); setRunsCount(v); saveDraft({ runsCount: v }); }}
                  className="w-12 h-12 bg-card border border-card-border rounded-lg text-foreground text-xl hover:border-fire/30"
                >−</button>
                <span className="text-xl font-bold w-8 text-center">{runsCount}</span>
                <button
                  type="button"
                  onClick={() => { const v = Math.min(14, runsCount + 1); setRunsCount(v); saveDraft({ runsCount: v }); }}
                  className="w-12 h-12 bg-card border border-card-border rounded-lg text-foreground text-xl hover:border-fire/30"
                >+</button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Gym / strength sessions</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { const v = Math.max(0, gymSessions - 1); setGymSessions(v); saveDraft({ gymSessions: v }); }}
                  className="w-12 h-12 bg-card border border-card-border rounded-lg text-foreground text-xl hover:border-fire/30"
                >−</button>
                <span className="text-xl font-bold w-8 text-center">{gymSessions}</span>
                <button
                  type="button"
                  onClick={() => { const v = Math.min(7, gymSessions + 1); setGymSessions(v); saveDraft({ gymSessions: v }); }}
                  className="w-12 h-12 bg-card border border-card-border rounded-lg text-foreground text-xl hover:border-fire/30"
                >+</button>
              </div>
            </div>

            {kmTarget && (
              <div className="text-xs text-muted bg-card border border-card-border rounded-lg p-3">
                Recommended this week: {kmTarget.min} km · {phase?.name}
              </div>
            )}

            {/* Other Activities */}
            <div>
              <button
                type="button"
                onClick={() => setShowOtherActivities(!showOtherActivities)}
                className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors w-full text-left"
              >
                <span className={`transition-transform ${showOtherActivities ? "rotate-90" : ""}`}>▶</span>
                Other activities this week
                {(parseFloat(mtbKm) > 0 || parseFloat(hikingKm) > 0 || parseFloat(swimmingKm) > 0 || ballSportSessions > 0) && (
                  <span className="text-fire text-xs ml-auto">({(
                    (parseFloat(mtbKm) || 0) * ACTIVITY_MULTIPLIERS.mtb +
                    (parseFloat(hikingKm) || 0) * ACTIVITY_MULTIPLIERS.hiking +
                    (parseFloat(swimmingKm) || 0) * ACTIVITY_MULTIPLIERS.swimming +
                    ballSportSessions * ACTIVITY_MULTIPLIERS.ballSport
                  ).toFixed(1)} effective km)</span>
                )}
              </button>

              {showOtherActivities && (
                <div className="mt-3 space-y-3 bg-card border border-card-border rounded-lg p-4">
                  <p className="text-xs text-muted">Activities are converted to effective km based on physiological load. Running km always count at 1.0x.</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted mb-1">🚵 MTB (km × 0.35)</label>
                      <input
                        type="number" step="0.1" min="0" value={mtbKm}
                        onChange={(e) => { setMtbKm(e.target.value); saveDraft({ mtbKm: e.target.value }); }}
                        className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-fire/50"
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">🥾 Hiking (km × 0.45)</label>
                      <input
                        type="number" step="0.1" min="0" value={hikingKm}
                        onChange={(e) => { setHikingKm(e.target.value); saveDraft({ hikingKm: e.target.value }); }}
                        className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-fire/50"
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">🏊 Swimming (km × 3.0)</label>
                      <input
                        type="number" step="0.1" min="0" value={swimmingKm}
                        onChange={(e) => { setSwimmingKm(e.target.value); saveDraft({ swimmingKm: e.target.value }); }}
                        className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-fire/50"
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">🎾 Ball sports (× 2.5 km)</label>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => { const v = Math.max(0, ballSportSessions - 1); setBallSportSessions(v); saveDraft({ ballSportSessions: v }); }}
                          className="w-8 h-8 bg-background border border-card-border rounded text-foreground hover:border-fire/30">−</button>
                        <span className="text-sm font-bold w-4 text-center">{ballSportSessions}</span>
                        <button type="button" onClick={() => { const v = ballSportSessions + 1; setBallSportSessions(v); saveDraft({ ballSportSessions: v }); }}
                          className="w-8 h-8 bg-background border border-card-border rounded text-foreground hover:border-fire/30">+</button>
                      </div>
                    </div>
                  </div>

                  {/* Effective km summary */}
                  {(() => {
                    const runKmVal = parseFloat(kmRun) || 0;
                    const total = Math.round((
                      runKmVal +
                      (parseFloat(mtbKm) || 0) * ACTIVITY_MULTIPLIERS.mtb +
                      (parseFloat(hikingKm) || 0) * ACTIVITY_MULTIPLIERS.hiking +
                      (parseFloat(swimmingKm) || 0) * ACTIVITY_MULTIPLIERS.swimming +
                      ballSportSessions * ACTIVITY_MULTIPLIERS.ballSport
                    ) * 10) / 10;
                    return (
                      <div className="bg-fire/10 border border-fire/20 rounded-lg p-3 text-center">
                        <div className="text-xs text-muted">Effective km total (used for scoring)</div>
                        <div className="text-xl font-bold text-fire">{total} km</div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
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
                    onClick={() => { setSoloChallengeDone(true); saveDraft({ soloChallengeDone: true }); }}
                    className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                      soloChallengeDone
                        ? "bg-fire/20 border-fire text-fire"
                        : "border-card-border text-muted hover:border-fire/30"
                    }`}
                  >Yes</button>
                  <button
                    type="button"
                    onClick={() => { setSoloChallengeDone(false); saveDraft({ soloChallengeDone: false }); }}
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
                      {secondChallenge.dataType === "count" && " (runs — auto-filled from above)"}
                      {secondChallenge.dataType === "weight_kg" && " (kg)"}
                    </label>
                    {secondChallenge.dataType === "count" ? (
                      <div className="w-full bg-background border border-card-border rounded-lg px-4 py-3 text-muted text-sm">
                        {runsCount} run{runsCount !== 1 ? "s" : ""} — taken from your runs count above
                      </div>
                    ) : (
                      <input
                        type={secondChallenge.dataType === "time_mmss" ? "text" : "number"}
                        step={secondChallenge.dataType === "distance_km" ? "0.1" : "1"}
                        value={secondChallengeResult}
                        onChange={(e) => { setSecondChallengeResult(e.target.value); saveDraft({ secondChallengeResult: e.target.value }); }}
                        className="w-full bg-background border border-card-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-fire/50"
                        placeholder={secondChallenge.dataType === "time_mmss" ? "45:30" : "0"}
                      />
                    )}
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
                onClick={() => { setHypeVoteFor(p.id); saveDraft({ hypeVoteFor: p.id }); }}
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
      <BottomNav active="submit" profileId={session?.playerId} />
    </div>
  );
}

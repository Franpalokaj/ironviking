"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SIGIL_IMAGES, getPhaseForWeek, WEEKLY_KM_TARGETS, getWeekDeadline, ACTIVITY_MULTIPLIERS } from "@/lib/constants";
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
  const [buddyChallenge, setBuddyChallenge] = useState<Challenge | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form state
  const [kmRun, setKmRun] = useState("");
  const [runsCount, setRunsCount] = useState(0);
  const [gymSessions, setGymSessions] = useState(0);
  const [berserkerGym, setBerserkerGym] = useState(false);
  const [soloChallengeDone, setSoloChallengeDone] = useState(false);
  const [secondChallengeResult, setSecondChallengeResult] = useState("");
  const [secondChallengeAttempted, setSecondChallengeAttempted] = useState(false);
  const [buddyChallengeDone, setBuddyChallengeDone] = useState(false);
  const [buddyChallengeResult, setBuddyChallengeResult] = useState("");
  const [buddyTeammateName, setBuddyTeammateName] = useState<string | null>(null);
  const [hypeVoteFor, setHypeVoteFor] = useState<number | null>(null);
  const [hypeVoteMessage, setHypeVoteMessage] = useState("");
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
      setBuddyChallenge(weekData.buddyChallenge || null);
      const allPlayers = (playersData.players || []) as (Player & { buddyTeamId?: number | null })[];
      setPlayers(allPlayers.filter((p) => p.id !== s.playerId));

      // Find buddy teammate name
      const me = allPlayers.find((p: Player) => p.id === s.playerId) as (Player & { buddyTeamId?: number | null }) | undefined;
      if (me?.buddyTeamId) {
        const teammates = allPlayers
          .filter((p) => p.id !== s.playerId && p.buddyTeamId === me.buddyTeamId)
          .map((p) => p.vikingName)
          .filter(Boolean);
        if (teammates.length > 0) setBuddyTeammateName(teammates.join(" & "));
      }

      if (weekData.week) {
        const subRes = await fetch(`/api/submissions?weekId=${weekData.week.id}`);
        const subData = await subRes.json();
        if (subData.submission) setAlreadySubmitted(true);

        // Auto-populate buddy challenge result from teammate's submission
        if (weekData.buddyChallenge && me?.buddyTeamId) {
          const teammateIds = allPlayers
            .filter((p) => p.id !== s.playerId && p.buddyTeamId === me.buddyTeamId)
            .map((p) => p.id);
          for (const tid of teammateIds) {
            const tRes = await fetch(`/api/submissions/buddy?weekId=${weekData.week.id}&playerId=${tid}`);
            if (tRes.ok) {
              const tData = await tRes.json();
              if (tData.buddyChallengeResult != null) {
                if (weekData.buddyChallenge.dataType === "time_mmss") {
                  const totalSec = tData.buddyChallengeResult;
                  const min = Math.floor(totalSec / 60);
                  const sec = totalSec % 60;
                  setBuddyChallengeResult(`${min}:${String(sec).padStart(2, "0")}`);
                } else {
                  setBuddyChallengeResult(String(tData.buddyChallengeResult));
                }
              }
              if (tData.buddyChallengeDone) {
                setBuddyChallengeDone(true);
              }
              break;
            }
          }
        }
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
      if (draft.berserkerGym !== undefined) setBerserkerGym(draft.berserkerGym);
      if (draft.soloChallengeDone !== undefined) setSoloChallengeDone(draft.soloChallengeDone);
      if (draft.secondChallengeResult !== undefined) setSecondChallengeResult(draft.secondChallengeResult);
      if (draft.secondChallengeAttempted !== undefined) setSecondChallengeAttempted(draft.secondChallengeAttempted);
      if (draft.buddyChallengeDone !== undefined) setBuddyChallengeDone(draft.buddyChallengeDone);
      if (draft.buddyChallengeResult !== undefined) setBuddyChallengeResult(draft.buddyChallengeResult);
      if (draft.hypeVoteFor !== undefined) setHypeVoteFor(draft.hypeVoteFor);
      if (draft.hypeVoteMessage !== undefined) setHypeVoteMessage(draft.hypeVoteMessage ?? "");
    } catch { /* ignore */ }
  }, [week]);

  // Auto-save draft on form changes
  function saveDraft(updates: Record<string, unknown>) {
    if (!week) return;
    const draftKey = `iron-viking-draft-week-${week.id}`;
    const current = {
      kmRun, runsCount, gymSessions, berserkerGym, soloChallengeDone,
      secondChallengeResult, secondChallengeAttempted,
      buddyChallengeDone, buddyChallengeResult,
      hypeVoteFor, hypeVoteMessage,
      ...updates,
    };
    localStorage.setItem(draftKey, JSON.stringify(current));
    setDraftSaved(true);
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => setDraftSaved(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!week || !session) return;

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

      // Buddy challenge result conversion
      let buddyResultValue: number | null = null;
      if (buddyChallenge && buddyChallenge.dataType !== "boolean" && buddyChallengeResult) {
        if (buddyChallenge.dataType === "time_mmss") {
          const parts = buddyChallengeResult.split(":");
          if (parts.length === 2) {
            buddyResultValue = parseInt(parts[0]) * 60 + parseInt(parts[1]);
          }
        } else {
          buddyResultValue = parseFloat(buddyChallengeResult);
        }
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
          berserkerGym,
          soloChallengeDone,
          secondChallengeResult: resultValue,
          secondChallengeAttempted,
          buddyChallengeDone,
          buddyChallengeResult: buddyResultValue,
          hypeVoteFor,
          hypeVoteMessage: hypeVoteMessage.trim() || null,
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
            <div className="text-4xl font-[family-name:var(--font-cinzel)] font-bold text-fire animate-pulse tracking-widest">SEALED</div>
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
          <div className="flex justify-center my-8">
            <Image unoptimized src="/images/ui/dividers/long.png" alt="" width={300} height={12} className="opacity-60" />
          </div>
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
          <div className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-gold mb-4">RECORDED</div>
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
            Training This Week
          </h2>

          <div className="space-y-5">
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
              <button
                type="button"
                onClick={() => { setBerserkerGym(!berserkerGym); saveDraft({ berserkerGym: !berserkerGym }); }}
                className={`mt-4 w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-3 text-left text-sm transition-colors ${
                  berserkerGym ? "border-fire bg-fire/10 text-fire" : "border-card-border bg-card text-muted hover:border-fire/30"
                }`}
              >
                <span className="font-[family-name:var(--font-cinzel)] font-semibold">Berserker&apos;s Forge</span>
                <span className="text-xs">{berserkerGym ? "+15 XP" : "Tag a hard battle"}</span>
              </button>
              <p className="text-[10px] text-muted mt-1 mb-2">One session was a proper forge — counts 50% more.</p>
            </div>


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
                      <label className="block text-xs text-muted mb-1">MTB (km × 0.35)</label>
                      <input
                        type="number" step="0.1" min="0" value={mtbKm}
                        onChange={(e) => { setMtbKm(e.target.value); saveDraft({ mtbKm: e.target.value }); }}
                        className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-fire/50"
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Hiking (km × 0.45)</label>
                      <input
                        type="number" step="0.1" min="0" value={hikingKm}
                        onChange={(e) => { setHikingKm(e.target.value); saveDraft({ hikingKm: e.target.value }); }}
                        className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-fire/50"
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Swimming (km × 3.0)</label>
                      <input
                        type="number" step="0.1" min="0" value={swimmingKm}
                        onChange={(e) => { setSwimmingKm(e.target.value); saveDraft({ swimmingKm: e.target.value }); }}
                        className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-fire/50"
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Ball sports (× 2.5 km)</label>
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

        <div className="my-8 flex justify-center">
          <Image unoptimized src="/images/ui/dividers/long.png" alt="" width={2000} height={12} className="h-auto opacity-60" style={{ width: "97%" }} />
        </div>

        {/* SECTION 2: Challenges */}
        <section>
          <h2 className="text-lg font-[family-name:var(--font-cinzel)] font-bold mb-1 flex items-center gap-2">
            {week?.type === "competition" ? "Competition Week" : "Collaboration Week"}
          </h2>

          <div className="space-y-4 mt-4">
            {soloChallenge && (
              <div className="bg-background border border-card-border rounded-lg p-5">
                <div className="text-sm uppercase tracking-wider text-muted mb-2 font-semibold">Solo Challenge</div>
                <div className="font-[family-name:var(--font-cinzel)] font-bold text-foreground text-xl mb-2">{soloChallenge.title}</div>
                <p className="text-sm text-muted mb-4">{soloChallenge.description}</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setSoloChallengeDone(true); saveDraft({ soloChallengeDone: true }); }}
                    className={`relative flex-1 transition-opacity ${soloChallengeDone ? "opacity-100" : "opacity-25 hover:opacity-40"}`}
                  >
                    <Image unoptimized src="/images/ui/buttons/secondary.png" alt="" width={400} height={133} className="w-full h-auto" />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-[family-name:var(--font-cinzel)] font-semibold text-foreground">Yes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSoloChallengeDone(false); saveDraft({ soloChallengeDone: false }); }}
                    className={`relative flex-1 transition-opacity ${!soloChallengeDone ? "opacity-100" : "opacity-25 hover:opacity-40"}`}
                  >
                    <Image unoptimized src="/images/ui/buttons/secondary.png" alt="" width={400} height={133} className="w-full h-auto" />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-[family-name:var(--font-cinzel)] font-semibold text-foreground">No</span>
                  </button>
                </div>
              </div>
            )}

            {secondChallenge && week?.type === "competition" && (
              <div className="bg-background border border-card-border rounded-lg p-5">
                <div className="text-sm uppercase tracking-wider text-muted mb-2 font-semibold">Competitive Challenge</div>
                <div className="font-[family-name:var(--font-cinzel)] font-bold text-foreground text-xl mb-2">{secondChallenge.title}</div>
                <p className="text-sm text-muted mb-4">{secondChallenge.description}</p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSecondChallengeAttempted(true)}
                    className={`relative flex-1 transition-opacity ${secondChallengeAttempted ? "opacity-100" : "opacity-25 hover:opacity-40"}`}
                  >
                    <Image unoptimized src="/images/ui/buttons/secondary.png" alt="" width={400} height={133} className="w-full h-auto" />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-[family-name:var(--font-cinzel)] font-semibold text-foreground">Attempted</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSecondChallengeAttempted(false); setSecondChallengeResult(""); }}
                    className={`relative flex-1 transition-opacity ${!secondChallengeAttempted ? "opacity-100" : "opacity-25 hover:opacity-40"}`}
                  >
                    <Image unoptimized src="/images/ui/buttons/secondary.png" alt="" width={400} height={133} className="w-full h-auto" />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-[family-name:var(--font-cinzel)] font-semibold text-foreground">Did Not Attempt</span>
                  </button>
                </div>

                {secondChallengeAttempted && (() => {
                  const title = (secondChallenge.title || "").toLowerCase();
                  const isGymCount = title.includes("gym");
                  const autoCount = isGymCount ? gymSessions : runsCount;
                  const autoLabel = isGymCount ? "gym session" : "run";
                  return (
                  <div>
                    <label className="block text-xs text-muted mb-1">
                      Your result
                      {secondChallenge.dataType === "time_mmss" && " (mm:ss)"}
                      {secondChallenge.dataType === "distance_km" && " (km)"}
                      {secondChallenge.dataType === "count" && ` (${autoLabel}s — auto-filled from above)`}
                      {secondChallenge.dataType === "weight_kg" && " (kg)"}
                    </label>
                    {secondChallenge.dataType === "count" ? (
                      <div className="w-full bg-background border border-card-border rounded-lg px-4 py-3 text-muted text-sm">
                        {autoCount} {autoLabel}{autoCount !== 1 ? "s" : ""} — taken from above
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
                  );
                })()}
              </div>
            )}

            {secondChallenge && week?.type === "collaboration" && (
              <div className="bg-background border border-card-border rounded-lg p-5">
                <div className="text-sm uppercase tracking-wider text-muted mb-2 font-semibold">Team Challenge</div>
                <div className="font-[family-name:var(--font-cinzel)] font-bold text-foreground text-xl mb-2">{secondChallenge.title}</div>
                <p className="text-sm text-muted mb-4">{secondChallenge.description}</p>

                {secondChallenge.dataType === "boolean" ? (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSecondChallengeAttempted(true)}
                      className={`relative flex-1 transition-opacity ${secondChallengeAttempted ? "opacity-100" : "opacity-25 hover:opacity-40"}`}
                    >
                      <Image unoptimized src="/images/ui/buttons/secondary.png" alt="" width={400} height={133} className="w-full h-auto" />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-[family-name:var(--font-cinzel)] font-semibold text-foreground">Yes, I contributed</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSecondChallengeAttempted(false)}
                      className={`relative flex-1 transition-opacity ${!secondChallengeAttempted ? "opacity-100" : "opacity-25 hover:opacity-40"}`}
                    >
                      <Image unoptimized src="/images/ui/buttons/secondary.png" alt="" width={400} height={133} className="w-full h-auto" />
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-[family-name:var(--font-cinzel)] font-semibold text-foreground">No</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-muted">
                    Your km from Section 1 counts toward the group target.
                    {secondChallenge.targetValue && ` Target: ${secondChallenge.targetValue} ${secondChallenge.dataType === "distance_km" ? "km" : ""}`}
                  </div>
                )}
              </div>
            )}
            {buddyChallenge && (
              <div className="bg-background border border-card-border rounded-lg p-5">
                <div className="text-sm uppercase tracking-wider text-muted mb-2 font-semibold">Buddy Challenge</div>
                {buddyTeammateName && (
                  <div className="text-xs text-gold mb-2">Your buddy: {buddyTeammateName}</div>
                )}
                <div className="font-[family-name:var(--font-cinzel)] font-bold text-foreground text-xl mb-2">{buddyChallenge.title}</div>
                <p className="text-sm text-muted mb-4">{buddyChallenge.description}</p>

                {buddyChallenge.dataType === "boolean" ? (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setBuddyChallengeDone(true); saveDraft({ buddyChallengeDone: true }); }}
                      className={`relative flex-1 transition-opacity ${buddyChallengeDone ? "opacity-100" : "opacity-25 hover:opacity-40"}`}
                    >
                      <Image unoptimized src="/images/ui/buttons/secondary.png" alt="" width={400} height={133} className="w-full h-auto" />
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-[family-name:var(--font-cinzel)] font-semibold text-foreground">Yes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBuddyChallengeDone(false); saveDraft({ buddyChallengeDone: false }); }}
                      className={`relative flex-1 transition-opacity ${!buddyChallengeDone ? "opacity-100" : "opacity-25 hover:opacity-40"}`}
                    >
                      <Image unoptimized src="/images/ui/buttons/secondary.png" alt="" width={400} height={133} className="w-full h-auto" />
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-[family-name:var(--font-cinzel)] font-semibold text-foreground">No</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-muted mb-1">
                      Team result
                      {buddyChallenge.dataType === "time_mmss" && " (mm:ss)"}
                      {buddyChallenge.dataType === "distance_km" && " (km)"}
                      {buddyChallenge.dataType === "count" && " (count)"}
                      {buddyChallenge.dataType === "weight_kg" && " (kg)"}
                    </label>
                    <input
                      type={buddyChallenge.dataType === "time_mmss" ? "text" : "number"}
                      step={buddyChallenge.dataType === "distance_km" ? "0.1" : "1"}
                      value={buddyChallengeResult}
                      onChange={(e) => { setBuddyChallengeResult(e.target.value); saveDraft({ buddyChallengeResult: e.target.value }); }}
                      className="w-full bg-background border border-card-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-gold/50"
                      placeholder={buddyChallenge.dataType === "time_mmss" ? "2:30" : "0"}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <div className="my-8 flex justify-center">
          <Image unoptimized src="/images/ui/dividers/long.png" alt="" width={2000} height={12} className="h-auto opacity-60" style={{ width: "97%" }} />
        </div>

        {/* SECTION 3: Hype Vote */}
        <section>
          <h2 className="text-lg font-[family-name:var(--font-cinzel)] font-bold mb-1">
            Give Your Shield
          </h2>
          <p className="text-sm text-muted mb-4">Who deserves recognition this week?</p>

          <div className="grid grid-cols-2 gap-3">
            {players.map((p) => {
              const sigilSrc = SIGIL_IMAGES[p.sigil || "axe"] || SIGIL_IMAGES["axe"];
              const selected = hypeVoteFor === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    const newVal = selected ? null : p.id;
                    setHypeVoteFor(newVal);
                    saveDraft({ hypeVoteFor: newVal });
                  }}
                  className={`relative rounded-lg border transition-all ${
                    selected
                      ? "border-fire bg-fire/10 scale-[1.03]"
                      : "border-card-border bg-background hover:border-fire/30"
                  }`}
                  style={{ aspectRatio: "3 / 2.2", overflow: "hidden" }}
                >
                  {/* Sigil — pinned near top, overflows bottom */}
                  <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none" style={{ top: "3px", opacity: 0.85, width: "67%" }}>
                    <Image
                      unoptimized
                      src={sigilSrc}
                      alt={p.sigil || "axe"}
                      width={400}
                      height={400}
                      className="w-full h-auto select-none"
                      draggable={false}
                    />
                  </div>
                  {/* Name overlay at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 z-10 pb-3 pt-11 text-center" style={{ background: "linear-gradient(to top, rgba(13,12,11,0.85) 45%, transparent 100%)" }}>
                    <span className="font-[family-name:var(--font-cinzel)] font-semibold text-foreground" style={{ fontSize: "15px" }}>
                      {p.vikingName}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {hypeVoteFor && (
            <div className="mt-3">
              <label className="block text-xs text-muted mb-1">Add a short message (optional)</label>
              <input
                type="text"
                maxLength={300}
                value={hypeVoteMessage}
                onChange={(e) => { setHypeVoteMessage(e.target.value); saveDraft({ hypeVoteMessage: e.target.value }); }}
                placeholder="e.g. Great week, warrior!"
                className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-fire/50"
              />
              <p className="text-[10px] text-muted mt-0.5">They’ll see this when scores are settled.</p>
            </div>
          )}
          {!hypeVoteFor && (
            <p className="text-xs text-muted mt-2">Tap a warrior to give your shield — or withhold it this week.</p>
          )}
        </section>

        <div className="my-8 flex justify-center">
          <Image unoptimized src="/images/ui/dividers/long.png" alt="" width={2000} height={12} className="h-auto opacity-60" style={{ width: "97%" }} />
        </div>

        {/* Submit */}
        {error && (
          <div className="text-red-400 text-sm text-center">{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting || !kmRun}
          className="w-full hover:opacity-90 disabled:opacity-75 disabled:cursor-not-allowed transition-opacity"
        >
          <Image
            unoptimized
            src="/images/ui/buttons/submit-week.png"
            alt={submitting ? "Recording your deeds..." : "Submit My Week"}
            width={400}
            height={60}
            className="w-full h-auto"
          />
        </button>
      </form>
      <BottomNav active="submit" profileId={session?.playerId} />
    </div>
  );
}

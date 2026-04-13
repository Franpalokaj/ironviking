"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { SIGIL_EMOJIS, type Sigil, getTitleForXP, getNextTitle, TITLE_STYLES, BENCHMARK_DEFINITIONS, calculateBenchmarkXP } from "@/lib/constants";
import XPProgressBar from "@/components/XPProgressBar";
import RealmBadge from "@/components/RealmBadge";
import BottomNav from "@/components/BottomNav";

interface PlayerData {
  id: number;
  vikingName: string;
  sigil: string;
}

interface Stats {
  totalKm: number;
  totalRuns: number;
  totalGym: number;
  shieldsReceived: number;
  shieldsGiven: number;
  currentXp: number;
  currentTitle: string;
}

interface Score {
  weekId: number;
  weekNumber: number;
  kmPoints: number;
  rankBonus: number;
  soloChallengePoints: number;
  secondChallengePoints: number;
  buddyChallengePoints: number;
  streakBonus: number;
  shieldPoints: number;
  prBonus: number;
  ontimeBonus: number;
  firstSubmissionBonus: number;
  forgeBonus: number;
  runBonus: number;
  gymBonus: number;
  berserkerMultiplier: number;
  catchUpMultiplier?: number;
  totalRaw: number;
  totalFinal: number;
  xpTotalAfter: number;
  titleAfter: string;
  realmRankWeek: number;
}

interface Submission {
  weekId: number;
  kmRun: number;
  runsCount: number;
  gymSessions: number;
  mtbKm: number | null;
  hikingKm: number | null;
  swimmingKm: number | null;
  ballSportSessions: number | null;
}

interface Milestone {
  type: string;
  value: number | null;
  achievedAt: string;
}

interface Conquest {
  id: number;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
}

interface QuestLogEntry {
  weekId: number;
  weekNumber: number;
  soloChallenge: { title: string; track: string; difficulty: string } | null;
  soloDone: boolean;
  secondChallenge: { title: string; track: string; difficulty: string } | null;
  secondAttempted: boolean;
  secondResult: number | null;
  secondXpEarned: boolean | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const playerId = params.id as string;

  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [conquests, setConquests] = useState<Conquest[]>([]);
  const [questLog, setQuestLog] = useState<QuestLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [benchmarkBaselines, setBenchmarkBaselines] = useState<{ skill: string; value: number; setAt: string }[]>([]);
  const [benchmarkGoalsList, setBenchmarkGoalsList] = useState<{ skill: string; goalValue: number; xpReward: number; achieved: boolean; latestRecordedValue?: number | null }[]>([]);
  const [recordingSkill, setRecordingSkill] = useState<string | null>(null);
  const [recordValue, setRecordValue] = useState("");
  const [settingGoalSkill, setSettingGoalSkill] = useState<string | null>(null);
  const [goalValue, setGoalValue] = useState("");
  const [benchmarkSaving, setBenchmarkSaving] = useState(false);
  const [showLogbook, setShowLogbook] = useState(false);
  const [shieldMessagesByWeek, setShieldMessagesByWeek] = useState<Record<number, { giverName: string; message: string | null }[]>>({});

  const loadData = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) { router.push("/login"); return; }
      const sessionData = await sessionRes.json();
      setIsOwnProfile(String(sessionData.session.playerId) === playerId);

      const res = await fetch(`/api/players?id=${playerId}`);
      if (!res.ok) { router.push("/dashboard"); return; }
      const data = await res.json();

      setPlayer(data.player);
      setStats(data.stats);
      setScores(data.scores || []);
      setSubmissions(data.submissions || []);
      setMilestones(data.milestones || []);
      setConquests(data.conquests || []);
      setQuestLog(data.questLog || []);
      setShieldMessagesByWeek(data.shieldMessagesByWeek || {});

      const baselineRes = await fetch(`/api/baselines?playerId=${playerId}`);
      if (baselineRes.ok) {
        const bData = await baselineRes.json();
        setBenchmarkBaselines(bData.baselines || []);
        setBenchmarkGoalsList(bData.goals || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [playerId, router]);

  async function completeConquest(conquestId: number) {
    setCompletingId(conquestId);
    try {
      const res = await fetch("/api/conquests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conquestId, completed: true }),
      });
      if (res.ok) {
        setConquests((prev) =>
          prev.map((c) =>
            c.id === conquestId ? { ...c, completed: true } : c
          )
        );
      }
    } finally {
      setCompletingId(null);
    }
  }

  async function saveBaseline(skill: string, value: string) {
    setBenchmarkSaving(true);
    try {
      const res = await fetch("/api/baselines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill, value: parseFloat(value) }),
      });
      if (res.ok) {
        setRecordingSkill(null);
        setRecordValue("");
        const bRes = await fetch(`/api/baselines?playerId=${playerId}`);
        if (bRes.ok) {
          const bData = await bRes.json();
          setBenchmarkBaselines(bData.baselines || []);
          setBenchmarkGoalsList(bData.goals || []);
        }
      }
    } finally {
      setBenchmarkSaving(false);
    }
  }

  async function saveBenchmarkGoal(skill: string, value: string) {
    setBenchmarkSaving(true);
    try {
      const res = await fetch("/api/benchmark-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill, goalValue: parseFloat(value) }),
      });
      if (res.ok) {
        setSettingGoalSkill(null);
        setGoalValue("");
        const bRes = await fetch(`/api/baselines?playerId=${playerId}`);
        if (bRes.ok) {
          const bData = await bRes.json();
          setBenchmarkGoalsList(bData.goals || []);
        }
      }
    } finally {
      setBenchmarkSaving(false);
    }
  }

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-fire font-[family-name:var(--font-cinzel)] animate-pulse">
          Reading the sagas...
        </div>
      </div>
    );
  }

  if (!player || !stats) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-muted">Warrior not found.</div>
      </div>
    );
  }

  const xp = stats.currentXp;
  const title = getTitleForXP(xp);
  const next = getNextTitle(xp);
  const latestRank = scores[0]?.realmRankWeek || 6;
  const submissionStreak = submissions.length;
  const titleStyle = TITLE_STYLES[title.name] || TITLE_STYLES["Thrall"];

  const milestoneTypes: Record<string, { label: string; icon: string }> = {
    first_20km_week: { label: "First 20km Week", icon: "🏃" },
    first_30km_week: { label: "First 30km Week", icon: "🏃" },
    first_40km_week: { label: "First 40km Week", icon: "🏃" },
    skald_monthly: { label: "Skald of the Month", icon: "📜" },
  };

  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-card-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="text-muted hover:text-foreground">
            ← Back
          </button>
          <h1 className="text-sm font-[family-name:var(--font-cinzel)] font-bold text-fire">Profile</h1>
          <div />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Player header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">{SIGIL_EMOJIS[(player.sigil || "axe") as Sigil]}</div>
          <h2 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-foreground">
            {player.vikingName}
          </h2>
          <div className={`mt-1 font-[family-name:var(--font-cinzel)] ${titleStyle.color} ${titleStyle.glowClass || ""}`}>
            <span className="mr-1">{titleStyle.icon}</span>
            <span className="mr-1 opacity-50 text-xs">{titleStyle.rune}</span>
            {title.name}
            <span className="text-muted text-sm ml-2">— {title.description}</span>
          </div>
          <div className="mt-2"><RealmBadge rank={latestRank} /></div>
        </div>

        {/* XP bar */}
        <div className="bg-card border border-card-border rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gold font-[family-name:var(--font-cinzel)] font-bold">{Math.round(xp)} XP</span>
            {next && <span className="text-xs text-muted">{Math.round(next.threshold - xp)} to {next.name}</span>}
          </div>
          <XPProgressBar xp={xp} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card border border-card-border rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-fire">{Math.round(stats.totalKm)}</div>
            <div className="text-[10px] text-muted">Total km</div>
          </div>
          <div className="bg-card border border-card-border rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-foreground">{stats.totalRuns}</div>
            <div className="text-[10px] text-muted">Total Runs</div>
          </div>
          <div className="bg-card border border-card-border rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-foreground">{stats.totalGym}</div>
            <div className="text-[10px] text-muted">Gym Sessions</div>
          </div>
          <div className="bg-card border border-card-border rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-foreground">{stats.shieldsReceived}</div>
            <div className="text-[10px] text-muted">🛡️ Received</div>
          </div>
          <div className="bg-card border border-card-border rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-foreground">{stats.shieldsGiven}</div>
            <div className="text-[10px] text-muted">🛡️ Given</div>
          </div>
          <div className="bg-card border border-card-border rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-fire">{submissionStreak}</div>
            <div className="text-[10px] text-muted">Weeks Active</div>
          </div>
        </div>

        {/* Conquests progress summary */}
        {conquests.length > 0 && (
          <div className="bg-card border border-card-border rounded-lg p-3 mb-6 text-sm">
            <span className="text-muted">Conquests:</span>{" "}
            <span className="text-gold font-bold">{conquests.filter(c => c.completed).length} / {conquests.length}</span>
            <span className="text-muted"> completed</span>
          </div>
        )}

        {/* Weekly km chart (simple bar) */}
        {submissions.length > 0 && (
          <div className="mb-6">
            <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-sm mb-3">Weekly Kilometres</h3>
            <div className="flex items-end gap-1 h-24">
              {[...submissions].sort((a, b) => a.weekId - b.weekId).map((sub, i) => {
                const maxKm = Math.max(...submissions.map(s => s.kmRun), 1);
                const height = (sub.kmRun / maxKm) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-fire/30 hover:bg-fire/50 rounded-t transition-colors"
                    style={{ height: `${height}%`, minHeight: "2px" }}
                    title={`${sub.kmRun} km`}
                  />
                );
              })}
            </div>
          </div>
        )}

        <div className="rune-divider my-6" />

        {/* Quest Log */}
        {questLog.length > 0 && (
          <>
            <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-sm mb-3">Quest Log</h3>
            <div className="space-y-2 mb-6">
              {questLog.map((q, i) => (
                <div key={i} className="bg-card border border-card-border rounded-lg p-3">
                  <div className="text-xs text-muted mb-2 font-[family-name:var(--font-cinzel)]">Week {q.weekNumber}</div>
                  {q.soloChallenge && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className={q.soloDone ? "text-green-400" : "text-red-400/60"}>
                        {q.soloDone ? "✓" : "✗"}
                      </span>
                      <span className={q.soloDone ? "text-foreground" : "text-muted"}>
                        🎯 {q.soloChallenge.title}
                      </span>
                    </div>
                  )}
                  {q.secondChallenge && (
                    <div className="flex items-start gap-2 text-sm mt-1">
                      <span className={
                        q.secondXpEarned === true ? "text-green-400" :
                        q.secondXpEarned === false ? "text-red-400/60" :
                        q.secondAttempted ? "text-yellow-500/70" : "text-red-400/60"
                      }>
                        {q.secondXpEarned === true ? "✓" : q.secondXpEarned === false ? "✗" : q.secondAttempted ? "~" : "✗"}
                      </span>
                      <span className={q.secondAttempted ? "text-foreground" : "text-muted"}>
                        {q.secondChallenge.track === "competitive" ? "⚔️" : "🛡️"} {q.secondChallenge.title}
                        {q.secondXpEarned === false && q.secondAttempted && (
                          <span className="text-xs text-muted ml-1">(group did not pass)</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Milestones */}
        <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-sm mb-3">Milestones</h3>
        {milestones.length === 0 ? (
          <div className="text-muted text-sm mb-6">No milestones earned yet. Keep training!</div>
        ) : (
          <div className="space-y-2 mb-6">
            {milestones.map((m, i) => {
              const meta = milestoneTypes[m.type] || { label: m.type, icon: "🏆" };
              return (
                <div key={i} className="bg-card border border-gold/20 rounded-lg p-3 flex items-center gap-3">
                  <span className="text-xl">{meta.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{meta.label}</div>
                    {m.value && <div className="text-xs text-muted">{m.value}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Conquests */}
        {conquests.length > 0 && (
          <>
            <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-sm mb-3">Conquests</h3>
            <div className="space-y-2 mb-6">
              {conquests.map((c) => (
                <div
                  key={c.id}
                  className={`border rounded-lg p-3 transition-all ${
                    c.completed ? "bg-gold/10 border-gold/30" : "bg-card border-card-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {isOwnProfile && !c.completed ? (
                      <button
                        onClick={() => completeConquest(c.id)}
                        disabled={completingId === c.id}
                        className="mt-0.5 w-5 h-5 rounded border-2 border-fire/40 hover:border-fire flex-shrink-0 flex items-center justify-center transition-colors"
                        title="Mark as completed"
                      >
                        {completingId === c.id && <span className="text-fire text-xs animate-pulse">...</span>}
                      </button>
                    ) : (
                      <div className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center ${
                        c.completed ? "bg-gold text-background" : "border-2 border-card-border"
                      }`}>
                        {c.completed && <span className="text-xs font-bold">✓</span>}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className={`text-sm font-semibold ${c.completed ? "line-through text-muted" : ""}`}>
                          {c.title}
                        </span>
                        <span className="text-xs text-gold font-bold ml-2 flex-shrink-0">{c.xpReward} XP</span>
                      </div>
                      <div className="text-xs text-muted">{c.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Benchmarks */}
        <div className="rune-divider my-6" />
        <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-sm mb-3">Strength Benchmarks</h3>
        <div className="space-y-3 mb-6">
          {BENCHMARK_DEFINITIONS.map((def) => {
            const baseline = benchmarkBaselines.find(b => b.skill === def.skill);
            const goal = benchmarkGoalsList.find(g => g.skill === def.skill);
            // Once goal is set, baseline is locked; "current" shows latest progress log or baseline
            const current = (goal?.latestRecordedValue != null ? goal.latestRecordedValue : baseline?.value) ?? null;
            const progressPct = current !== null
              ? Math.min(100, Math.round(((current - def.baseline) / (def.raceReady - def.baseline)) * 100))
              : 0;

            return (
              <div key={def.skill} className="bg-card border border-card-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold text-sm text-foreground">{def.label}</span>
                    {current !== null && (
                      <span className="text-xs text-muted ml-2">
                        Current: <span className="text-fire font-bold">{current} {def.unit}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted">
                    Target: <span className="text-fire">{def.raceReady} {def.unit}</span>
                  </div>
                </div>

                {current !== null && (
                  <div className="mb-2">
                    <div className="h-1.5 bg-card-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-fire rounded-full transition-all"
                        style={{ width: `${Math.max(2, progressPct)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted mt-0.5">
                      <span>{def.baseline} (start)</span>
                      <span>{def.raceReady} (race ready)</span>
                    </div>
                  </div>
                )}

                {goal && (
                  <div className={`text-xs mt-1 ${goal.achieved ? "text-green-400" : "text-muted"}`}>
                    {goal.achieved ? "✓ Goal reached" : `Goal: ${goal.goalValue} ${def.unit}`}
                    {" · "}<span className="text-gold font-bold">{goal.xpReward} XP</span>
                    {!goal.achieved && (
                      <span className="text-[10px] text-muted ml-1">on completion</span>
                    )}
                  </div>
                )}

                {isOwnProfile && (
                  <div className="flex gap-2 mt-2">
                    {recordingSkill === def.skill ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="number"
                          step="0.5"
                          value={recordValue}
                          onChange={(e) => setRecordValue(e.target.value)}
                          className="flex-1 bg-background border border-card-border rounded px-2 py-1 text-foreground text-xs"
                          placeholder={`${def.unit}`}
                          autoFocus
                        />
                        <button
                          onClick={() => saveBaseline(def.skill, recordValue)}
                          disabled={benchmarkSaving || !recordValue}
                          className="text-xs bg-fire text-background px-2 py-1 rounded font-bold disabled:opacity-50"
                        >Save</button>
                        <button onClick={() => setRecordingSkill(null)} className="text-xs text-muted">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setRecordingSkill(def.skill); setRecordValue(current?.toString() || ""); }}
                        className="text-xs text-fire hover:text-fire/80 border border-fire/30 rounded px-2 py-0.5"
                      >
                        {current !== null ? "Update" : "Record"}
                      </button>
                    )}

                    {!goal && settingGoalSkill === def.skill && current !== null ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="number"
                          step="0.5"
                          value={goalValue}
                          onChange={(e) => setGoalValue(e.target.value)}
                          className="flex-1 bg-background border border-card-border rounded px-2 py-1 text-foreground text-xs"
                          placeholder={`Goal in ${def.unit}`}
                          autoFocus
                        />
                        {goalValue && (
                          <span className="text-xs text-gold font-bold">
                            {calculateBenchmarkXP(def.skill, parseFloat(goalValue), current)} XP
                          </span>
                        )}
                        <button
                          onClick={() => saveBenchmarkGoal(def.skill, goalValue)}
                          disabled={benchmarkSaving || !goalValue}
                          className="text-xs bg-gold text-background px-2 py-1 rounded font-bold disabled:opacity-50"
                        >Set</button>
                        <button onClick={() => setSettingGoalSkill(null)} className="text-xs text-muted">✕</button>
                      </div>
                    ) : !goal && current !== null && recordingSkill !== def.skill && (
                      <button
                        onClick={() => { setSettingGoalSkill(def.skill); setGoalValue(""); }}
                        className="text-xs text-gold hover:text-gold/80 border border-gold/30 rounded px-2 py-0.5"
                      >
                        Set goal
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* XP Logbook */}
        {scores.length > 0 && (
          <>
            <div
              className="flex items-center justify-between cursor-pointer mb-3"
              onClick={() => setShowLogbook(!showLogbook)}
            >
              <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-sm">XP Logbook</h3>
              <span className="text-xs text-muted">{showLogbook ? "▲ Hide" : "▼ Show"}</span>
            </div>
            {showLogbook && (
              <div className="space-y-3 mb-6">
                {[...scores].sort((a, b) => b.weekNumber - a.weekNumber).map((s) => {
                  const sub = submissions.find(sub => sub.weekId === s.weekId);
                  const lines: { label: string; value: number }[] = [];

                  if (s.runBonus > 0) {
                    const runCount = sub ? sub.runsCount : Math.round(s.runBonus / 10);
                    lines.push({ label: `${runCount} run${runCount !== 1 ? "s" : ""}`, value: s.runBonus });
                  }
                  if (s.gymBonus > 0) {
                    const gymCount = sub ? sub.gymSessions : Math.round(s.gymBonus / 10);
                    lines.push({ label: `${gymCount} gym session${gymCount !== 1 ? "s" : ""}`, value: s.gymBonus });
                  }
                  if (s.kmPoints > 0) {
                    const kmLabel = sub ? `${Math.round(sub.kmRun * 10) / 10} km` : "km";
                    lines.push({ label: kmLabel, value: Math.round(s.kmPoints * 10) / 10 });
                  }
                  if (s.rankBonus > 0) lines.push({ label: `Rank #${s.realmRankWeek}`, value: s.rankBonus });
                  if (s.soloChallengePoints > 0) lines.push({ label: "Solo challenge", value: s.soloChallengePoints });
                  if (s.secondChallengePoints > 0) lines.push({ label: "Group/comp challenge", value: s.secondChallengePoints });
                  if (s.buddyChallengePoints > 0) lines.push({ label: "Buddy challenge", value: s.buddyChallengePoints });
                  if (s.streakBonus > 0) lines.push({ label: "Streak", value: s.streakBonus });
                  if (s.shieldPoints > 0) lines.push({ label: "Shield", value: Math.round(s.shieldPoints * 10) / 10 });
                  if (s.prBonus > 0) lines.push({ label: "PR trial", value: s.prBonus });
                  if (s.ontimeBonus > 0) lines.push({ label: "On-time", value: s.ontimeBonus });
                  if (s.firstSubmissionBonus > 0) lines.push({ label: "First submission", value: s.firstSubmissionBonus });

                  const hasBerserker = s.berserkerMultiplier > 1;
                  const hasCatchUp = (s.catchUpMultiplier ?? 1) > 1;

                  return (
                    <div key={s.weekId} className="bg-card border border-card-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-[family-name:var(--font-cinzel)] font-bold text-muted">
                          Week {s.weekNumber}
                        </span>
                        <span className="text-fire font-bold text-sm">
                          {Math.round(s.totalFinal)} XP
                        </span>
                      </div>
                      <div className="text-xs text-muted leading-relaxed">
                        {lines.map((l, i) => (
                          <span key={i}>
                            {i > 0 && <span className="mx-1 opacity-40">·</span>}
                            <span className="text-foreground/80">{l.label}</span>
                            <span className="text-fire ml-0.5">+{l.value}</span>
                          </span>
                        ))}
                        {hasBerserker && (
                          <>
                            <span className="mx-1 opacity-40">·</span>
                            <span className="text-red-400">Berserker ×{s.berserkerMultiplier}</span>
                          </>
                        )}
                        {hasCatchUp && (
                          <>
                            <span className="mx-1 opacity-40">·</span>
                            <span className="text-gold">Late-join ×{s.catchUpMultiplier ?? 1}</span>
                          </>
                        )}
                      </div>
                      <div className="text-[10px] text-muted mt-1 opacity-60">
                        Cumulative: {Math.round(s.xpTotalAfter)} XP — {s.titleAfter}
                      </div>
                      {shieldMessagesByWeek[s.weekId]?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-card-border/50 text-[10px] text-muted space-y-1">
                          <div className="font-semibold text-ice">🛡️ Shields from</div>
                          {shieldMessagesByWeek[s.weekId].map((m, i) => (
                            <div key={i}>
                              <span className="text-fire/90 font-medium">{m.giverName}</span>
                              {m.message ? <span className="text-foreground"> — “{m.message}”</span> : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav active="profile" />
    </div>
  );
}

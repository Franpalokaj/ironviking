"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { SIGIL_EMOJIS, type Sigil, getTitleForXP, getNextTitle, TITLE_STYLES } from "@/lib/constants";
import XPProgressBar from "@/components/XPProgressBar";
import RealmBadge from "@/components/RealmBadge";

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
  totalFinal: number;
  xpTotalAfter: number;
  titleAfter: string;
  realmRankWeek: number;
  kmPoints: number;
  rankBonus: number;
  streakBonus: number;
  shieldPoints: number;
}

interface Submission {
  weekId: number;
  kmRun: number;
  runsCount: number;
  gymSessions: number;
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
  weekNumber: number;
  soloChallenge: { title: string; track: string; difficulty: string } | null;
  soloDone: boolean;
  secondChallenge: { title: string; track: string; difficulty: string } | null;
  secondAttempted: boolean;
  secondResult: number | null;
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
          <div className={`mt-1 font-[family-name:var(--font-cinzel)] ${titleStyle.color} ${titleStyle.glow ? "einherjar-glow" : ""}`}>
            <span className="mr-1 opacity-60">{titleStyle.rune}</span>
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
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <span className={q.secondAttempted && q.secondResult != null ? "text-green-400" : "text-red-400/60"}>
                        {q.secondAttempted && q.secondResult != null ? "✓" : "✗"}
                      </span>
                      <span className={q.secondAttempted ? "text-foreground" : "text-muted"}>
                        {q.secondChallenge.track === "competitive" ? "⚔️" : "🛡️"} {q.secondChallenge.title}
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

        {/* Score history */}
        {scores.length > 0 && (
          <>
            <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-sm mb-3">Score History</h3>
            <div className="space-y-2">
              {scores.map((s, i) => (
                <div key={i} className="bg-card border border-card-border rounded-lg p-3 text-xs flex justify-between">
                  <div>
                    <RealmBadge rank={s.realmRankWeek} showIcon={false} />
                    <span className="text-muted ml-2">#{s.realmRankWeek}</span>
                  </div>
                  <span className="text-fire font-bold">{Math.round(s.totalFinal)} pts</span>
                  <span className="text-muted">{Math.round(s.xpTotalAfter)} XP</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-card-border z-40">
        <div className="max-w-lg mx-auto flex">
          <button onClick={() => router.push("/dashboard")} className="flex-1 py-3 text-center text-muted text-xs hover:text-fire">⚔️ Board</button>
          <button onClick={() => router.push("/submit")} className="flex-1 py-3 text-center text-muted text-xs hover:text-fire">📜 Submit</button>
          <button className="flex-1 py-3 text-center text-fire text-xs font-semibold">👤 Profile</button>
          <button onClick={() => router.push("/challenges")} className="flex-1 py-3 text-center text-muted text-xs hover:text-fire">🎯 Quests</button>
        </div>
      </nav>
    </div>
  );
}

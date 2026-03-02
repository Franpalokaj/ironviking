"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Countdown from "@/components/Countdown";
import LeaderboardCard from "@/components/LeaderboardCard";
import ChallengeCard from "@/components/ChallengeCard";
import MilestoneCelebration from "@/components/MilestoneCelebration";
import WeeklyReveal from "@/components/WeeklyReveal";
import LeaderboardReveal from "@/components/LeaderboardReveal";
import BottomNav from "@/components/BottomNav";
import { SIGIL_EMOJIS, type Sigil, getPhaseForWeek, WEEKLY_KM_TARGETS, CONSOLIDATION_WEEKS, BACKOFF_WEEK } from "@/lib/constants";

interface RevealPlayer {
  playerId: number;
  vikingName: string;
  sigil: string;
  rank: number;
  prevRank: number;
  totalFinal: number;
  titleAfter: string;
}

interface Player {
  id: number;
  vikingName: string | null;
  sigil: string | null;
  isAdmin: boolean;
  onboardingComplete: boolean;
}

interface WeeklyScore {
  playerId: number;
  totalFinal: number;
  xpTotalAfter: number;
  titleAfter: string;
  realmRankWeek: number;
  berserkerMultiplier: number;
  kmPoints: number;
  rankBonus: number;
  soloChallengePoints: number;
  secondChallengePoints: number;
  streakBonus: number;
  shieldPoints: number;
  prBonus: number;
  ontimeBonus: number;
  firstSubmissionBonus: number;
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

type LeaderboardView = "week" | "month" | "alltime";

interface MonthlyScore {
  playerId: number;
  totalPoints: number;
  xpTotal: number;
  titleAfter: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ playerId: number; vikingName: string; isAdmin: boolean } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [week, setWeek] = useState<Week | null>(null);
  const [soloChallenge, setSoloChallenge] = useState<Challenge | null>(null);
  const [secondChallenge, setSecondChallenge] = useState<Challenge | null>(null);
  const [scores, setScores] = useState<WeeklyScore[]>([]);
  const [monthlyScores, setMonthlyScores] = useState<MonthlyScore[]>([]);
  const [alltimeScores, setAlltimeScores] = useState<MonthlyScore[]>([]);
  const [submittedIds, setSubmittedIds] = useState<number[]>([]);
  const [shieldCounts, setShieldCounts] = useState<Record<number, number>>({});
  const [view, setView] = useState<LeaderboardView>("week");
  const [loading, setLoading] = useState(true);
  const [showWeeklyReveal, setShowWeeklyReveal] = useState(false);
  const [showLeaderboardReveal, setShowLeaderboardReveal] = useState(false);
  const [prevWeekScores, setPrevWeekScores] = useState<WeeklyScore[]>([]);
  const [altRevealPlayers, setAltRevealPlayers] = useState<RevealPlayer[]>([]);
  const [showAltReveal, setShowAltReveal] = useState(false);
  const [scoredWeekId, setScoredWeekId] = useState<number | null>(null);
  const [scoredWeekNumber, setScoredWeekNumber] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) {
        router.push("/login");
        return;
      }
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
      setPlayers(playersData.players || []);

      if (weekData.week) {
        // Use the most recently scored week for the leaderboard, falling back to current
        const leaderboardWeek = weekData.lastScoredWeek || weekData.week;
        setScoredWeekId(leaderboardWeek.id);
        setScoredWeekNumber(leaderboardWeek.weekNumber);
        const lbRes = await fetch(`/api/leaderboard?view=week&weekId=${leaderboardWeek.id}`);
        const lbData = await lbRes.json();
        setScores(lbData.scores || []);
        setSubmittedIds(lbData.submittedPlayerIds || []);
        setShieldCounts(lbData.shieldCounts || {});

        // Check if we should show the weekly reveal for the scored week
        const currentScores: WeeklyScore[] = lbData.scores || [];
        if (leaderboardWeek.isLocked && currentScores.length > 0) {
          const revealKey = `iron-viking-revealed-week-${leaderboardWeek.id}`;
          if (!localStorage.getItem(revealKey)) {
            if (weekData.prevWeekId) {
              const prevLbRes = await fetch(`/api/leaderboard?view=week&weekId=${weekData.prevWeekId}`);
              const prevLbData = await prevLbRes.json();
              setPrevWeekScores(prevLbData.scores || []);
            }
            setShowWeeklyReveal(true);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!week || !session) return;

    function buildAltReveal(
      newScores: MonthlyScore[],
      lsKey: string,
      lbPlayers: typeof players
    ) {
      const storedRaw = localStorage.getItem(lsKey);
      const storedRanks: Record<number, number> = storedRaw ? JSON.parse(storedRaw) : {};
      const hasStoredRanks = Object.keys(storedRanks).length > 0;

      if (hasStoredRanks) {
        const changed = newScores.some((s, i) => storedRanks[s.playerId] !== i + 1);
        if (changed) {
          const revealList: RevealPlayer[] = newScores.map((s, i) => {
            const p = lbPlayers.find(pl => pl.id === s.playerId);
            return {
              playerId: s.playerId,
              vikingName: p?.vikingName || "Warrior",
              sigil: p?.sigil || "axe",
              rank: i + 1,
              prevRank: storedRanks[s.playerId] ?? i + 1,
              totalFinal: s.totalPoints,
              titleAfter: s.titleAfter,
            };
          });
          setAltRevealPlayers(revealList);
          setShowAltReveal(true);
        }
      }
      // Always persist current ranks so next visit can compare
      const newRanks: Record<number, number> = {};
      newScores.forEach((s, i) => { newRanks[s.playerId] = i + 1; });
      localStorage.setItem(lsKey, JSON.stringify(newRanks));
    }

    if (view === "month") {
      const endDate = new Date(week.endDate);
      const month = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}`;
      fetch(`/api/leaderboard?view=month&month=${month}`)
        .then((r) => r.json())
        .then((d) => {
          const scores: MonthlyScore[] = d.scores || [];
          setMonthlyScores(scores);
          buildAltReveal(scores, `iron-viking-month-ranks-${month}`, players);
        });
    } else if (view === "alltime") {
      fetch("/api/leaderboard?view=alltime")
        .then((r) => r.json())
        .then((d) => {
          const scores: MonthlyScore[] = d.scores || [];
          setAlltimeScores(scores);
          buildAltReveal(scores, "iron-viking-alltime-ranks", players);
        });
    }
  }, [view, week, session, players]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-fire font-[family-name:var(--font-cinzel)] animate-pulse">
          The ravens are scouting...
        </div>
      </div>
    );
  }

  const phase = week ? getPhaseForWeek(week.weekNumber) : null;
  const kmTarget = week ? WEEKLY_KM_TARGETS[week.weekNumber] : null;
  const hasSubmitted = session ? submittedIds.includes(session.playerId) : false;

  function renderLeaderboard() {
    if (view === "week") {
      if (scores.length === 0) {
        return (
          <div className="space-y-3">
            {players
              .filter((p) => p.onboardingComplete)
              .map((p, i) => (
                <div key={p.id} onClick={() => router.push(`/profile/${p.id}`)} className="cursor-pointer">
                  <LeaderboardCard
                    vikingName={p.vikingName || "Unknown"}
                    sigil={p.sigil || "axe"}
                    title="Thrall"
                    rank={i + 1}
                    weekPoints={0}
                    xp={0}
                    hasSubmitted={submittedIds.includes(p.id)}
                    shieldCount={shieldCounts[p.id] || 0}
                    isBerserker={false}
                    isSkald={false}
                  />
                </div>
              ))}
            {players.filter((p) => !p.onboardingComplete).map((_, i) => (
              <div key={`pending-${i}`} className="bg-card border border-card-border rounded-lg p-4 opacity-50">
                <div className="flex items-center gap-3">
                  <div className="text-3xl opacity-30">👤</div>
                  <div className="text-muted italic">Awaiting summons...</div>
                </div>
              </div>
            ))}
          </div>
        );
      }

      return (
        <div className="space-y-3">
          {scores.map((score, i) => {
            const player = players.find((p) => p.id === score.playerId);
            if (!player) return null;
            return (
              <div key={score.playerId} onClick={() => router.push(`/profile/${score.playerId}`)} className="cursor-pointer">
                <LeaderboardCard
                  vikingName={player.vikingName || "Unknown"}
                  sigil={player.sigil || "axe"}
                  title={score.titleAfter}
                  rank={i + 1}
                  weekPoints={score.totalFinal}
                  xp={score.xpTotalAfter}
                  hasSubmitted={submittedIds.includes(score.playerId)}
                  shieldCount={shieldCounts[score.playerId] || 0}
                  isBerserker={score.berserkerMultiplier > 1}
                  isSkald={false}
                />
              </div>
            );
          })}
        </div>
      );
    }

    const displayScores = view === "month" ? monthlyScores : alltimeScores;
    return (
      <div className="space-y-3">
        {displayScores.map((score, i) => {
          const player = players.find((p) => p.id === score.playerId);
          if (!player) return null;
          return (
            <div key={score.playerId} onClick={() => router.push(`/profile/${score.playerId}`)} className="cursor-pointer">
              <LeaderboardCard
                vikingName={player.vikingName || "Unknown"}
                sigil={player.sigil || "axe"}
                title={score.titleAfter}
                rank={i + 1}
                weekPoints={score.totalPoints}
                xp={score.xpTotal}
                hasSubmitted={true}
                shieldCount={0}
                isBerserker={false}
                isSkald={false}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <MilestoneCelebration />

      {/* Weekly XP reveal — shown once per scored week */}
      {showWeeklyReveal && session && week && (() => {
        const myScore = scores.find(s => s.playerId === session.playerId);
        if (!myScore) return null;
        const prevScore = prevWeekScores.find((s: WeeklyScore) => s.playerId === session.playerId);
        const prevXp = prevScore ? prevScore.xpTotalAfter : 0;
        const prevTitle = prevScore ? prevScore.titleAfter : "Thrall";
        return (
          <WeeklyReveal
            score={{ ...myScore, weekNumber: scoredWeekNumber || week.weekNumber, weekId: scoredWeekId || week.id }}
            prevXp={prevXp}
            prevTitle={prevTitle}
            onDismiss={() => {
              setShowWeeklyReveal(false);
              setShowLeaderboardReveal(true);
            }}
          />
        );
      })()}

      {/* Monthly / all-time leaderboard reveal — shown when ranks change on tab switch */}
      {showAltReveal && session && altRevealPlayers.length > 0 && (
        <LeaderboardReveal
          players={altRevealPlayers}
          myPlayerId={session.playerId}
          onDismiss={() => setShowAltReveal(false)}
        />
      )}

      {/* Cinematic leaderboard reveal — shown after weekly XP reveal */}
      {showLeaderboardReveal && session && week && scores.length > 0 && (() => {
        const sortedCurrent = [...scores].sort((a, b) => b.totalFinal - a.totalFinal);
        const sortedPrev = [...prevWeekScores].sort((a, b) => b.totalFinal - a.totalFinal);
        const total = sortedCurrent.length;
        const revealPlayers = sortedCurrent.map((s, i) => {
          const p = players.find(pl => pl.id === s.playerId);
          const prevIdx = sortedPrev.findIndex((ps: WeeklyScore) => ps.playerId === s.playerId);
          // First week (no prev data): start in reverse order so everyone slides into place
          const prevRank = prevIdx >= 0 ? prevIdx + 1 : total - i;
          return {
            playerId: s.playerId,
            vikingName: p?.vikingName || "Warrior",
            sigil: p?.sigil || "axe",
            rank: i + 1,
            prevRank,
            totalFinal: s.totalFinal,
            titleAfter: s.titleAfter,
          };
        });
        return (
          <LeaderboardReveal
            players={revealPlayers}
            myPlayerId={session.playerId}
            onDismiss={() => {
              setShowLeaderboardReveal(false);
              const revealKey = `iron-viking-revealed-week-${scoredWeekId || week.id}`;
              localStorage.setItem(revealKey, "1");
            }}
          />
        );
      })()}
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-card-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-[family-name:var(--font-cinzel)] font-bold text-fire">
            Iron Viking
          </h1>
          <div className="flex items-center gap-3">
            {session?.isAdmin && (
              <button
                onClick={() => router.push("/admin")}
                className="text-xs text-muted hover:text-fire transition-colors"
              >
                Admin
              </button>
            )}
            <button
              onClick={() => router.push(`/profile/${session?.playerId}`)}
              className="text-xl"
            >
              {session ? SIGIL_EMOJIS[(players.find(p => p.id === session.playerId)?.sigil || "axe") as Sigil] : "⚔️"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4">
        {/* Countdown */}
        <Countdown />

        <div className="rune-divider my-4" />

        {/* Week info */}
        {week && (
          <div className="text-center mb-4">
            <div className="text-lg font-[family-name:var(--font-cinzel)] font-bold text-foreground">
              Week {week.weekNumber} · {phase?.name}
            </div>
            {kmTarget && (
              <div className="text-2xl font-bold text-fire mt-1">{kmTarget.min} km</div>
            )}
            <div className="text-xs text-muted mt-1">
              {week.type === "competition" ? "⚔️ Competition Week" : "🛡️ Collaboration Week"}
            </div>
            <button
              onClick={() => router.push("/guide")}
              className="text-xs text-muted hover:text-fire underline underline-offset-2 mt-1 transition-colors"
            >
              View full training schedule →
            </button>

            {/* Hold / pre-hold week XP modifier banner */}
            {(() => {
              const wn = week.weekNumber;
              const isHold = (CONSOLIDATION_WEEKS as readonly number[]).includes(wn) || wn === BACKOFF_WEEK;
              const isPreHold = (CONSOLIDATION_WEEKS as readonly number[]).includes(wn + 1) || wn + 1 === BACKOFF_WEEK;
              if (isHold) {
                return (
                  <div className="mt-3 inline-flex items-center gap-2 bg-ice/10 border border-ice/30 rounded-lg px-4 py-2 animate-[fadeIn_0.6s_ease-out]">
                    <span className="text-sm">❄️</span>
                    <div className="text-left">
                      <div className="text-xs font-[family-name:var(--font-cinzel)] font-bold text-ice">Consolidation Week</div>
                      <div className="text-[10px] text-muted">XP this week is reduced by 25% — rest, recover, hold your gains.</div>
                    </div>
                  </div>
                );
              }
              if (isPreHold) {
                return (
                  <div className="mt-3 inline-flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-lg px-4 py-2 animate-[fadeIn_0.6s_ease-out]">
                    <span className="text-sm">⚡</span>
                    <div className="text-left">
                      <div className="text-xs font-[family-name:var(--font-cinzel)] font-bold text-gold">Last Push</div>
                      <div className="text-[10px] text-muted">XP this week is boosted by 50% — hold week follows. Go hard.</div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}

        {/* Submission status */}
        <div className="flex justify-center gap-2 mb-6">
          {players.filter(p => p.onboardingComplete).map((p) => {
            const submitted = submittedIds.includes(p.id);
            return (
              <div
                key={p.id}
                className={`flex flex-col items-center gap-1 ${submitted ? "opacity-100" : "opacity-60"}`}
                title={`${p.vikingName} — ${submitted ? "Submitted" : "Pending"}`}
              >
                <span className="text-lg">
                  {SIGIL_EMOJIS[(p.sigil || "axe") as Sigil]}
                </span>
                <span className="text-[10px]">{submitted ? "✓" : "🔥"}</span>
              </div>
            );
          })}
        </div>

        {/* Submit CTA */}
        {!hasSubmitted && week && !week.isLocked && (
          <button
            onClick={() => router.push("/submit")}
            className="w-full bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold py-4 rounded-lg mb-6 hover:bg-fire/90 transition-colors text-lg"
          >
            Submit Your Week
          </button>
        )}

        {hasSubmitted && (
          <div className="text-center text-sm text-muted mb-6 flex items-center justify-center gap-2">
            <span>✓</span> Your scroll has been submitted
          </div>
        )}

        {/* Leaderboard view toggle */}
        <div className="flex rounded-lg border border-card-border overflow-hidden mb-4">
          {(["week", "month", "alltime"] as LeaderboardView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-2 text-xs font-[family-name:var(--font-cinzel)] font-semibold transition-colors ${
                view === v ? "bg-fire/20 text-fire" : "text-muted hover:text-foreground"
              }`}
            >
              {v === "week" ? (scoredWeekNumber ? `Week ${scoredWeekNumber}` : "This Week") : v === "month" ? "This Month" : "All Time"}
            </button>
          ))}
        </div>

        {/* Leaderboard */}
        {renderLeaderboard()}

        <div className="rune-divider my-6" />

        {/* Active challenges -- only shown for weekly view */}
        {view === "week" && (
          <>
            <h2 className="text-lg font-[family-name:var(--font-cinzel)] font-bold mb-3">
              This Week&apos;s Challenges
            </h2>
            <div className="space-y-3 mb-6">
              {soloChallenge && week && (
                <ChallengeCard challenge={soloChallenge} weekType={week.type as "competition" | "collaboration"} isSolo />
              )}
              {secondChallenge && week && (
                <ChallengeCard challenge={secondChallenge} weekType={week.type as "competition" | "collaboration"} />
              )}
              {!soloChallenge && !secondChallenge && (
                <div className="text-center text-muted text-sm py-4">
                  No challenges set for this week yet.
                </div>
              )}
            </div>
          </>
        )}

        {/* Nav links */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => router.push("/challenges")}
            className="bg-card border border-card-border rounded-lg p-3 text-center text-sm text-muted hover:text-foreground hover:border-fire/30 transition-colors"
          >
            Challenge Board
          </button>
          <button
            onClick={() => router.push("/guide")}
            className="bg-card border border-card-border rounded-lg p-3 text-center text-sm text-muted hover:text-foreground hover:border-fire/30 transition-colors"
          >
            Training Guide
          </button>
        </div>
      </div>

      <BottomNav active="board" profileId={session?.playerId} />
    </div>
  );
}

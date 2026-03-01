"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import WeeklyReveal from "@/components/WeeklyReveal";
import LeaderboardReveal from "@/components/LeaderboardReveal";

interface Week {
  id: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  type: string;
  soloChallengeId: number | null;
  secondChallengeId: number | null;
  isLocked: boolean;
}

interface Challenge {
  id: number;
  title: string;
  description: string;
  track: string;
  dataType: string | null;
  targetValue: number | null;
  difficulty: string;
  phase: string;
  used: boolean;
}

interface Invite {
  id: number;
  token: string;
  playerSlot: number;
  usedAt: string | null;
  expiresAt: string;
}

interface Submission {
  id: number;
  playerId: number;
  weekId: number;
  kmRun: number;
  runsCount: number;
  gymSessions: number;
  soloChallengeDone: boolean;
  secondChallengeResult: number | null;
  isLate: boolean;
  submittedAt: string;
}

interface PrTrial {
  id: number;
  playerId: number;
  skill: string;
  previousBest: number;
  result: number | null;
  success: boolean | null;
}

type Tab = "weeks" | "challenges" | "invites" | "submissions" | "pr-trials" | "hype-votes" | "players" | "animations";

type PreviewMode = "none" | "weekly-reveal" | "weekly-reveal-levelup" | "leaderboard-reveal" | "submission-success";

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("weeks");
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [prTrials, setPrTrials] = useState<PrTrial[]>([]);
  const [hypeVotes, setHypeVotes] = useState<{ giverId: number; receiverId: number; weekId: number }[]>([]);
  const [players, setPlayers] = useState<{ id: number; vikingName: string | null; sigil: string | null; weeklyKmGoal: number | null; isAdmin: boolean; onboardingComplete: boolean }[]>([]);
  const [preview, setPreview] = useState<PreviewMode>("none");
  const [editingPlayer, setEditingPlayer] = useState<number | null>(null);
  const [editSigil, setEditSigil] = useState("");
  const [editKmGoal, setEditKmGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [extraInviteCount, setExtraInviteCount] = useState(2);

  const loadData = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) { router.push("/login"); return; }
      const { session } = await sessionRes.json();
      if (!session?.isAdmin) { router.push("/dashboard"); return; }

      const [weeksRes, challengesRes, invitesRes, playersRes] = await Promise.all([
        fetch("/api/admin/weeks"),
        fetch("/api/challenges"),
        fetch("/api/admin/invites"),
        fetch("/api/players"),
      ]);

      const weeksData = await weeksRes.json();
      const challengesData = await challengesRes.json();
      const invitesData = await invitesRes.json();
      const playersData = await playersRes.json();

      setWeeks((weeksData.weeks || []).sort((a: Week, b: Week) => a.weekNumber - b.weekNumber));
      setChallenges(challengesData.challenges || []);
      setInvites(invitesData.invites || []);
      setPlayers(playersData.players || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  async function generateInvites(count?: number) {
    setMessage("");
    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: count || 6 }),
    });
    if (res.ok) {
      const data = await res.json();
      setInvites((prev) => [...prev, ...data.invites]);
      setMessage(`${data.invites.length} invite(s) generated!`);
      setTab("invites");
    } else {
      const data = await res.json();
      setMessage(data.error || "Failed to generate invites");
    }
  }

  async function scoreWeek(weekId: number) {
    setMessage("");
    const res = await fetch("/api/admin/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekId }),
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    loadData();
  }

  async function setChallengesForWeek(weekId: number, field: "soloChallengeId" | "secondChallengeId", challengeId: number | null) {
    await fetch("/api/admin/weeks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekId, [field]: challengeId }),
    });
    loadData();
  }

  async function loadSubmissions(weekId: number) {
    const res = await fetch(`/api/admin/submissions?weekId=${weekId}`);
    const data = await res.json();
    setSubmissions(data.submissions || []);
    setSelectedWeek(weekId);
  }

  async function loadHypeVotes(weekId: number) {
    const res = await fetch(`/api/admin/hype-votes?weekId=${weekId}`);
    const data = await res.json();
    setHypeVotes(data.votes || []);
    setSelectedWeek(weekId);
  }

  async function loadPrTrials() {
    const res = await fetch("/api/admin/pr-trials");
    const data = await res.json();
    setPrTrials(data.trials || []);
  }

  async function verifyPrTrial(trialId: number, success: boolean) {
    await fetch("/api/admin/pr-trials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trialId, success }),
    });
    loadPrTrials();
  }

  async function deleteSubmission(submissionId: number) {
    if (!confirm("Unlock and delete this submission?")) return;
    await fetch("/api/admin/submissions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    });
    if (selectedWeek) loadSubmissions(selectedWeek);
  }

  async function savePlayerEdit(playerId: number) {
    const updates: Record<string, unknown> = { playerId };
    if (editSigil) updates.sigil = editSigil;
    if (editKmGoal) updates.weeklyKmGoal = parseFloat(editKmGoal);
    const res = await fetch("/api/admin/players", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      setEditingPlayer(null);
      loadData();
      setMessage("Player updated.");
    }
  }

  function playerName(id: number) {
    return players.find(p => p.id === id)?.vikingName || `Player ${id}`;
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-fire font-[family-name:var(--font-cinzel)] animate-pulse">Loading admin...</div>
      </div>
    );
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Mock data for animation previews
  const mockWeekScoreBase = {
    weekId: 99,
    weekNumber: 4,
    totalFinal: 87.5,
    xpTotalAfter: 212,
    titleAfter: "Karl",
    kmPoints: 42.3,
    rankBonus: 16,
    soloChallengePoints: 15,
    secondChallengePoints: 0,
    streakBonus: 10,
    shieldPoints: 4.2,
    prBonus: 0,
    ontimeBonus: 10,
    firstSubmissionBonus: 0,
    berserkerMultiplier: 1.0,
  };

  const mockWeekScoreLevelUp = {
    ...mockWeekScoreBase,
    totalFinal: 124.5,
    xpTotalAfter: 145,
    titleAfter: "Karl",
    firstSubmissionBonus: 100,
    berserkerMultiplier: 1.5,
  };

  const mockLeaderboardPlayers = [
    { playerId: 1, vikingName: "Ragnar", sigil: "raven", rank: 1, prevRank: 3, totalFinal: 112, titleAfter: "Huscarl" },
    { playerId: 2, vikingName: "Björn",  sigil: "bear",  rank: 2, prevRank: 1, totalFinal: 98,  titleAfter: "Karl" },
    { playerId: 3, vikingName: "Sigrid", sigil: "wolf",  rank: 3, prevRank: 2, totalFinal: 85,  titleAfter: "Karl" },
    { playerId: 4, vikingName: "Ivar",   sigil: "axe",   rank: 4, prevRank: 4, totalFinal: 72,  titleAfter: "Thrall" },
    { playerId: 5, vikingName: "Freya",  sigil: "crown", rank: 5, prevRank: 6, totalFinal: 58,  titleAfter: "Thrall" },
    { playerId: 6, vikingName: "Admin",  sigil: "skull", rank: 6, prevRank: 5, totalFinal: 41,  titleAfter: "Thrall" },
  ];

  return (
    <>
    {/* Animation previews — rendered as full-screen overlays */}
    {(preview === "weekly-reveal" || preview === "weekly-reveal-levelup") && (
      <WeeklyReveal
        score={preview === "weekly-reveal-levelup" ? mockWeekScoreLevelUp : mockWeekScoreBase}
        prevXp={preview === "weekly-reveal-levelup" ? 0 : 124}
        prevTitle={preview === "weekly-reveal-levelup" ? "Thrall" : "Karl"}
        onDismiss={() => setPreview("none")}
      />
    )}
    {preview === "leaderboard-reveal" && (
      <LeaderboardReveal
        players={mockLeaderboardPlayers}
        myPlayerId={6}
        onDismiss={() => setPreview("none")}
      />
    )}
    <div className="min-h-dvh pb-8">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-card-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="text-muted hover:text-foreground">← Board</button>
          <h1 className="text-sm font-[family-name:var(--font-cinzel)] font-bold text-fire">Admin Panel</h1>
          <button
            onClick={() => router.push("/portal?preview=true")}
            className="text-xs text-ice hover:text-foreground"
          >
            Preview Onboarding
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {message && (
          <div className="bg-fire/10 border border-fire/30 rounded-lg p-3 mb-4 text-sm text-fire">
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto mb-6 border-b border-card-border pb-2">
          {(["weeks", "players", "challenges", "invites", "submissions", "pr-trials", "hype-votes", "animations"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                if (t === "pr-trials") loadPrTrials();
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t whitespace-nowrap transition-colors ${
                tab === t ? "text-fire border-b-2 border-fire" : "text-muted hover:text-foreground"
              }`}
            >{t.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}</button>
          ))}
        </div>

        {/* WEEKS TAB */}
        {tab === "weeks" && (
          <div className="space-y-3">
            {weeks.map(w => {
              const solo = challenges.find(c => c.id === w.soloChallengeId);
              const second = challenges.find(c => c.id === w.secondChallengeId);
              return (
                <div key={w.id} className="bg-card border border-card-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold text-foreground">Week {w.weekNumber}</span>
                      <span className="text-xs text-muted ml-2">
                        {w.type === "competition" ? "⚔️" : "🛡️"} {w.startDate} — {w.endDate}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {w.isLocked ? (
                        <span className="text-xs text-muted">🔒 Scored</span>
                      ) : (
                        <button
                          onClick={() => scoreWeek(w.id)}
                          className="text-xs bg-fire/20 text-fire px-3 py-1 rounded hover:bg-fire/30"
                        >Score Week</button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-muted block mb-1">Solo Challenge</label>
                      <select
                        value={w.soloChallengeId || ""}
                        onChange={(e) => setChallengesForWeek(w.id, "soloChallengeId", e.target.value ? Number(e.target.value) : null)}
                        className="w-full bg-background border border-card-border rounded px-2 py-1 text-foreground"
                      >
                        <option value="">None</option>
                        {challenges.filter(c => c.track === "solo").map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                      {solo && <span className="text-muted">{solo.title}</span>}
                    </div>
                    <div>
                      <label className="text-muted block mb-1">
                        {w.type === "competition" ? "Competitive" : "Collaborative"} Challenge
                      </label>
                      <select
                        value={w.secondChallengeId || ""}
                        onChange={(e) => setChallengesForWeek(w.id, "secondChallengeId", e.target.value ? Number(e.target.value) : null)}
                        className="w-full bg-background border border-card-border rounded px-2 py-1 text-foreground"
                      >
                        <option value="">None</option>
                        {challenges.filter(c => c.track === (w.type === "competition" ? "competitive" : "collaborative")).map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                      {second && <span className="text-muted">{second.title}</span>}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => { loadSubmissions(w.id); setTab("submissions"); }}
                      className="text-xs text-muted hover:text-fire"
                    >View submissions</button>
                    <button
                      onClick={() => { loadHypeVotes(w.id); setTab("hype-votes"); }}
                      className="text-xs text-muted hover:text-fire"
                    >View votes</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PLAYERS TAB */}
        {tab === "players" && (
          <div className="space-y-3">
            {players.map(p => (
              <div key={p.id} className="bg-card border border-card-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-foreground">{p.vikingName || "Unknown"}</span>
                    {p.isAdmin && <span className="ml-2 text-[10px] text-fire border border-fire/30 px-1 rounded">Admin</span>}
                    {!p.onboardingComplete && <span className="ml-2 text-[10px] text-yellow-400 border border-yellow-400/30 px-1 rounded">Pending</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/profile/${p.id}`)}
                      className="text-xs text-muted hover:text-fire"
                    >View Profile</button>
                    <button
                      onClick={() => {
                        setEditingPlayer(p.id);
                        setEditSigil(p.sigil || "");
                        setEditKmGoal(p.weeklyKmGoal?.toString() || "");
                      }}
                      className="text-xs text-fire hover:text-fire/80"
                    >Edit</button>
                  </div>
                </div>
                <div className="text-xs text-muted">
                  Sigil: {p.sigil || "—"} · Weekly goal: {p.weeklyKmGoal ?? "—"} km
                </div>
                {editingPlayer === p.id && (
                  <div className="mt-3 space-y-2 border-t border-card-border pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted block mb-1">Sigil</label>
                        <select
                          value={editSigil}
                          onChange={(e) => setEditSigil(e.target.value)}
                          className="w-full bg-background border border-card-border rounded px-2 py-1 text-foreground text-xs"
                        >
                          <option value="">Keep current</option>
                          {["wolf","raven","bear","serpent","dragon","axe","shield","longship","crown","skull"].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted block mb-1">Weekly km goal</label>
                        <input
                          type="number"
                          value={editKmGoal}
                          onChange={(e) => setEditKmGoal(e.target.value)}
                          className="w-full bg-background border border-card-border rounded px-2 py-1 text-foreground text-xs"
                          placeholder="e.g. 10"
                          step="0.5"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => savePlayerEdit(p.id)}
                        className="bg-fire text-background text-xs font-bold px-3 py-1.5 rounded"
                      >Save</button>
                      <button
                        onClick={() => setEditingPlayer(null)}
                        className="text-muted text-xs px-3 py-1.5 rounded border border-card-border"
                      >Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CHALLENGES TAB */}
        {tab === "challenges" && (
          <div className="space-y-2">
            {["solo", "competitive", "collaborative"].map(track => (
              <div key={track}>
                <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-sm text-fire mb-2 capitalize">{track}</h3>
                {challenges.filter(c => c.track === track).map(c => (
                  <div key={c.id} className="bg-card border border-card-border rounded p-3 mb-2 text-xs">
                    <div className="font-semibold text-foreground">{c.title}</div>
                    <div className="text-muted">{c.description}</div>
                    <div className="text-muted mt-1">Phase: {c.phase} · Type: {c.dataType || "boolean"} {c.targetValue ? `· Target: ${c.targetValue}` : ""} · <span className={c.difficulty === "epic" ? "text-gold" : c.difficulty === "hard" ? "text-fire" : "text-stone"}>{(c.difficulty || "normal").toUpperCase()}</span></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* INVITES TAB */}
        {tab === "invites" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted">Generate</label>
                <select
                  value={extraInviteCount}
                  onChange={(e) => setExtraInviteCount(Number(e.target.value))}
                  className="bg-card border border-card-border rounded px-2 py-1 text-foreground text-sm"
                >
                  {[1, 2, 3, 4].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <label className="text-xs text-muted">new invite(s)</label>
              </div>
              <button
                onClick={() => generateInvites(extraInviteCount)}
                className="bg-fire text-background font-bold px-4 py-1.5 rounded-lg text-sm"
              >Generate</button>
            </div>
            <div className="text-xs text-muted mb-3">
              {players.length} / 10 player slots used · {invites.filter(i => !i.usedAt).length} pending invite(s)
            </div>
            <div className="space-y-2">
              {invites.map(inv => (
                <div key={inv.id} className="bg-card border border-card-border rounded-lg p-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Slot {inv.playerSlot}</span>
                    <span className={inv.usedAt ? "text-green-400" : "text-yellow-400"}>
                      {inv.usedAt ? "✓ Used" : "Pending"}
                    </span>
                  </div>
                  <div className="mt-1 bg-background border border-card-border rounded px-2 py-1 font-mono text-[10px] break-all select-all">
                    {baseUrl}/portal?rune={inv.token}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBMISSIONS TAB */}
        {tab === "submissions" && (
          <div>
            <div className="mb-4">
              <label className="text-sm text-muted mr-2">Week:</label>
              <select
                value={selectedWeek || ""}
                onChange={(e) => e.target.value && loadSubmissions(Number(e.target.value))}
                className="bg-card border border-card-border rounded px-2 py-1 text-foreground text-sm"
              >
                <option value="">Select week</option>
                {weeks.map(w => (
                  <option key={w.id} value={w.id}>Week {w.weekNumber}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              {submissions.map(sub => (
                <div key={sub.id} className="bg-card border border-card-border rounded-lg p-3 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-foreground">{playerName(sub.playerId)}</span>
                    <div className="flex gap-2 items-center">
                      {sub.isLate && <span className="text-yellow-400">Late</span>}
                      <button onClick={() => deleteSubmission(sub.id)} className="text-red-400 hover:text-red-300">
                        Unlock
                      </button>
                    </div>
                  </div>
                  <div className="text-muted">
                    {sub.kmRun} km · {sub.runsCount} runs · {sub.gymSessions} gym
                    {sub.soloChallengeDone && " · Solo ✓"}
                    {sub.secondChallengeResult != null && ` · Challenge: ${sub.secondChallengeResult}`}
                  </div>
                </div>
              ))}
              {submissions.length === 0 && selectedWeek && (
                <div className="text-muted text-sm text-center py-4">No submissions for this week.</div>
              )}
            </div>
          </div>
        )}

        {/* PR TRIALS TAB */}
        {tab === "pr-trials" && (
          <div className="space-y-2">
            {prTrials.length === 0 && (
              <div className="text-muted text-sm text-center py-4">No pending PR trials.</div>
            )}
            {prTrials.map(trial => (
              <div key={trial.id} className="bg-card border border-card-border rounded-lg p-3 text-xs">
                <div className="font-bold text-foreground">{playerName(trial.playerId)}</div>
                <div className="text-muted">
                  Skill: {trial.skill} · Previous best: {trial.previousBest}
                  {trial.result != null && ` · Result: ${trial.result}`}
                </div>
                {trial.success === null && (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => verifyPrTrial(trial.id, true)} className="bg-green-900/50 text-green-400 px-3 py-1 rounded">
                      Approve
                    </button>
                    <button onClick={() => verifyPrTrial(trial.id, false)} className="bg-red-900/50 text-red-400 px-3 py-1 rounded">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ANIMATIONS TAB */}
        {tab === "animations" && (
          <div className="space-y-4">
            <p className="text-xs text-muted">
              Preview all animations with mock data. Useful for testing before a real scoring event.
            </p>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setPreview("weekly-reveal")}
                className="bg-card border border-card-border rounded-lg p-4 text-left hover:border-fire/40 transition-colors"
              >
                <div className="font-[family-name:var(--font-cinzel)] font-bold text-sm text-fire mb-1">Weekly XP Reveal</div>
                <div className="text-xs text-muted">Normal week — no level-up. Shows XP breakdown and count-up.</div>
              </button>
              <button
                onClick={() => setPreview("weekly-reveal-levelup")}
                className="bg-card border border-card-border rounded-lg p-4 text-left hover:border-fire/40 transition-colors"
              >
                <div className="font-[family-name:var(--font-cinzel)] font-bold text-sm text-fire mb-1">Weekly XP Reveal + Level Up</div>
                <div className="text-xs text-muted">Includes first-submission bonus and title unlock animation.</div>
              </button>
              <button
                onClick={() => setPreview("leaderboard-reveal")}
                className="bg-card border border-card-border rounded-lg p-4 text-left hover:border-fire/40 transition-colors"
              >
                <div className="font-[family-name:var(--font-cinzel)] font-bold text-sm text-fire mb-1">Leaderboard Reveal</div>
                <div className="text-xs text-muted">Cards animate from previous ranks to new positions. Includes realm message.</div>
              </button>
              <button
                onClick={() => setPreview("submission-success")}
                className="bg-card border border-card-border rounded-lg p-4 text-left hover:border-fire/40 transition-colors"
              >
                <div className="font-[family-name:var(--font-cinzel)] font-bold text-sm text-fire mb-1">Submission Success Screen</div>
                <div className="text-xs text-muted">The post-submit cinematic success state.</div>
              </button>
            </div>

            {/* Inline submission success preview */}
            {preview === "submission-success" && (
              <div className="fixed inset-0 z-50 bg-background/98 flex flex-col items-center justify-center px-4 animate-[fadeIn_0.6s_ease-out]">
                <div className="w-full max-w-sm text-center">
                  <div className="text-6xl mb-6 animate-[fadeIn_1s_ease-out]">⚔️</div>
                  <h2 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-fire mb-2">
                    Saga Recorded
                  </h2>
                  <p className="text-muted text-sm mb-2">Your deeds have been carved into the runes.</p>
                  <p className="text-xs text-muted mb-6">The gods will tally the scores when all Vikings have spoken.</p>
                  <div className="rune-divider my-6" />
                  <div className="bg-card border border-card-border rounded-lg p-4 mb-6 text-left space-y-2">
                    <div className="text-xs text-muted font-[family-name:var(--font-cinzel)] font-bold uppercase tracking-widest mb-3">Mock submission</div>
                    <div className="flex justify-between text-sm"><span className="text-muted">Kilometres</span><span className="text-foreground font-bold">24.5 km</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted">Runs</span><span className="text-foreground font-bold">3</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted">Gym</span><span className="text-foreground font-bold">2</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted">Solo challenge</span><span className="text-green-400 font-bold">✓</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted">Shield given to</span><span className="text-foreground font-bold">Björn</span></div>
                  </div>
                  <button
                    onClick={() => setPreview("none")}
                    className="w-full bg-fire text-background font-[family-name:var(--font-cinzel)] font-bold py-3 rounded-lg hover:bg-fire/90 transition-colors"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HYPE VOTES TAB */}
        {tab === "hype-votes" && (
          <div>
            <div className="mb-4">
              <label className="text-sm text-muted mr-2">Week:</label>
              <select
                value={selectedWeek || ""}
                onChange={(e) => e.target.value && loadHypeVotes(Number(e.target.value))}
                className="bg-card border border-card-border rounded px-2 py-1 text-foreground text-sm"
              >
                <option value="">Select week</option>
                {weeks.map(w => (
                  <option key={w.id} value={w.id}>Week {w.weekNumber}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              {hypeVotes.map((v, i) => (
                <div key={i} className="bg-card border border-card-border rounded-lg p-3 text-xs">
                  <span className="text-muted">{playerName(v.giverId)}</span>
                  <span className="text-fire mx-2">→ 🛡️ →</span>
                  <span className="text-foreground font-bold">{playerName(v.receiverId)}</span>
                </div>
              ))}
              {hypeVotes.length === 0 && selectedWeek && (
                <div className="text-muted text-sm text-center py-4">No votes for this week.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

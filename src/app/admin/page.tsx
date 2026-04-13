"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import WeeklyReveal from "@/components/WeeklyReveal";
import LeaderboardReveal from "@/components/LeaderboardReveal";
import { getCurrentWeekNumber } from "@/lib/constants";

interface Week {
  id: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  type: string;
  soloChallengeId: number | null;
  secondChallengeId: number | null;
  buddyChallengeId: number | null;
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
  const [players, setPlayers] = useState<
    {
      id: number;
      vikingName: string | null;
      sigil: string | null;
      weeklyKmGoal: number | null;
      isAdmin: boolean;
      onboardingComplete: boolean;
      catchUpXpMultiplier?: number | null;
      catchUpStartWeek?: number | null;
      catchUpEndWeek?: number | null;
      buddyTeamId?: number | null;
    }[]
  >([]);
  const [preview, setPreview] = useState<PreviewMode>("none");
  const [editingPlayer, setEditingPlayer] = useState<number | null>(null);
  const [editSigil, setEditSigil] = useState("");
  const [editKmGoal, setEditKmGoal] = useState("");
  const [editVikingName, setEditVikingName] = useState("");
  const [editBuddyTeamId, setEditBuddyTeamId] = useState("");
  const [resetPinPlayerId, setResetPinPlayerId] = useState<number | null>(null);
  const [newPin, setNewPin] = useState("");
  const [resetPinSaving, setResetPinSaving] = useState(false);
  const [loginLinkCopying, setLoginLinkCopying] = useState<number | null>(null);
  const [addXpPlayerId, setAddXpPlayerId] = useState<number | null>(null);
  const [addXpAmount, setAddXpAmount] = useState("");
  const [addXpSaving, setAddXpSaving] = useState(false);
  const [catchUpSavingId, setCatchUpSavingId] = useState<number | null>(null);
  const [retroSaving, setRetroSaving] = useState(false);
  const [retroForm, setRetroForm] = useState({
    playerId: "",
    kmRun: "0",
    runsCount: "0",
    gymSessions: "0",
    soloChallengeDone: false,
    secondChallengeResult: "",
    buddyChallengeDone: false,
    buddyChallengeResult: "",
    hypeVoteFor: "",
    isLate: false,
  });
  const [questPlayerId, setQuestPlayerId] = useState<number | null>(null);
  const [playerQuests, setPlayerQuests] = useState<{ id: number; title: string; description: string; xpReward: number; completed: boolean }[]>([]);
  const [newQuestTitle, setNewQuestTitle] = useState("");
  const [newQuestDesc, setNewQuestDesc] = useState("");
  const [newQuestXp, setNewQuestXp] = useState("50");
  const [questSaving, setQuestSaving] = useState(false);
  const [editingQuestId, setEditingQuestId] = useState<number | null>(null);
  const [editQuestTitle, setEditQuestTitle] = useState("");
  const [editQuestDesc, setEditQuestDesc] = useState("");
  const [editQuestXp, setEditQuestXp] = useState("");
  const [editQuestSaving, setEditQuestSaving] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<number | null>(null);
  const [editChallengeTitle, setEditChallengeTitle] = useState("");
  const [editChallengeDesc, setEditChallengeDesc] = useState("");
  const [editChallengeSaving, setEditChallengeSaving] = useState(false);
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

  async function deleteInvite(id: number) {
    if (!confirm("Delete this invite link? It cannot be un-done.")) return;
    const res = await fetch("/api/admin/invites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setInvites((prev) => prev.filter((i) => i.id !== id));
      setMessage("Invite deleted.");
    } else {
      setMessage("Failed to delete invite.");
    }
  }

  async function refreshInvite(id: number) {
    const res = await fetch("/api/admin/invites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      const data = await res.json();
      setInvites((prev) => prev.map((i) => (i.id === id ? data.invite : i)));
      setMessage("Invite refreshed — valid for another 30 days.");
    } else {
      setMessage("Failed to refresh invite.");
    }
  }

  async function scoreWeek(weekId: number, force = false, groupChallengeOverride?: boolean | null) {
    setMessage("");
    const res = await fetch("/api/admin/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekId, force, groupChallengeOverride: groupChallengeOverride ?? undefined }),
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    loadData();
  }

  async function setChallengesForWeek(weekId: number, field: "soloChallengeId" | "secondChallengeId" | "buddyChallengeId", challengeId: number | null) {
    await fetch("/api/admin/weeks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekId, [field]: challengeId }),
    });
    loadData();
  }

  function startEditChallenge(c: { id: number; title: string; description: string }) {
    setEditingChallengeId(c.id);
    setEditChallengeTitle(c.title);
    setEditChallengeDesc(c.description);
  }

  async function saveChallengeEdit(challengeId: number) {
    setEditChallengeSaving(true);
    try {
      const res = await fetch("/api/challenges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          title: editChallengeTitle.trim(),
          description: editChallengeDesc.trim(),
        }),
      });
      if (res.ok) {
        setEditingChallengeId(null);
        await loadData();
      }
    } finally {
      setEditChallengeSaving(false);
    }
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

  async function addRetroactiveSubmission() {
    if (!selectedWeek) {
      setMessage("Select a week first.");
      return;
    }
    const pid = Number(retroForm.playerId);
    if (!pid) {
      setMessage("Choose a player.");
      return;
    }
    setRetroSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: pid,
          weekId: selectedWeek,
          kmRun: parseFloat(retroForm.kmRun) || 0,
          runsCount: parseInt(retroForm.runsCount, 10) || 0,
          gymSessions: parseInt(retroForm.gymSessions, 10) || 0,
          soloChallengeDone: retroForm.soloChallengeDone,
          secondChallengeResult: retroForm.secondChallengeResult === "" ? null : retroForm.secondChallengeResult,
          secondChallengeAttempted: true,
          buddyChallengeDone: retroForm.buddyChallengeDone,
          buddyChallengeResult: retroForm.buddyChallengeResult === "" ? null : parseFloat(retroForm.buddyChallengeResult) || null,
          hypeVoteFor: retroForm.hypeVoteFor ? Number(retroForm.hypeVoteFor) : null,
          isLate: retroForm.isLate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to add submission.");
        return;
      }
      setMessage(
        data.hint ||
          "Submission added. If this week was already scored, go to Weeks and click Rescore for everyone’s XP to update."
      );
      await loadSubmissions(selectedWeek);
    } finally {
      setRetroSaving(false);
    }
  }

  async function applyLateJoinCatchUp(playerId: number, multiplier: number, weekCount: number) {
    const start = getCurrentWeekNumber();
    const end = start + weekCount - 1;
    setCatchUpSavingId(playerId);
    setMessage("");
    try {
      const res = await fetch("/api/admin/players", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          catchUpXpMultiplier: multiplier,
          catchUpStartWeek: start,
          catchUpEndWeek: end,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to set catch-up.");
        return;
      }
      setMessage(
        `Catch-up set: ×${multiplier} on weekly XP (excl. first-sub bonus) for weeks ${start}–${end}. Re-score those weeks after submissions.`
      );
      loadData();
    } finally {
      setCatchUpSavingId(null);
    }
  }

  async function clearLateJoinCatchUp(playerId: number) {
    setCatchUpSavingId(playerId);
    setMessage("");
    try {
      const res = await fetch("/api/admin/players", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, clearCatchUp: true }),
      });
      if (!res.ok) {
        setMessage("Failed to clear catch-up.");
        return;
      }
      setMessage("Catch-up cleared.");
      loadData();
    } finally {
      setCatchUpSavingId(null);
    }
  }

  async function savePlayerEdit(playerId: number) {
    const updates: Record<string, unknown> = { playerId };
    if (editSigil) updates.sigil = editSigil;
    if (editKmGoal) updates.weeklyKmGoal = parseFloat(editKmGoal);
    if (editVikingName.trim()) updates.vikingName = editVikingName.trim().normalize("NFC");
    if (editBuddyTeamId !== "") updates.buddyTeamId = parseInt(editBuddyTeamId);
    else updates.buddyTeamId = null;
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

  async function resetPinForPlayer(playerId: number) {
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setMessage("PIN must be exactly 4 digits.");
      return;
    }
    setResetPinSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, newPin }),
      });
      const data = await res.json();
      setMessage(data.message || data.error || "Done.");
      if (res.ok) {
        setResetPinPlayerId(null);
        setNewPin("");
      }
    } finally {
      setResetPinSaving(false);
    }
  }

  async function getLoginLink(playerId: number) {
    setLoginLinkCopying(playerId);
    setMessage("");
    try {
      const res = await fetch("/api/admin/login-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to create link.");
        return;
      }
      const url = `${typeof window !== "undefined" ? window.location.origin : ""}/login?token=${data.token}`;
      await navigator.clipboard.writeText(url);
      setMessage("Login link copied to clipboard. Send it to the warrior. Valid 24h.");
    } catch {
      setMessage("Failed to copy link.");
    } finally {
      setLoginLinkCopying(null);
    }
  }

  async function addXpForPlayer(playerId: number) {
    const amount = parseInt(addXpAmount, 10);
    if (!Number.isFinite(amount) || amount < 1) {
      setMessage("Enter a positive XP amount.");
      return;
    }
    setAddXpSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/add-xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, amount }),
      });
      const data = await res.json();
      setMessage(data.message || data.error || "Done.");
      if (res.ok) {
        setAddXpPlayerId(null);
        setAddXpAmount("");
        loadData();
      }
    } finally {
      setAddXpSaving(false);
    }
  }

  function playerName(id: number) {
    return players.find(p => p.id === id)?.vikingName || `Player ${id}`;
  }

  async function loadQuestsForPlayer(playerId: number) {
    const res = await fetch(`/api/conquests?playerId=${playerId}`);
    if (res.ok) {
      const data = await res.json();
      setPlayerQuests(data.conquests || []);
    }
    setQuestPlayerId(playerId);
    setNewQuestTitle("");
    setNewQuestDesc("");
    setNewQuestXp("50");
    setEditingQuestId(null);
  }

  function startEditQuest(q: { id: number; title: string; description: string; xpReward: number }) {
    setEditingQuestId(q.id);
    setEditQuestTitle(q.title);
    setEditQuestDesc(q.description);
    setEditQuestXp(String(q.xpReward));
  }

  async function saveEditQuest(conquestId: number, playerId: number) {
    setEditQuestSaving(true);
    try {
      const res = await fetch("/api/conquests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conquestId,
          title: editQuestTitle.trim(),
          description: editQuestDesc.trim(),
          xpReward: Number(editQuestXp) || 50,
        }),
      });
      if (res.ok) {
        setEditingQuestId(null);
        await loadQuestsForPlayer(playerId);
      }
    } finally {
      setEditQuestSaving(false);
    }
  }

  async function addQuest(playerId: number) {
    if (!newQuestTitle.trim() || !newQuestDesc.trim()) return;
    setQuestSaving(true);
    try {
      const res = await fetch("/api/conquests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, title: newQuestTitle.trim(), description: newQuestDesc.trim(), xpReward: Number(newQuestXp) }),
      });
      if (res.ok) {
        setNewQuestTitle("");
        setNewQuestDesc("");
        setNewQuestXp("50");
        await loadQuestsForPlayer(playerId);
      }
    } finally {
      setQuestSaving(false);
    }
  }

  async function markQuestDone(questId: number, playerId: number) {
    const res = await fetch("/api/conquests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conquestId: questId, completed: true }),
    });
    if (res.ok) await loadQuestsForPlayer(playerId);
  }

  async function deleteQuest(questId: number, playerId: number) {
    const res = await fetch("/api/conquests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conquestId: questId }),
    });
    if (res.ok) await loadQuestsForPlayer(playerId);
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
    titleAfter: "Footsoldier",
    kmPoints: 42.3,
    rankBonus: 16,
    soloChallengePoints: 15,
    secondChallengePoints: 0,
    buddyChallengePoints: 0,
    streakBonus: 10,
    shieldPoints: 4.2,
    forgeBonus: 0,
    prBonus: 0,
    ontimeBonus: 10,
    firstSubmissionBonus: 0,
    berserkerMultiplier: 1.0,
  };

  const mockWeekScoreLevelUp = {
    ...mockWeekScoreBase,
    totalFinal: 124.5,
    xpTotalAfter: 145,
    titleAfter: "Farmhand",
    firstSubmissionBonus: 100,
    forgeBonus: 15,
    berserkerMultiplier: 1.5,
  };

  const mockLeaderboardPlayers = [
    { playerId: 1, vikingName: "Ragnar", sigil: "raven", rank: 1, prevRank: 3, totalFinal: 112, titleAfter: "Shield-Bearer" },
    { playerId: 2, vikingName: "Björn",  sigil: "bear",  rank: 2, prevRank: 1, totalFinal: 98,  titleAfter: "Footsoldier" },
    { playerId: 3, vikingName: "Sigrid", sigil: "wolf",  rank: 3, prevRank: 2, totalFinal: 85,  titleAfter: "Footsoldier" },
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
          <div className={`rounded-lg p-3 mb-4 text-sm border ${
            message.toLowerCase().includes("fail") || message.toLowerCase().includes("error") || message.toLowerCase().includes("failed")
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-green-500/10 border-green-500/30 text-green-400"
          }`}>
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
              const buddy = challenges.find(c => c.id === w.buddyChallengeId);
              return (
                <div key={w.id} className="bg-card border border-card-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold text-foreground">Week {w.weekNumber}</span>
                      <span className="text-xs text-muted ml-2">
                        {w.type === "competition" ? "⚔️" : "🛡️"} {w.startDate} — {w.endDate}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      {w.isLocked ? (
                        <>
                          <button
                            onClick={() => scoreWeek(w.id, true)}
                            className="text-xs bg-gold/20 text-gold px-3 py-1 rounded hover:bg-gold/30"
                          >Rescore</button>
                          {w.type === "collaboration" && w.secondChallengeId && (
                            <>
                              <button
                                onClick={() => scoreWeek(w.id, true, false)}
                                className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded hover:bg-red-500/30"
                                title="Rescore with group challenge forced to FAIL"
                              >Rescore (Group Fail)</button>
                              <button
                                onClick={() => scoreWeek(w.id, true, true)}
                                className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded hover:bg-green-500/30"
                                title="Rescore with group challenge forced to PASS"
                              >Rescore (Group Pass)</button>
                            </>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => scoreWeek(w.id)}
                          className="text-xs bg-fire/20 text-fire px-3 py-1 rounded hover:bg-fire/30"
                        >Score Week</button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
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
                    <div>
                      <label className="text-muted block mb-1">Buddy Challenge</label>
                      <select
                        value={w.buddyChallengeId || ""}
                        onChange={(e) => setChallengesForWeek(w.id, "buddyChallengeId", e.target.value ? Number(e.target.value) : null)}
                        className="w-full bg-background border border-card-border rounded px-2 py-1 text-foreground"
                      >
                        <option value="">None</option>
                        {challenges.filter(c => c.track === "buddy").map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                      {buddy && <span className="text-muted">{buddy.title}</span>}
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
                        if (questPlayerId === p.id) {
                          setQuestPlayerId(null);
                        } else {
                          loadQuestsForPlayer(p.id);
                          setEditingPlayer(null);
                        }
                      }}
                      className="text-xs text-ice hover:text-ice/80"
                    >Quests</button>
                    <button
                      onClick={() => {
                        setEditingPlayer(p.id);
                        setEditSigil(p.sigil || "");
                        setEditKmGoal(p.weeklyKmGoal?.toString() || "");
                        setEditVikingName(p.vikingName || "");
                        setEditBuddyTeamId(p.buddyTeamId?.toString() || "");
                        setQuestPlayerId(null);
                        setResetPinPlayerId(null);
                        setAddXpPlayerId(null);
                      }}
                      className="text-xs text-fire hover:text-fire/80"
                    >Edit</button>
                  </div>
                </div>
                <div className="text-xs text-muted">
                  Sigil: {p.sigil || "—"} · Weekly goal: {p.weeklyKmGoal ?? "—"} km · Buddy team: {p.buddyTeamId ?? "—"}
                </div>
                {Number(p.catchUpXpMultiplier ?? 1) > 1 &&
                  p.catchUpStartWeek != null &&
                  p.catchUpEndWeek != null && (
                    <div className="text-[10px] text-gold/90 mt-1 bg-gold/10 border border-gold/25 rounded px-2 py-1">
                      Late-join catch-up: ×{Number(p.catchUpXpMultiplier)} on weekly XP (weeks {p.catchUpStartWeek}–{p.catchUpEndWeek}, excl. first-submission bonus)
                    </div>
                  )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => applyLateJoinCatchUp(p.id, 2, 4)}
                    disabled={catchUpSavingId === p.id}
                    className="text-[10px] border border-ice/40 text-ice px-2 py-1 rounded hover:bg-ice/10 disabled:opacity-50"
                  >
                    {catchUpSavingId === p.id ? "…" : "2× XP — next 4 weeks (from current week)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => clearLateJoinCatchUp(p.id)}
                    disabled={catchUpSavingId === p.id || Number(p.catchUpXpMultiplier ?? 1) <= 1}
                    className="text-[10px] border border-muted/50 text-muted px-2 py-1 rounded hover:bg-card-border/30 disabled:opacity-40"
                  >
                    Clear catch-up
                  </button>
                </div>
                {questPlayerId === p.id && (
                  <div className="mt-3 border-t border-card-border pt-3 space-y-3">
                    <div className="text-xs font-bold text-ice mb-2">Personal Quests</div>

                    {/* Existing quests */}
                    <div className="space-y-1.5">
                      {playerQuests.length === 0 && (
                        <div className="text-xs text-muted italic">No quests yet.</div>
                      )}
                      {playerQuests.map(q => (
                        <div key={q.id} className={`rounded px-2 py-1.5 text-xs ${q.completed ? "opacity-40" : "bg-background border border-card-border"}`}>
                          {editingQuestId === q.id ? (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                value={editQuestTitle}
                                onChange={e => setEditQuestTitle(e.target.value)}
                                placeholder="Title"
                                className="w-full bg-background border border-card-border rounded px-2 py-1 text-xs text-foreground"
                              />
                              <input
                                type="text"
                                value={editQuestDesc}
                                onChange={e => setEditQuestDesc(e.target.value)}
                                placeholder="Description"
                                className="w-full bg-background border border-card-border rounded px-2 py-1 text-xs text-foreground"
                              />
                              <div className="flex gap-2 items-center">
                                <input
                                  type="number"
                                  value={editQuestXp}
                                  onChange={e => setEditQuestXp(e.target.value)}
                                  min={5}
                                  max={500}
                                  className="w-16 bg-background border border-card-border rounded px-2 py-1 text-xs text-foreground"
                                />
                                <span className="text-muted text-[10px]">XP</span>
                                <button
                                  onClick={() => saveEditQuest(q.id, p.id)}
                                  disabled={editQuestSaving || !editQuestTitle.trim()}
                                  className="text-[10px] bg-ice/20 text-ice px-2 py-0.5 rounded hover:bg-ice/30 disabled:opacity-40"
                                >{editQuestSaving ? "…" : "Save"}</button>
                                <button
                                  onClick={() => setEditingQuestId(null)}
                                  className="text-[10px] text-muted hover:text-foreground"
                                >Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <span className={`font-semibold ${q.completed ? "line-through text-muted" : "text-foreground"}`}>{q.title}</span>
                                <span className="text-muted ml-1">· {q.xpReward} XP</span>
                                <div className="text-muted text-[10px] truncate">{q.description}</div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => startEditQuest(q)}
                                  className="text-[10px] text-ice hover:text-ice/80 border border-ice/30 px-1.5 py-0.5 rounded"
                                >Edit</button>
                                {!q.completed && (
                                  <button
                                    onClick={() => markQuestDone(q.id, p.id)}
                                    className="text-[10px] text-green-400 hover:text-green-300 border border-green-400/30 px-1.5 py-0.5 rounded"
                                  >✓ Done</button>
                                )}
                                <button
                                  onClick={() => deleteQuest(q.id, p.id)}
                                  className="text-[10px] text-red-400 hover:text-red-300 border border-red-400/30 px-1.5 py-0.5 rounded"
                                >✕</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add new quest */}
                    <div className="border-t border-card-border/50 pt-2 space-y-1.5">
                      <div className="text-[10px] text-muted font-bold uppercase tracking-wide">Add Quest</div>
                      <input
                        type="text"
                        placeholder="Title"
                        value={newQuestTitle}
                        onChange={e => setNewQuestTitle(e.target.value)}
                        className="w-full bg-background border border-card-border rounded px-2 py-1 text-xs text-foreground"
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={newQuestDesc}
                        onChange={e => setNewQuestDesc(e.target.value)}
                        className="w-full bg-background border border-card-border rounded px-2 py-1 text-xs text-foreground"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="XP reward"
                          value={newQuestXp}
                          onChange={e => setNewQuestXp(e.target.value)}
                          className="w-20 bg-background border border-card-border rounded px-2 py-1 text-xs text-foreground"
                          min="5"
                          max="500"
                        />
                        <button
                          onClick={() => addQuest(p.id)}
                          disabled={questSaving || !newQuestTitle.trim()}
                          className="bg-ice/20 text-ice text-xs font-bold px-3 py-1 rounded hover:bg-ice/30 disabled:opacity-40"
                        >{questSaving ? "Saving…" : "Add Quest"}</button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-2 flex-wrap">
                  <button
                    onClick={() => getLoginLink(p.id)}
                    disabled={loginLinkCopying === p.id}
                    className="text-xs text-ice hover:text-ice/80 disabled:opacity-50"
                  >
                    {loginLinkCopying === p.id ? "..." : "Get login link"}
                  </button>
                  <button
                    onClick={() => setResetPinPlayerId(resetPinPlayerId === p.id ? null : p.id)}
                    className="text-xs text-gold hover:text-gold/80"
                  >
                    {resetPinPlayerId === p.id ? "Cancel" : "Reset PIN"}
                  </button>
                  <button
                    onClick={() => setAddXpPlayerId(addXpPlayerId === p.id ? null : p.id)}
                    className="text-xs text-fire hover:text-fire/80"
                  >
                    {addXpPlayerId === p.id ? "Cancel" : "Add XP"}
                  </button>
                </div>
                {addXpPlayerId === p.id && (
                  <div className="mt-2 flex gap-2 items-center">
                    <input
                      type="number"
                      min={1}
                      value={addXpAmount}
                      onChange={(e) => setAddXpAmount(e.target.value.replace(/\D/g, ""))}
                      placeholder="XP amount"
                      className="w-24 bg-background border border-card-border rounded px-2 py-1 text-foreground text-xs"
                    />
                    <button
                      onClick={() => addXpForPlayer(p.id)}
                      disabled={addXpSaving || !addXpAmount}
                      className="bg-fire text-background text-xs font-bold px-2 py-1 rounded disabled:opacity-50"
                    >
                      {addXpSaving ? "..." : "Add"}
                    </button>
                  </div>
                )}
                {resetPinPlayerId === p.id && (
                  <div className="mt-2 flex gap-2 items-center">
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="New 4-digit PIN"
                      className="w-28 bg-background border border-card-border rounded px-2 py-1 text-foreground text-xs"
                    />
                    <button
                      onClick={() => resetPinForPlayer(p.id)}
                      disabled={resetPinSaving || newPin.length !== 4}
                      className="bg-gold text-background text-xs font-bold px-2 py-1 rounded disabled:opacity-50"
                    >
                      {resetPinSaving ? "..." : "Set PIN"}
                    </button>
                  </div>
                )}
                {editingPlayer === p.id && (
                  <div className="mt-3 space-y-2 border-t border-card-border pt-3">
                    <div>
                      <label className="text-xs text-muted block mb-1">Viking name</label>
                      <input
                        type="text"
                        value={editVikingName}
                        onChange={(e) => setEditVikingName(e.target.value)}
                        className="w-full bg-background border border-card-border rounded px-2 py-1 text-foreground text-xs"
                        placeholder="Name they use to log in"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
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
                      <div>
                        <label className="text-xs text-muted block mb-1">Buddy team</label>
                        <input
                          type="number"
                          value={editBuddyTeamId}
                          onChange={(e) => setEditBuddyTeamId(e.target.value)}
                          className="w-full bg-background border border-card-border rounded px-2 py-1 text-foreground text-xs"
                          placeholder="e.g. 1"
                          step="1"
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
            {["solo", "competitive", "collaborative", "buddy"].map(track => (
              <div key={track}>
                <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-sm text-fire mb-2 capitalize">{track}</h3>
                {challenges.filter(c => c.track === track).map(c => (
                  <div key={c.id} className="bg-card border border-card-border rounded p-3 mb-2 text-xs">
                    {editingChallengeId === c.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editChallengeTitle}
                          onChange={e => setEditChallengeTitle(e.target.value)}
                          placeholder="Title"
                          className="w-full bg-background border border-card-border rounded px-2 py-1.5 text-foreground text-sm"
                        />
                        <textarea
                          value={editChallengeDesc}
                          onChange={e => setEditChallengeDesc(e.target.value)}
                          placeholder="Description"
                          rows={3}
                          className="w-full bg-background border border-card-border rounded px-2 py-1.5 text-foreground text-sm resize-y"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveChallengeEdit(c.id)}
                            disabled={editChallengeSaving || !editChallengeTitle.trim()}
                            className="text-xs bg-ice/20 text-ice px-3 py-1 rounded hover:bg-ice/30 disabled:opacity-40"
                          >{editChallengeSaving ? "Saving…" : "Save"}</button>
                          <button
                            onClick={() => setEditingChallengeId(null)}
                            className="text-xs text-muted hover:text-foreground"
                          >Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="font-semibold text-foreground">{c.title}</div>
                        <div className="text-muted">{c.description}</div>
                        <div className="text-muted mt-1">Phase: {c.phase} · Type: {c.dataType || "boolean"} {c.targetValue ? `· Target: ${c.targetValue}` : ""} · <span className={c.difficulty === "epic" ? "text-gold" : c.difficulty === "hard" ? "text-fire" : "text-stone"}>{(c.difficulty || "normal").toUpperCase()}</span></div>
                        <button
                          onClick={() => startEditChallenge(c)}
                          className="mt-2 text-[10px] text-ice hover:text-ice/80 border border-ice/30 px-2 py-0.5 rounded"
                        >Edit</button>
                      </>
                    )}
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
              {invites.map(inv => {
                const isExpired = !inv.usedAt && new Date() > new Date(inv.expiresAt);
                return (
                  <div key={inv.id} className="bg-card border border-card-border rounded-lg p-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">Slot {inv.playerSlot}</span>
                      <div className="flex items-center gap-2">
                        <span className={inv.usedAt ? "text-green-400" : isExpired ? "text-red-400" : "text-yellow-400"}>
                          {inv.usedAt ? "✓ Used" : isExpired ? "Expired" : "Pending"}
                        </span>
                        {!inv.usedAt && (
                          <>
                            <button
                              onClick={() => refreshInvite(inv.id)}
                              className="text-[10px] bg-gold/20 text-gold px-2 py-0.5 rounded hover:bg-gold/30"
                              title="Generate a new token for this slot (resets 30-day expiry)"
                            >Refresh</button>
                            <button
                              onClick={() => deleteInvite(inv.id)}
                              className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded hover:bg-red-500/30"
                              title="Delete this invite slot"
                            >Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                    {!inv.usedAt && (
                      <div className="mt-1 bg-background border border-card-border rounded px-2 py-1 font-mono text-[10px] break-all select-all">
                        {baseUrl}/portal?rune={inv.token}
                      </div>
                    )}
                  </div>
                );
              })}
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

            {selectedWeek && (
              <div className="mt-6 border-t border-card-border pt-4">
                <div className="text-xs font-bold text-ice mb-2">Add retroactive submission</div>
                <p className="text-[10px] text-muted mb-3">
                  For Vikings who missed the deadline or forgot to submit. After saving, open{" "}
                  <strong className="text-foreground">Weeks</strong> and click <strong className="text-foreground">Rescore</strong> on{" "}
                  <strong>this week</strong>. If later weeks were already scored, rescore those too in order (week numbers
                  ascending) so everyone&apos;s cumulative XP/titles stay correct.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="col-span-2">
                    <label className="text-muted block mb-0.5">Player</label>
                    <select
                      value={retroForm.playerId}
                      onChange={(e) => setRetroForm((f) => ({ ...f, playerId: e.target.value }))}
                      className="w-full bg-background border border-card-border rounded px-2 py-1 text-foreground"
                    >
                      <option value="">Select…</option>
                      {players.filter((p) => p.onboardingComplete).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.vikingName || `Player ${p.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-muted block mb-0.5">Km run</label>
                    <input
                      type="number"
                      step="0.1"
                      value={retroForm.kmRun}
                      onChange={(e) => setRetroForm((f) => ({ ...f, kmRun: e.target.value }))}
                      className="w-full bg-background border border-card-border rounded px-2 py-1 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-muted block mb-0.5">Runs</label>
                    <input
                      type="number"
                      min={0}
                      value={retroForm.runsCount}
                      onChange={(e) => setRetroForm((f) => ({ ...f, runsCount: e.target.value }))}
                      className="w-full bg-background border border-card-border rounded px-2 py-1 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-muted block mb-0.5">Gym sessions</label>
                    <input
                      type="number"
                      min={0}
                      value={retroForm.gymSessions}
                      onChange={(e) => setRetroForm((f) => ({ ...f, gymSessions: e.target.value }))}
                      className="w-full bg-background border border-card-border rounded px-2 py-1 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-muted block mb-0.5">2nd challenge # (optional)</label>
                    <input
                      type="text"
                      value={retroForm.secondChallengeResult}
                      onChange={(e) => setRetroForm((f) => ({ ...f, secondChallengeResult: e.target.value }))}
                      className="w-full bg-background border border-card-border rounded px-2 py-1 text-foreground"
                      placeholder="e.g. minutes or count"
                    />
                  </div>
                  <div>
                    <label className="text-muted block mb-0.5">Hype vote for</label>
                    <select
                      value={retroForm.hypeVoteFor}
                      onChange={(e) => setRetroForm((f) => ({ ...f, hypeVoteFor: e.target.value }))}
                      className="w-full bg-background border border-card-border rounded px-2 py-1 text-foreground"
                    >
                      <option value="">— none —</option>
                      {players
                        .filter((p) => p.onboardingComplete && String(p.id) !== retroForm.playerId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.vikingName || `Player ${p.id}`}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-2 flex flex-wrap items-center gap-4 mt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={retroForm.soloChallengeDone}
                        onChange={(e) => setRetroForm((f) => ({ ...f, soloChallengeDone: e.target.checked }))}
                      />
                      <span>Solo challenge done</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={retroForm.isLate}
                        onChange={(e) => setRetroForm((f) => ({ ...f, isLate: e.target.checked }))}
                      />
                      <span>Counted as late (no on-time bonus)</span>
                    </label>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addRetroactiveSubmission}
                  disabled={retroSaving}
                  className="mt-3 text-xs bg-ice/20 text-ice px-3 py-2 rounded hover:bg-ice/30 disabled:opacity-50"
                >
                  {retroSaving ? "Saving…" : "Save retro submission"}
                </button>
              </div>
            )}
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

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

interface Challenge {
  id: number;
  title: string;
  description: string;
  track: string;
  dataType: string | null;
  targetValue: number | null;
  phase: string;
  used: boolean;
  submittedBy: number | null;
}

export default function ChallengesPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTrack, setNewTrack] = useState("solo");
  const [newDataType, setNewDataType] = useState("");
  const [newPhase, setNewPhase] = useState("any");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const loadData = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) { router.push("/login"); return; }

      const res = await fetch("/api/challenges");
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          track: newTrack,
          dataType: newDataType || null,
          phase: newPhase,
        }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewDesc("");
        setShowForm(false);
        loadData();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = filter === "all" ? challenges : challenges.filter(c => c.track === filter);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-fire font-[family-name:var(--font-cinzel)] animate-pulse">Loading challenges...</div>
      </div>
    );
  }

  const trackIcon = (track: string) => {
    if (track === "solo") return "🎯";
    if (track === "competitive") return "⚔️";
    return "🛡️";
  };

  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-card-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="text-muted hover:text-foreground">← Back</button>
          <h1 className="text-sm font-[family-name:var(--font-cinzel)] font-bold text-fire">Challenge Board</h1>
          <button onClick={() => setShowForm(!showForm)} className="text-fire text-sm">+ New</button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Filter */}
        <div className="flex gap-1 mb-4">
          {["all", "solo", "competitive", "collaborative"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                filter === f ? "bg-fire/20 text-fire" : "text-muted hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* New challenge form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-card border border-fire/20 rounded-lg p-4 mb-4 space-y-3">
            <h3 className="font-[family-name:var(--font-cinzel)] font-bold text-sm text-fire">Propose a Challenge</h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Challenge title"
              className="w-full bg-background border border-card-border rounded px-3 py-2 text-sm text-foreground"
              required
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description"
              className="w-full bg-background border border-card-border rounded px-3 py-2 text-sm text-foreground h-16"
              required
            />
            <div className="grid grid-cols-3 gap-2">
              <select value={newTrack} onChange={(e) => setNewTrack(e.target.value)} className="bg-background border border-card-border rounded px-2 py-1 text-xs text-foreground">
                <option value="solo">Solo</option>
                <option value="competitive">Competitive</option>
                <option value="collaborative">Collaborative</option>
              </select>
              <select value={newDataType} onChange={(e) => setNewDataType(e.target.value)} className="bg-background border border-card-border rounded px-2 py-1 text-xs text-foreground">
                <option value="">Boolean</option>
                <option value="time_mmss">Time (mm:ss)</option>
                <option value="distance_km">Distance (km)</option>
                <option value="count">Count</option>
                <option value="weight_kg">Weight (kg)</option>
              </select>
              <select value={newPhase} onChange={(e) => setNewPhase(e.target.value)} className="bg-background border border-card-border rounded px-2 py-1 text-xs text-foreground">
                <option value="any">Any phase</option>
                <option value="foundation">Foundation</option>
                <option value="building">Building</option>
                <option value="peak">Peak</option>
                <option value="taper">Taper</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-fire text-background py-2 rounded-lg text-sm font-bold disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Challenge"}
            </button>
          </form>
        )}

        {/* Challenge list */}
        <div className="space-y-2">
          {filtered.map(c => (
            <div
              key={c.id}
              className={`bg-card border rounded-lg p-3 ${
                c.used ? "border-card-border opacity-60" : "border-card-border"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{trackIcon(c.track)}</span>
                <span className="font-semibold text-sm text-foreground">{c.title}</span>
                {c.used && <span className="text-[10px] text-muted bg-card-border rounded px-1">Used</span>}
              </div>
              <p className="text-xs text-muted">{c.description}</p>
              <div className="text-[10px] text-muted mt-1">
                {c.phase} · {c.dataType || "boolean"}
                {c.targetValue ? ` · Target: ${c.targetValue}` : ""}
                {c.submittedBy ? " · Player submitted" : ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="quests" />
    </div>
  );
}

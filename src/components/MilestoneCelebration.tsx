"use client";

import { useState, useEffect } from "react";

interface Milestone {
  id: number;
  type: string;
  value: number | null;
  playerId: number | null;
}

const MILESTONE_META: Record<string, { title: string; description: string; icon: string }> = {
  first_20km_week: { title: "First 20km Week", description: "You have crossed the 20 kilometre threshold in a single week.", icon: "🏃" },
  first_30km_week: { title: "First 30km Week", description: "30 kilometres in one week. A warrior's achievement.", icon: "🏃" },
  first_40km_week: { title: "Peak Warrior", description: "40 kilometres. You are in peak training. Valhalla sees you.", icon: "🔥" },
  group_100km_week: { title: "The Hundred", description: "The Iron Vikings ran 100km together in one week!", icon: "⚔️" },
  group_500km_total: { title: "500km Combined", description: "Together you have covered 500 kilometres.", icon: "🛡️" },
  group_1000km_total: { title: "A Thousand Leagues", description: "1,000 kilometres. Legends will speak of this.", icon: "⚔️" },
  all_vikings_10km_week: { title: "All Vikings Rise", description: "Every warrior hit 10km this week.", icon: "🛡️" },
  skald_monthly: { title: "Skald of the Month", description: "Your voice lifted others. The sagas remember.", icon: "📜" },
};

export default function MilestoneCelebration() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/milestones")
      .then((r) => r.ok ? r.json() : { milestones: [] })
      .then((data) => {
        if (data.milestones?.length > 0) {
          setMilestones(data.milestones);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    const m = milestones[currentIndex];
    fetch("/api/milestones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ milestoneId: m.id }),
    }).catch(() => {});

    if (currentIndex < milestones.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setVisible(false);
    }
  }

  if (!visible || milestones.length === 0) return null;

  const current = milestones[currentIndex];
  const meta = MILESTONE_META[current.type] || {
    title: "Milestone Unlocked",
    description: "You have achieved something noteworthy.",
    icon: "🏆",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="max-w-sm mx-4 text-center animate-[fadeIn_0.5s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl mb-4 animate-bounce">{meta.icon}</div>
        <h2 className="text-2xl font-[family-name:var(--font-cinzel)] font-bold text-gold mb-2">
          {meta.title}
        </h2>
        <p className="text-muted text-sm mb-2">{meta.description}</p>
        {current.value && (
          <p className="text-fire font-bold text-lg">{current.value}</p>
        )}
        <p className="text-muted text-xs mt-4 italic">
          {current.playerId ? "Personal achievement" : "Group achievement"}
        </p>
        <button
          onClick={dismiss}
          className="mt-6 bg-fire/20 text-fire px-8 py-2 rounded-lg font-[family-name:var(--font-cinzel)] font-bold hover:bg-fire/30 transition-colors"
        >
          Continue
        </button>
        {milestones.length > 1 && (
          <div className="text-[10px] text-muted mt-2">
            {currentIndex + 1} / {milestones.length}
          </div>
        )}
      </div>
    </div>
  );
}

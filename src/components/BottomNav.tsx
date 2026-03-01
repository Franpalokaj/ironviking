"use client";

import { useRouter } from "next/navigation";

type NavTab = "board" | "submit" | "profile" | "quests" | "guide";

interface BottomNavProps {
  active: NavTab;
  profileId?: number | string;
}

export default function BottomNav({ active, profileId }: BottomNavProps) {
  const router = useRouter();

  const tabs: { id: NavTab; label: string; icon: string; path: () => string }[] = [
    { id: "board", label: "Board", icon: "⚔️", path: () => "/dashboard" },
    { id: "submit", label: "Submit", icon: "📜", path: () => "/submit" },
    { id: "profile", label: "Profile", icon: "👤", path: () => profileId ? `/profile/${profileId}` : "/profile/me" },
    { id: "quests", label: "Quests", icon: "🎯", path: () => "/challenges" },
    { id: "guide", label: "Guide", icon: "📖", path: () => "/guide" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-card-border z-40">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => router.push(tab.path())}
            className={`flex-1 py-3 text-center text-xs transition-colors ${
              active === tab.id
                ? "text-fire font-semibold"
                : "text-muted hover:text-fire"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

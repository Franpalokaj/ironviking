"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

type NavTab = "board" | "submit" | "profile" | "quests" | "guide";

interface BottomNavProps {
  active: NavTab;
  profileId?: number | string;
}

const NAV_ICONS: Record<NavTab, string> = {
  board: "/images/nav/board.png",
  submit: "/images/nav/submit.png",
  profile: "/images/nav/profile.png",
  quests: "/images/nav/quests.png",
  guide: "/images/nav/guide.png",
};

export default function BottomNav({ active, profileId }: BottomNavProps) {
  const router = useRouter();

  const tabs: { id: NavTab; label: string; path: () => string }[] = [
    { id: "board", label: "Board", path: () => "/dashboard" },
    { id: "submit", label: "Submit", path: () => "/submit" },
    { id: "profile", label: "Profile", path: () => profileId ? `/profile/${profileId}` : "/profile/me" },
    { id: "quests", label: "Quests", path: () => "/challenges" },
    { id: "guide", label: "Guide", path: () => "/guide" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-card-border z-40">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => router.push(tab.path())}
            className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs transition-all ${
              active === tab.id
                ? "text-fire font-semibold"
                : "text-muted hover:text-fire"
            }`}
          >
            <Image
              unoptimized
              src={NAV_ICONS[tab.id]}
              alt={tab.label}
              width={30}
              height={30}
              className={active === tab.id ? "brightness-125" : "opacity-50"}
            />
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

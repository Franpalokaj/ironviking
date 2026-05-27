"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import BottomNav from "@/components/BottomNav";
import { ACTIVITY_MULTIPLIERS, getCurrentWeekNumber, SIGIL_IMAGES } from "@/lib/constants";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Player {
  id: number;
  vikingName: string | null;
  sigil: string | null;
}

interface Submission {
  playerId: number;
  weekNumber: number;
  kmRun: number;
  runsCount: number;
  gymSessions: number;
  mtbKm: number | null;
  hikingKm: number | null;
  swimmingKm: number | null;
  ballSportSessions: number | null;
}

type ActivityKey =
  | "kmRun"
  | "mtbKm"
  | "hikingKm"
  | "swimmingKm"
  | "gymSessions"
  | "ballSportSessions"
  | "runsCount"
  | "equivKm";

const ACTIVITIES: { key: ActivityKey; label: string; unit: string }[] = [
  { key: "kmRun", label: "Running", unit: "km" },
  { key: "mtbKm", label: "MTB", unit: "km" },
  { key: "hikingKm", label: "Hiking", unit: "km" },
  { key: "swimmingKm", label: "Swimming", unit: "km" },
  { key: "gymSessions", label: "Gym", unit: "sessions" },
  { key: "ballSportSessions", label: "Ball Sport", unit: "sessions" },
  { key: "runsCount", label: "Runs", unit: "runs" },
  { key: "equivKm", label: "Equiv. KM", unit: "km" },
];

const CHART_COLORS = [
  "#e8782a", // fire orange
  "#7ab8d4", // ice blue
  "#c8a22a", // gold
  "#4a9e6b", // emerald
  "#b87333", // bronze
  "#d45d79", // rose
  "#a8a8a8", // silver
  "#9b6fd4", // bright purple
];

interface TooltipEntry {
  dataKey: string;
  name: string;
  value: number;
  color: string;
}

function RankedTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => b.value - a.value);
  return (
    <div style={{ background: "#1a1816", border: "1px solid #2a2520", borderRadius: "8px", padding: "8px 12px", fontSize: "12px" }}>
      <p style={{ color: "#8a8070", fontWeight: "bold", marginBottom: "4px" }}>{label}</p>
      {sorted.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color, margin: "2px 0" }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

function getSubmissionValue(s: Submission, key: ActivityKey): number {
  if (key === "equivKm") {
    return (
      s.kmRun * ACTIVITY_MULTIPLIERS.running +
      (s.mtbKm ?? 0) * ACTIVITY_MULTIPLIERS.mtb +
      (s.hikingKm ?? 0) * ACTIVITY_MULTIPLIERS.hiking +
      (s.swimmingKm ?? 0) * ACTIVITY_MULTIPLIERS.swimming +
      (s.ballSportSessions ?? 0) * ACTIVITY_MULTIPLIERS.ballSport
    );
  }
  return (s[key] as number | null) ?? 0;
}

export default function StatsPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ playerId: number } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [maxWeek, setMaxWeek] = useState(1);
  const [selectedActivity, setSelectedActivity] = useState<ActivityKey>("kmRun");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) {
        router.push("/login");
        return;
      }
      const { session: s } = await sessionRes.json();
      setSession(s);

      const res = await fetch("/api/stats/activity-chart");
      if (!res.ok) return;
      const data = await res.json();

      setPlayers(data.players.sort((a: Player, b: Player) => a.id - b.id));
      setSubmissions(data.submissions);
      const currentWeek = getCurrentWeekNumber();
      const lastDataWeek = data.weeks.length > 0 ? Math.max(...data.weeks) : 1;
      setMaxWeek(Math.min(currentWeek, lastDataWeek));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build cumulative chart data
  const chartData = useMemo(() => {
    if (players.length === 0) return [];

    // Index submissions by playerId + weekNumber
    const subMap = new Map<string, Submission>();
    for (const s of submissions) {
      subMap.set(`${s.playerId}_${s.weekNumber}`, s);
    }

    const data: Record<string, number | string>[] = [];
    const cumulative: Record<number, number> = {};
    for (const p of players) cumulative[p.id] = 0;

    for (let week = 1; week <= maxWeek; week++) {
      const point: Record<string, number | string> = { week: `W${week}` };
      for (const p of players) {
        const sub = subMap.get(`${p.id}_${week}`);
        if (sub) {
          cumulative[p.id] += getSubmissionValue(sub, selectedActivity);
        }
        point[`p_${p.id}`] = Math.round(cumulative[p.id] * 10) / 10;
      }
      data.push(point);
    }

    return data;
  }, [players, submissions, maxWeek, selectedActivity]);

  const activity = ACTIVITIES.find((a) => a.key === selectedActivity)!;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted font-[family-name:var(--font-cinzel)] animate-pulse">
          The ravens are charting...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg sm:max-w-4xl mx-auto px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-muted hover:text-foreground transition-colors text-xl"
        >
          &larr;
        </button>
        <h1 className="text-xl font-[family-name:var(--font-cinzel)] font-bold text-foreground">
          Activity Stats
        </h1>
      </div>

      {/* Activity tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {ACTIVITIES.map((a) => (
          <button
            key={a.key}
            onClick={() => setSelectedActivity(a.key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-[family-name:var(--font-cinzel)] font-semibold transition-all ${
              selectedActivity === a.key
                ? "bg-fire/20 text-fire"
                : "text-muted hover:text-foreground"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-6">
        <p className="text-xs text-muted mb-3 font-[family-name:var(--font-crimson)]">
          Cumulative {activity.label} ({activity.unit})
        </p>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={320} className="!h-[min(55vh,450px)] sm:!h-[min(60vh,550px)]">
            <LineChart data={chartData}>
              <XAxis
                dataKey="week"
                tick={{ fill: "#8a8070", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#2a2520" }}
                interval={Math.max(0, Math.ceil(maxWeek / 8) - 1)}
              />
              <YAxis
                tick={{ fill: "#8a8070", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#2a2520" }}
                width={40}
              />
              <Tooltip content={<RankedTooltip />} />
              {players.map((player, i) => (
                <Line
                  key={player.id}
                  type="monotone"
                  dataKey={`p_${player.id}`}
                  name={player.vikingName || `Viking ${player.id}`}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[320px] flex items-center justify-center">
            <p className="text-muted text-sm">No data yet.</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mb-8">
        {players.map((player, i) => {
          const sigilSrc = player.sigil ? SIGIL_IMAGES[player.sigil] : null;
          return (
            <div key={player.id} className="flex items-center gap-2 text-sm">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              {sigilSrc && (
                <Image unoptimized src={sigilSrc} alt="" width={18} height={18} className="shrink-0" />
              )}
              <span className="text-foreground truncate">
                {player.vikingName || `Viking ${player.id}`}
              </span>
            </div>
          );
        })}
      </div>

      <BottomNav active="board" profileId={session?.playerId} />
    </div>
  );
}

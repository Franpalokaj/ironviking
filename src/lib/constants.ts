export const RACE_DATE = new Date("2026-09-12T00:00:00+02:00");
export const TRAINING_START = new Date("2026-02-23T00:00:00+01:00");
export const TIMEZONE = "Europe/Berlin";
export const TOTAL_WEEKS = 28;
export const NUM_PLAYERS = 6;

export const TITLES = [
  { threshold: 0, name: "Thrall", description: "A bondsman. The journey begins." },
  { threshold: 100, name: "Farmhand", description: "Shows up. Does the work." },
  { threshold: 300, name: "Footsoldier", description: "Earning their place in the line." },
  { threshold: 650, name: "Shield-Bearer", description: "Trusted with weapons and responsibility." },
  { threshold: 1100, name: "Raider", description: "Active, capable, going on raids." },
  { threshold: 1700, name: "Jarl", description: "A chieftain. Earned through consistent deeds." },
  { threshold: 2500, name: "Einherjar", description: "Chosen by Odin himself. Destined for Valhalla." },
] as const;

export const TITLE_STYLES: Record<string, { color: string; rune: string; glow?: boolean }> = {
  Thrall:          { color: "text-muted",  rune: "ᚦ" },
  Farmhand:        { color: "text-stone",  rune: "ᚠ" },
  Footsoldier:     { color: "text-bronze", rune: "ᚱ" },
  "Shield-Bearer": { color: "text-silver", rune: "ᛊ" },
  Raider:          { color: "text-fire",   rune: "ᚢ" },
  Jarl:            { color: "text-gold",   rune: "ᛃ" },
  Einherjar:       { color: "text-gold",   rune: "ᛟ", glow: true },
};

export type Difficulty = "normal" | "hard" | "epic";

export const DIFFICULTY_POINTS: Record<Difficulty, { solo: number; group: number }> = {
  normal: { solo: 15, group: 10 },
  hard:   { solo: 25, group: 18 },
  epic:   { solo: 40, group: 30 },
};

export const DIFFICULTY_LABELS: Record<Difficulty, { label: string; color: string }> = {
  normal: { label: "Normal", color: "text-stone" },
  hard:   { label: "Hard",   color: "text-fire" },
  epic:   { label: "Epic",   color: "text-gold" },
};

export function getTitleForXP(xp: number): typeof TITLES[number] {
  for (let i = TITLES.length - 1; i >= 0; i--) {
    if (xp >= TITLES[i].threshold) return TITLES[i];
  }
  return TITLES[0];
}

export function getNextTitle(xp: number): (typeof TITLES[number]) | null {
  for (const title of TITLES) {
    if (xp < title.threshold) return title;
  }
  return null;
}

export const REALMS = [
  { position: 1, name: "Asgard", color: "gold", cssClass: "text-gold asgard-glow" },
  { position: 2, name: "Vanaheim", color: "silver", cssClass: "text-silver" },
  { position: 3, name: "Midgard", color: "bronze", cssClass: "text-bronze" },
  { position: 4, name: "Jotunheim", color: "stone", cssClass: "text-stone" },
  { position: 5, name: "Helheim", color: "purple", cssClass: "text-purple" },
  { position: 6, name: "Niflheim", color: "ice", cssClass: "text-ice niflheim-glow" },
] as const;

export function getRealmForRank(rank: number): typeof REALMS[number] {
  return REALMS[Math.min(rank - 1, 5)];
}

export const RANK_BONUSES = [30, 22, 16, 10, 5, 2] as const;
export const COMPETITIVE_BONUSES = [30, 20, 15, 10, 5, 0] as const;
export const COLLABORATIVE_BONUS = 10;
export const SOLO_CHALLENGE_BONUS = 15;
export const SHIELD_BONUS = 8;
export const PR_BONUS = 20;
export const ONTIME_BONUS = 10;
export const SKALD_BONUS = 10;
export const STREAK_BONUS_PER_WEEK = 5;
export const STREAK_BONUS_CAP = 50;
export const BERSERKER_MULTIPLIER = 1.5;
export const KM_POINTS_POOL = 60;

export const SIGILS = [
  "wolf", "raven", "bear", "serpent", "dragon",
  "axe", "shield", "longship", "crown", "skull",
] as const;

export type Sigil = typeof SIGILS[number];

export const SIGIL_EMOJIS: Record<Sigil, string> = {
  wolf: "🐺",
  raven: "🐦‍⬛",
  bear: "🐻",
  serpent: "🐍",
  dragon: "🐉",
  axe: "🪓",
  shield: "🛡️",
  longship: "⛵",
  crown: "👑",
  skull: "💀",
};

export const DEFAULT_CONQUESTS = [
  { title: "Sub-60 min 10K", description: "Run 10 kilometres in under 60 minutes", xpReward: 75 },
  { title: "Sub-30 min 5K", description: "Run 5 kilometres in under 30 minutes", xpReward: 50 },
  { title: "Complete a 30km run", description: "Log a single run of 30km or more", xpReward: 100 },
  { title: "15 unbroken pull-ups", description: "Complete 15 pull-ups in a single set", xpReward: 75 },
  { title: "3 days in a row", description: "Log training on 3 consecutive days", xpReward: 40 },
  { title: "Run in the rain", description: "Log a run under rainy or stormy conditions", xpReward: 25 },
  { title: "Dawn run", description: "Log a run starting at 6am or earlier", xpReward: 25 },
  { title: "Trail run 10km+", description: "Complete a trail run of 10km or more", xpReward: 50 },
  { title: "100kg deadlift", description: "Lift 100kg in a single deadlift", xpReward: 75 },
  { title: "Perfect attendance", description: "Never miss a weekly submission across the season", xpReward: 150 },
  { title: "Monthly team sweep", description: "Complete every team challenge in a single calendar month", xpReward: 60 },
  { title: "First gym streak", description: "Complete gym sessions 3 weeks in a row", xpReward: 45 },
  { title: "Longest run PR", description: "Beat your baseline longest run distance", xpReward: 60 },
  { title: "Sub-6 min/km pace", description: "Log a run at average pace under 6:00 min/km", xpReward: 65 },
  { title: "Run with a friend", description: "Log a run together with another Viking", xpReward: 35 },
] as const;

export const COUNTDOWN_PHRASES = [
  "days until the Battle of Valhalla",
  "days until the gates of Asgard open",
  "sunrises until Ragnarok",
  "days until Odin's Trial",
  "days until the final march",
];

export const PHASES = [
  {
    name: "Foundation",
    weeks: [1, 7],
    dates: "Feb 23 – Apr 12",
    kmRange: "8 → 17 km",
  },
  {
    name: "Building",
    weeks: [8, 16],
    dates: "Apr 13 – Jun 14",
    kmRange: "19 → 30 km",
  },
  {
    name: "Peak",
    weeks: [17, 24],
    dates: "Jun 15 – Aug 9",
    kmRange: "32 → 42 km",
  },
  {
    name: "Taper",
    weeks: [25, 28],
    dates: "Aug 10 – Sep 12",
    kmRange: "32 → 8 km",
  },
] as const;

export const WEEKLY_KM_TARGETS: Record<number, { min: number; max: number; longRun: number }> = {
  1: { min: 8, max: 8, longRun: 4 },
  2: { min: 10, max: 10, longRun: 5 },
  3: { min: 12, max: 12, longRun: 6 },
  4: { min: 14, max: 14, longRun: 7 },
  5: { min: 15, max: 15, longRun: 8 },
  6: { min: 15, max: 15, longRun: 8 },
  7: { min: 17, max: 17, longRun: 9 },
  8: { min: 19, max: 19, longRun: 10 },
  9: { min: 21, max: 21, longRun: 11 },
  10: { min: 23, max: 23, longRun: 12 },
  11: { min: 23, max: 23, longRun: 12 },
  12: { min: 25, max: 25, longRun: 14 },
  13: { min: 27, max: 27, longRun: 15 },
  14: { min: 28, max: 28, longRun: 16 },
  15: { min: 28, max: 28, longRun: 16 },
  16: { min: 30, max: 30, longRun: 18 },
  17: { min: 32, max: 32, longRun: 20 },
  18: { min: 34, max: 34, longRun: 21 },
  19: { min: 34, max: 34, longRun: 21 },
  20: { min: 36, max: 36, longRun: 23 },
  21: { min: 38, max: 38, longRun: 25 },
  22: { min: 36, max: 36, longRun: 23 },
  23: { min: 40, max: 40, longRun: 27 },
  24: { min: 42, max: 42, longRun: 30 },
  25: { min: 32, max: 32, longRun: 20 },
  26: { min: 24, max: 24, longRun: 15 },
  27: { min: 16, max: 16, longRun: 10 },
  28: { min: 8, max: 8, longRun: 5 },
};

export function getPhaseForWeek(weekNumber: number): typeof PHASES[number] {
  for (const phase of PHASES) {
    if (weekNumber >= phase.weeks[0] && weekNumber <= phase.weeks[1]) return phase;
  }
  return PHASES[0];
}

export function getWeekDates(weekNumber: number): { start: Date; end: Date } {
  const start = new Date(TRAINING_START);
  start.setDate(start.getDate() + (weekNumber - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getCurrentWeekNumber(): number {
  const now = new Date();
  const diffMs = now.getTime() - TRAINING_START.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  return Math.max(1, Math.min(week, TOTAL_WEEKS));
}

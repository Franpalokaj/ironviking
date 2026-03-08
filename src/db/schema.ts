import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  real,
  timestamp,
  date,
  unique,
} from "drizzle-orm/pg-core";

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  vikingName: text("viking_name").unique(),
  pinHash: text("pin_hash").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  weeklyKmGoal: real("weekly_km_goal"),
  sigil: text("sigil"),
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inviteTokens = pgTable("invite_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").unique().notNull(),
  playerSlot: integer("player_slot").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  usedByPlayer: integer("used_by_player").references(() => players.id),
});

export const loginLinks = pgTable("login_links", {
  id: serial("id").primaryKey(),
  token: text("token").unique().notNull(),
  playerId: integer("player_id").references(() => players.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const weeks = pgTable("weeks", {
  id: serial("id").primaryKey(),
  weekNumber: integer("week_number").unique().notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  type: text("type").notNull(), // 'competition' or 'collaboration'
  soloChallengeId: integer("solo_challenge_id").references(() => challenges.id),
  secondChallengeId: integer("second_challenge_id").references(() => challenges.id),
  isLocked: boolean("is_locked").default(false).notNull(),
});

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  title: text("title").unique().notNull(),
  description: text("description").notNull(),
  track: text("track").notNull(), // 'solo', 'competitive', 'collaborative'
  dataType: text("data_type"), // 'time_mmss', 'distance_km', 'count', 'weight_kg', 'boolean', null
  targetValue: real("target_value"),
  difficulty: text("difficulty").default("normal").notNull(), // 'normal', 'hard', 'epic'
  phase: text("phase").notNull(), // 'foundation', 'building', 'peak', 'taper', 'any'
  submittedBy: integer("submitted_by").references(() => players.id),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => players.id).notNull(),
  weekId: integer("week_id").references(() => weeks.id).notNull(),
  kmRun: real("km_run").notNull(),
  runsCount: integer("runs_count").notNull(),
  gymSessions: integer("gym_sessions").notNull(),
  soloChallengeDone: boolean("solo_challenge_done").notNull(),
  secondChallengeResult: real("second_challenge_result"),
  secondChallengeAttempted: boolean("second_challenge_attempted").default(true).notNull(),
  hypeVoteFor: integer("hype_vote_for").references(() => players.id).notNull(),
  prTrialResult: real("pr_trial_result"),
  mtbKm: real("mtb_km"),
  hikingKm: real("hiking_km"),
  swimmingKm: real("swimming_km"),
  ballSportSessions: integer("ball_sport_sessions"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  isLate: boolean("is_late").default(false).notNull(),
}, (table) => [
  unique("unique_player_week").on(table.playerId, table.weekId),
]);

export const prTrials = pgTable("pr_trials", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => players.id).notNull(),
  weekId: integer("week_id").references(() => weeks.id).notNull(),
  declaredWeekId: integer("declared_week_id").references(() => weeks.id).notNull(),
  skill: text("skill").notNull(),
  skillLabel: text("skill_label"),
  previousBest: real("previous_best").notNull(),
  result: real("result"),
  success: boolean("success"),
});

export const baselines = pgTable("baselines", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => players.id).notNull(),
  skill: text("skill").notNull(),
  value: real("value").notNull(),
  setAt: timestamp("set_at").defaultNow().notNull(),
});

export const benchmarkGoals = pgTable("benchmark_goals", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => players.id).notNull(),
  skill: text("skill").notNull(),
  goalValue: real("goal_value").notNull(),
  xpReward: integer("xp_reward").notNull(),
  achieved: boolean("achieved").default(false).notNull(),
  achievedAt: timestamp("achieved_at"),
});

export const hypeVotes = pgTable("hype_votes", {
  id: serial("id").primaryKey(),
  giverId: integer("giver_id").references(() => players.id).notNull(),
  receiverId: integer("receiver_id").references(() => players.id).notNull(),
  weekId: integer("week_id").references(() => weeks.id).notNull(),
}, (table) => [
  unique("unique_vote_giver_week").on(table.giverId, table.weekId),
]);

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => players.id),
  type: text("type").notNull(),
  achievedAt: timestamp("achieved_at").defaultNow().notNull(),
  weekId: integer("week_id").references(() => weeks.id).notNull(),
  value: real("value"),
  celebrated: boolean("celebrated").default(false).notNull(),
});

export const weeklyScores = pgTable("weekly_scores", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => players.id).notNull(),
  weekId: integer("week_id").references(() => weeks.id).notNull(),
  kmPoints: real("km_points").notNull(),
  rankBonus: integer("rank_bonus").notNull(),
  soloChallengePoints: integer("solo_challenge_pts").notNull(),
  secondChallengePoints: integer("second_challenge_pts").notNull(),
  streakBonus: integer("streak_bonus").notNull(),
  shieldPoints: real("shield_pts").notNull(),
  prBonus: integer("pr_bonus").notNull(),
  ontimeBonus: integer("ontime_bonus").notNull(),
  firstSubmissionBonus: integer("first_submission_bonus").default(0).notNull(),
  berserkerMultiplier: real("berserker_multiplier").notNull(),
  totalRaw: real("total_raw").notNull(),
  totalFinal: real("total_final").notNull(),
  xpTotalAfter: real("xp_total_after").notNull(),
  titleAfter: text("title_after").notNull(),
  realmRankWeek: integer("realm_rank_week").notNull(),
}, (table) => [
  unique("unique_score_player_week").on(table.playerId, table.weekId),
]);

export const conquests = pgTable("conquests", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => players.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  xpReward: integer("xp_reward").notNull(),
  isCustom: boolean("is_custom").default(false).notNull(),
  adminApproved: boolean("admin_approved").default(true).notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
});

CREATE TABLE "baselines" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"skill" text NOT NULL,
	"value" real NOT NULL,
	"set_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benchmark_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"skill" text NOT NULL,
	"goal_value" real NOT NULL,
	"xp_reward" integer NOT NULL,
	"achieved" boolean DEFAULT false NOT NULL,
	"achieved_at" timestamp,
	"latest_recorded_value" real
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"track" text NOT NULL,
	"data_type" text,
	"target_value" real,
	"difficulty" text DEFAULT 'normal' NOT NULL,
	"phase" text NOT NULL,
	"submitted_by" integer,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "challenges_title_unique" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE "conquests" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"xp_reward" integer NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"admin_approved" boolean DEFAULT true NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hype_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"giver_id" integer NOT NULL,
	"receiver_id" integer NOT NULL,
	"week_id" integer NOT NULL,
	"message" text,
	CONSTRAINT "unique_vote_giver_week" UNIQUE("giver_id","week_id")
);
--> statement-breakpoint
CREATE TABLE "invite_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"player_slot" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"used_by_player" integer,
	CONSTRAINT "invite_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "login_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"player_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "login_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"type" text NOT NULL,
	"achieved_at" timestamp DEFAULT now() NOT NULL,
	"week_id" integer NOT NULL,
	"value" real,
	"celebrated" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"viking_name" text,
	"pin_hash" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"weekly_km_goal" real,
	"sigil" text,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"catch_up_xp_multiplier" real DEFAULT 1 NOT NULL,
	"catch_up_start_week" integer,
	"catch_up_end_week" integer,
	"buddy_team_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "players_viking_name_unique" UNIQUE("viking_name")
);
--> statement-breakpoint
CREATE TABLE "pr_trials" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"week_id" integer NOT NULL,
	"declared_week_id" integer NOT NULL,
	"skill" text NOT NULL,
	"skill_label" text,
	"previous_best" real NOT NULL,
	"result" real,
	"success" boolean
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"week_id" integer NOT NULL,
	"km_run" real NOT NULL,
	"runs_count" integer NOT NULL,
	"gym_sessions" integer NOT NULL,
	"berserker_gym" boolean DEFAULT false NOT NULL,
	"solo_challenge_done" boolean NOT NULL,
	"second_challenge_result" real,
	"second_challenge_attempted" boolean DEFAULT false NOT NULL,
	"buddy_challenge_done" boolean DEFAULT false NOT NULL,
	"buddy_challenge_result" real,
	"hype_vote_for" integer,
	"pr_trial_result" real,
	"mtb_km" real,
	"hiking_km" real,
	"swimming_km" real,
	"ball_sport_sessions" integer,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"is_late" boolean DEFAULT false NOT NULL,
	CONSTRAINT "unique_player_week" UNIQUE("player_id","week_id")
);
--> statement-breakpoint
CREATE TABLE "weekly_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"week_id" integer NOT NULL,
	"km_points" real NOT NULL,
	"rank_bonus" integer NOT NULL,
	"solo_challenge_pts" integer NOT NULL,
	"second_challenge_pts" integer NOT NULL,
	"streak_bonus" integer NOT NULL,
	"shield_pts" real NOT NULL,
	"pr_bonus" integer NOT NULL,
	"ontime_bonus" integer NOT NULL,
	"first_submission_bonus" integer DEFAULT 0 NOT NULL,
	"forge_bonus" integer DEFAULT 0 NOT NULL,
	"run_bonus" integer DEFAULT 0 NOT NULL,
	"gym_bonus" integer DEFAULT 0 NOT NULL,
	"buddy_challenge_pts" integer DEFAULT 0 NOT NULL,
	"berserker_multiplier" real NOT NULL,
	"catch_up_multiplier" real DEFAULT 1 NOT NULL,
	"total_raw" real NOT NULL,
	"total_final" real NOT NULL,
	"xp_total_after" real NOT NULL,
	"title_after" text NOT NULL,
	"realm_rank_week" integer NOT NULL,
	CONSTRAINT "unique_score_player_week" UNIQUE("player_id","week_id")
);
--> statement-breakpoint
CREATE TABLE "weeks" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_number" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"type" text NOT NULL,
	"solo_challenge_id" integer,
	"second_challenge_id" integer,
	"buddy_challenge_id" integer,
	"is_locked" boolean DEFAULT false NOT NULL,
	CONSTRAINT "weeks_week_number_unique" UNIQUE("week_number")
);
--> statement-breakpoint
ALTER TABLE "baselines" ADD CONSTRAINT "baselines_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benchmark_goals" ADD CONSTRAINT "benchmark_goals_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_submitted_by_players_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conquests" ADD CONSTRAINT "conquests_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hype_votes" ADD CONSTRAINT "hype_votes_giver_id_players_id_fk" FOREIGN KEY ("giver_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hype_votes" ADD CONSTRAINT "hype_votes_receiver_id_players_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hype_votes" ADD CONSTRAINT "hype_votes_week_id_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weeks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_used_by_player_players_id_fk" FOREIGN KEY ("used_by_player") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_links" ADD CONSTRAINT "login_links_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_week_id_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weeks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_trials" ADD CONSTRAINT "pr_trials_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_trials" ADD CONSTRAINT "pr_trials_week_id_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weeks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_trials" ADD CONSTRAINT "pr_trials_declared_week_id_weeks_id_fk" FOREIGN KEY ("declared_week_id") REFERENCES "public"."weeks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_week_id_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weeks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_hype_vote_for_players_id_fk" FOREIGN KEY ("hype_vote_for") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_scores" ADD CONSTRAINT "weekly_scores_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_scores" ADD CONSTRAINT "weekly_scores_week_id_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weeks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weeks" ADD CONSTRAINT "weeks_solo_challenge_id_challenges_id_fk" FOREIGN KEY ("solo_challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weeks" ADD CONSTRAINT "weeks_second_challenge_id_challenges_id_fk" FOREIGN KEY ("second_challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weeks" ADD CONSTRAINT "weeks_buddy_challenge_id_challenges_id_fk" FOREIGN KEY ("buddy_challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;
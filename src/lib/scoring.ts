import { db } from "@/db";
import {
  submissions,
  weeklyScores,
  weeks,
  players,
  hypeVotes,
  prTrials,
  challenges,
  milestones,
  conquests,
} from "@/db/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import {
  RANK_BONUSES,
  COMPETITIVE_BONUSES,
  COLLABORATIVE_BONUS,
  SHIELD_BONUS_PCT,
  PR_BONUS,
  ONTIME_BONUS,
  FORGE_BONUS,
  SKALD_BONUS,
  STREAK_BONUS_PER_WEEK,
  STREAK_BONUS_CAP,
  BERSERKER_MULTIPLIER,
  KM_XP_RATE,
  RUN_BONUS,
  GYM_BONUS,
  DIFFICULTY_POINTS,
  BUDDY_DIFFICULTY_POINTS,
  BUDDY_COMPETITIVE_BONUSES,
  CONSOLIDATION_WEEKS,
  BACKOFF_WEEK,
  PRE_HOLD_BONUS,
  HOLD_PENALTY,
  FIRST_SUBMISSION_BONUS,
  type Difficulty,
  getTitleForXP,
} from "./constants";

export async function scoreWeek(weekId: number, force = false, groupChallengeOverride?: boolean | null): Promise<{ success: boolean; message: string; detail?: string }> {
  const [week] = await db.select().from(weeks).where(eq(weeks.id, weekId)).limit(1);
  if (!week) return { success: false, message: "Week not found" };
  if (week.isLocked && !force) return { success: false, message: "Week already locked — use rescore to override" };

  const allPlayers = await db.select().from(players).where(eq(players.onboardingComplete, true));
  const weekSubs = await db.select().from(submissions).where(eq(submissions.weekId, weekId));

  // Clear any previous scores for this week (re-run support)
  await db.delete(weeklyScores).where(eq(weeklyScores.weekId, weekId));

  try {

  // STEP 1: Validate submissions
  const subsByPlayer: Record<number, typeof weekSubs[0]> = {};
  for (const sub of weekSubs) {
    subsByPlayer[sub.playerId] = sub;
  }

  // STEP 2: Dynamic km pool — scales with total group km run (gym is flat, not in pool)
  const totalGroupKm = weekSubs.reduce((sum, s) => sum + s.kmRun, 0);
  const dynamicPool = totalGroupKm * KM_XP_RATE;

  const kmPointsMap: Record<number, number> = {};
  for (const p of allPlayers) {
    const sub = subsByPlayer[p.id];
    if (!sub || totalGroupKm === 0) {
      kmPointsMap[p.id] = 0;
    } else {
      kmPointsMap[p.id] = Math.round((sub.kmRun / totalGroupKm) * dynamicPool * 10) / 10;
    }
  }

  // STEP 2b: Flat activity bonuses — +10 per run, +10 per gym session
  const runBonusMap: Record<number, number> = {};
  const gymBonusMap: Record<number, number> = {};
  for (const p of allPlayers) {
    const sub = subsByPlayer[p.id];
    runBonusMap[p.id] = sub ? sub.runsCount * RUN_BONUS : 0;
    gymBonusMap[p.id] = sub ? sub.gymSessions * GYM_BONUS : 0;
  }

  // STEP 3: Weekly realm ranks (by km, tiebreak by runs then gym)
  const ranked = allPlayers
    .map((p) => {
      const sub = subsByPlayer[p.id];
      return {
        playerId: p.id,
        km: sub?.kmRun || 0,
        runs: sub?.runsCount || 0,
        gym: sub?.gymSessions || 0,
      };
    })
    .sort((a, b) => {
      if (b.km !== a.km) return b.km - a.km;
      if (b.runs !== a.runs) return b.runs - a.runs;
      return b.gym - a.gym;
    });

  const rankMap: Record<number, number> = {};
  ranked.forEach((r, i) => {
    // Tie handling: players with identical stats share the same rank
    let tieRank = i;
    for (let j = i - 1; j >= 0; j--) {
      if (ranked[j].km === r.km && ranked[j].runs === r.runs && ranked[j].gym === r.gym) {
        tieRank = j;
      } else break;
    }
    rankMap[r.playerId] = tieRank + 1;
  });

  // STEP 4: Rank bonus
  const rankBonusMap: Record<number, number> = {};
  for (const p of allPlayers) {
    const rank = rankMap[p.id] || 6;
    rankBonusMap[p.id] = RANK_BONUSES[Math.min(rank - 1, 5)];
  }

  // STEP 5: Challenge points
  let soloChallenge = null;
  let secondChallenge = null;
  if (week.soloChallengeId) {
    const [c] = await db.select().from(challenges).where(eq(challenges.id, week.soloChallengeId)).limit(1);
    soloChallenge = c;
  }
  if (week.secondChallengeId) {
    const [c] = await db.select().from(challenges).where(eq(challenges.id, week.secondChallengeId)).limit(1);
    secondChallenge = c;
  }

  const soloPtsMap: Record<number, number> = {};
  const secondPtsMap: Record<number, number> = {};

  const soloDiff = ((soloChallenge?.difficulty || "normal") as Difficulty);
  const secondDiff = ((secondChallenge?.difficulty || "normal") as Difficulty);

  for (const p of allPlayers) {
    const sub = subsByPlayer[p.id];
    // Only award solo points when a solo challenge is actually assigned to this week
    soloPtsMap[p.id] = soloChallenge && sub?.soloChallengeDone ? DIFFICULTY_POINTS[soloDiff].solo : 0;
    secondPtsMap[p.id] = 0;
  }

  if (secondChallenge && week.type === "competition") {
    const competitiveResults = allPlayers
      .map((p) => {
        const sub = subsByPlayer[p.id];
        const attempted = sub?.secondChallengeAttempted !== false;
        let result: number | null = null;
        if (attempted && sub) {
          if (sub.secondChallengeResult != null) {
            result = sub.secondChallengeResult;
          } else if (secondChallenge.dataType === "count") {
            const title = (secondChallenge.title || "").toLowerCase();
            if (title.includes("gym")) {
              result = sub.gymSessions ?? null;
            } else {
              result = sub.runsCount ?? null;
            }
          }
        }
        return { playerId: p.id, result, attempted };
      })
      .sort((a, b) => {
        if (a.result === null && b.result === null) return 0;
        if (a.result === null) return 1;
        if (b.result === null) return -1;
        if (secondChallenge!.dataType === "time_mmss") return a.result - b.result;
        return b.result - a.result;
      });

    // Award bonuses with proper tie handling — tied results share the best rank's bonus
    competitiveResults.forEach((r, i) => {
      if (r.result === null) return;
      let tieRank = i;
      for (let j = i - 1; j >= 0; j--) {
        if (competitiveResults[j].result === r.result) tieRank = j;
        else break;
      }
      secondPtsMap[r.playerId] = COMPETITIVE_BONUSES[Math.min(tieRank, 5)];
    });
  }

  if (secondChallenge && week.type === "collaboration") {
    const allSubmitted = allPlayers.every((p) => subsByPlayer[p.id]);
    let groupMet = false;

    if (groupChallengeOverride === true) {
      groupMet = true;
    } else if (groupChallengeOverride === false) {
      groupMet = false;
    } else if (!allSubmitted) {
      groupMet = false;
    } else if (secondChallenge.dataType === "boolean") {
      const title = (secondChallenge.title || "").toLowerCase();
      if ((title.includes("run") || title.includes("log a run")) && !title.includes("10k") && !title.includes("21k")) {
        groupMet = allPlayers.every((p) => (subsByPlayer[p.id]?.runsCount ?? 0) >= 1);
      } else if (title.includes("gym")) {
        groupMet = allPlayers.every((p) => (subsByPlayer[p.id]?.gymSessions ?? 0) >= 1);
      } else if (title.includes("submit") || title.includes("on time")) {
        groupMet = weekSubs.every((s) => !s.isLate);
      } else if (title.includes("10k") || title.includes("10 k")) {
        groupMet = allPlayers.every((p) => (subsByPlayer[p.id]?.secondChallengeResult ?? 0) >= 10);
      } else {
        groupMet = allPlayers.every((p) => subsByPlayer[p.id]?.secondChallengeAttempted === true);
      }
    } else if (secondChallenge.dataType === "distance_km" && secondChallenge.targetValue) {
      groupMet = totalGroupKm >= secondChallenge.targetValue;
    } else if (secondChallenge.targetValue) {
      const total = weekSubs.reduce((sum, s) => sum + (s.secondChallengeResult || 0), 0);
      groupMet = total >= secondChallenge.targetValue;
    }

    if (groupMet) {
      for (const p of allPlayers) {
        if (subsByPlayer[p.id]) {
          secondPtsMap[p.id] = DIFFICULTY_POINTS[secondDiff].group;
        }
      }
    }
  }
  const groupXpPerPlayer = Object.values(secondPtsMap).find(v => v > 0) ?? 0;

  // STEP 5b: Buddy challenge points
  let buddyChallenge = null;
  if (week.buddyChallengeId) {
    const [c] = await db.select().from(challenges).where(eq(challenges.id, week.buddyChallengeId)).limit(1);
    buddyChallenge = c;
  }

  const buddyPtsMap: Record<number, number> = {};
  for (const p of allPlayers) {
    buddyPtsMap[p.id] = 0;
  }

  if (buddyChallenge) {
    const buddyDiff = (buddyChallenge.difficulty || "normal") as Difficulty;

    if (buddyChallenge.dataType === "boolean") {
      // Binary buddy challenge: flat XP if done
      for (const p of allPlayers) {
        const sub = subsByPlayer[p.id];
        buddyPtsMap[p.id] = sub?.buddyChallengeDone ? BUDDY_DIFFICULTY_POINTS[buddyDiff] : 0;
      }
    } else {
      // Ranking buddy challenge: group by team, rank teams, award tiered XP
      const teamResults: Record<number, { teamId: number; result: number | null; playerIds: number[] }> = {};

      for (const p of allPlayers) {
        const teamId = p.buddyTeamId;
        if (!teamId) continue;
        const sub = subsByPlayer[p.id];
        if (!teamResults[teamId]) {
          teamResults[teamId] = { teamId, result: null, playerIds: [] };
        }
        teamResults[teamId].playerIds.push(p.id);
        // Take first non-null result from any team member
        if (teamResults[teamId].result === null && sub?.buddyChallengeResult != null) {
          teamResults[teamId].result = sub.buddyChallengeResult;
        }
      }

      const rankedTeams = Object.values(teamResults)
        .sort((a, b) => {
          if (a.result === null && b.result === null) return 0;
          if (a.result === null) return 1;
          if (b.result === null) return -1;
          // For time-based: lower is better; otherwise higher is better
          if (buddyChallenge!.dataType === "time_mmss") return a.result - b.result;
          return b.result - a.result;
        });

      rankedTeams.forEach((team, i) => {
        if (team.result === null) return;
        // Tie handling: tied results share the best rank's bonus
        let tieRank = i;
        for (let j = i - 1; j >= 0; j--) {
          if (rankedTeams[j].result === team.result) tieRank = j;
          else break;
        }
        const bonus = BUDDY_COMPETITIVE_BONUSES[Math.min(tieRank, 5)];
        for (const pid of team.playerIds) {
          buddyPtsMap[pid] = bonus;
        }
      });
    }
  }

  // STEP 6: Streak bonus — consecutive weekly submissions
  const streakMap: Record<number, number> = {};
  for (const p of allPlayers) {
    const sub = subsByPlayer[p.id];
    if (!sub) {
      streakMap[p.id] = 0;
      continue;
    }

    let streak = 1;
    let checkWeekNum = week.weekNumber - 1;
    while (checkWeekNum >= 1) {
      const [prevWeek] = await db
        .select()
        .from(weeks)
        .where(eq(weeks.weekNumber, checkWeekNum))
        .limit(1);
      if (!prevWeek) break;

      const [prevSub] = await db
        .select()
        .from(submissions)
        .where(and(eq(submissions.playerId, p.id), eq(submissions.weekId, prevWeek.id)))
        .limit(1);

      if (!prevSub) break;
      streak++;
      checkWeekNum--;
    }

    streakMap[p.id] = Math.min(streak * STREAK_BONUS_PER_WEEK, STREAK_BONUS_CAP);
  }

  // STEP 7: PR trial bonus
  const weekTrials = await db
    .select()
    .from(prTrials)
    .where(and(eq(prTrials.weekId, weekId)));
  const prMap: Record<number, number> = {};
  for (const p of allPlayers) {
    const trial = weekTrials.find((t) => t.playerId === p.id && t.success === true);
    prMap[p.id] = trial ? PR_BONUS : 0;
  }

  // STEP 9: On-time bonus
  const ontimeMap: Record<number, number> = {};
  for (const p of allPlayers) {
    const sub = subsByPlayer[p.id];
    ontimeMap[p.id] = sub && !sub.isLate ? ONTIME_BONUS : 0;
  }

  // STEP 9b: Berserker's Forge — hard gym session tagged (+50% workout value)
  const forgeMap: Record<number, number> = {};
  for (const p of allPlayers) {
    const sub = subsByPlayer[p.id];
    forgeMap[p.id] = sub?.berserkerGym ? FORGE_BONUS : 0;
  }

  // STEP 10: Shield points — 5% of pre-shield raw XP per shield received (scales with total effort)
  const weekVotes = await db.select().from(hypeVotes).where(eq(hypeVotes.weekId, weekId));
  const shieldMap: Record<number, number> = {};
  for (const p of allPlayers) {
    const received = weekVotes.filter((v) => v.receiverId === p.id).length;
    const preShieldRaw =
      kmPointsMap[p.id] +
      runBonusMap[p.id] +
      gymBonusMap[p.id] +
      rankBonusMap[p.id] +
      soloPtsMap[p.id] +
      secondPtsMap[p.id] +
      buddyPtsMap[p.id] +
      streakMap[p.id] +
      prMap[p.id] +
      ontimeMap[p.id] +
      forgeMap[p.id];
    shieldMap[p.id] = Math.round(preShieldRaw * SHIELD_BONUS_PCT * received * 10) / 10;
  }

  // STEP 11: Berserker check
  const berserkerMap: Record<number, number> = {};
  for (const p of allPlayers) {
    berserkerMap[p.id] = 1.0;

    if (week.weekNumber < 3) continue;

    const prevScores = await db
      .select()
      .from(weeklyScores)
      .innerJoin(weeks, eq(weeklyScores.weekId, weeks.id))
      .where(
        and(
          eq(weeklyScores.playerId, p.id),
          sql`${weeks.weekNumber} >= ${week.weekNumber - 2}`,
          sql`${weeks.weekNumber} < ${week.weekNumber}`
        )
      )
      .orderBy(desc(weeks.weekNumber))
      .limit(2);

    if (prevScores.length === 2 && prevScores.every((s) => s.weekly_scores.realmRankWeek >= 6)) {
      berserkerMap[p.id] = BERSERKER_MULTIPLIER;
    }
  }

  // STEP 11 & 12: Final score, cumulative XP, title
  for (const p of allPlayers) {
    const allPrevScores = await db
      .select({ totalFinal: weeklyScores.totalFinal })
      .from(weeklyScores)
      .innerJoin(weeks, eq(weeklyScores.weekId, weeks.id))
      .where(and(eq(weeklyScores.playerId, p.id), sql`${weeks.weekNumber} < ${week.weekNumber}`));
    const prevWeeklyXp = allPrevScores.reduce((sum, s) => sum + s.totalFinal, 0);

    const hasSubmission = !!subsByPlayer[p.id];
    const isFirstEverSubmission = hasSubmission && allPrevScores.length === 0;
    const firstBonus = isFirstEverSubmission ? FIRST_SUBMISSION_BONUS : 0;

    const totalRaw =
      kmPointsMap[p.id] +
      runBonusMap[p.id] +
      gymBonusMap[p.id] +
      rankBonusMap[p.id] +
      soloPtsMap[p.id] +
      secondPtsMap[p.id] +
      buddyPtsMap[p.id] +
      streakMap[p.id] +
      shieldMap[p.id] +
      prMap[p.id] +
      ontimeMap[p.id] +
      forgeMap[p.id] +
      firstBonus;

    // Hold/deload week multiplier: -25% during hold weeks, +50% the week before
    // First-submission bonus is applied flat outside the multiplier so it always guarantees level-up
    const rawWithoutFirst =
      kmPointsMap[p.id] +
      runBonusMap[p.id] +
      gymBonusMap[p.id] +
      rankBonusMap[p.id] +
      soloPtsMap[p.id] +
      secondPtsMap[p.id] +
      buddyPtsMap[p.id] +
      streakMap[p.id] +
      shieldMap[p.id] +
      prMap[p.id] +
      ontimeMap[p.id] +
      forgeMap[p.id];

    let weekMultiplier = 1.0;
    const wn = week.weekNumber;
    const isHoldWeek = (CONSOLIDATION_WEEKS as readonly number[]).includes(wn) || wn === BACKOFF_WEEK;
    const isPreHoldWeek = (CONSOLIDATION_WEEKS as readonly number[]).includes(wn + 1) || wn + 1 === BACKOFF_WEEK;
    if (isHoldWeek) {
      weekMultiplier = HOLD_PENALTY;
    } else if (isPreHoldWeek) {
      weekMultiplier = PRE_HOLD_BONUS;
    }

    let catchUpMult = 1;
    const cuM = Number(p.catchUpXpMultiplier ?? 1);
    const cuStart = p.catchUpStartWeek;
    const cuEnd = p.catchUpEndWeek;
    if (cuM > 1 && cuStart != null && cuEnd != null && wn >= cuStart && wn <= cuEnd) {
      catchUpMult = cuM;
    }

    const totalFinal = Math.round(
      (rawWithoutFirst * berserkerMap[p.id] * weekMultiplier * catchUpMult + firstBonus) * 10
    ) / 10;

    // Cumulative XP from scratch — rescore-safe; conquest XP can't be lost by re-running
    const completedConquests = await db
      .select({ xpReward: conquests.xpReward })
      .from(conquests)
      .where(and(eq(conquests.playerId, p.id), eq(conquests.completed, true)));
    const conquestXp = completedConquests.reduce((sum, c) => sum + c.xpReward, 0);

    const newXp = prevWeeklyXp + conquestXp + totalFinal;
    const title = getTitleForXP(newXp);

    await db.insert(weeklyScores).values({
      playerId: p.id,
      weekId,
      kmPoints: Math.round(kmPointsMap[p.id] * 10) / 10,
      rankBonus: rankBonusMap[p.id],
      soloChallengePoints: soloPtsMap[p.id],
      secondChallengePoints: secondPtsMap[p.id],
      buddyChallengePoints: buddyPtsMap[p.id],
      streakBonus: streakMap[p.id],
      shieldPoints: shieldMap[p.id],
      prBonus: prMap[p.id],
      ontimeBonus: ontimeMap[p.id],
      firstSubmissionBonus: firstBonus,
      forgeBonus: forgeMap[p.id],
      runBonus: runBonusMap[p.id],
      gymBonus: gymBonusMap[p.id],
      berserkerMultiplier: berserkerMap[p.id],
      catchUpMultiplier: catchUpMult,
      totalRaw: Math.round(totalRaw * 10) / 10,
      totalFinal,
      xpTotalAfter: Math.round(newXp * 10) / 10,
      titleAfter: title.name,
      realmRankWeek: rankMap[p.id] || 6,
    });
  }

  // STEP 13: Detect milestones
  await detectMilestones(weekId, week.weekNumber, allPlayers, subsByPlayer);

  // STEP 14: Skald check (monthly)
  await checkSkald(weekId, week);

  // STEP 15: Lock the week
  await db.update(weeks).set({ isLocked: true }).where(eq(weeks.id, weekId));

  const groupLine = secondChallenge && week.type === "collaboration"
    ? groupXpPerPlayer > 0
      ? `Group challenge: PASSED (+${groupXpPerPlayer} XP each).`
      : `Group challenge: FAILED (0 XP).`
    : null;

  const detail = [
    `${allPlayers.filter(p => subsByPlayer[p.id]).length}/${allPlayers.length} players scored.`,
    groupLine,
  ].filter(Boolean).join(" ");

  return { success: true, message: `Week ${week.weekNumber} scored and locked.`, detail };

  } catch (err) {
    // Roll back partial writes so the admin can safely re-run scoring
    await db.delete(weeklyScores).where(eq(weeklyScores.weekId, weekId)).catch(() => {});
    const message = err instanceof Error ? err.message : "Unknown scoring error";
    return { success: false, message: `Scoring failed (rolled back): ${message}` };
  }
}

async function detectMilestones(
  weekId: number,
  weekNumber: number,
  allPlayers: { id: number }[],
  subsByPlayer: Record<number, { kmRun: number; runsCount: number; gymSessions: number }>
) {
  const kmMilestones = [
    { type: "first_20km_week", threshold: 20, label: "week" },
    { type: "first_30km_week", threshold: 30, label: "week" },
    { type: "first_40km_week", threshold: 40, label: "week" },
  ];

  for (const p of allPlayers) {
    const sub = subsByPlayer[p.id];
    if (!sub) continue;

    for (const m of kmMilestones) {
      if (sub.kmRun >= m.threshold) {
        const existing = await db
          .select()
          .from(milestones)
          .where(and(eq(milestones.playerId, p.id), eq(milestones.type, m.type)))
          .limit(1);
        if (existing.length === 0) {
          await db.insert(milestones).values({
            playerId: p.id,
            type: m.type,
            weekId,
            value: sub.kmRun,
            celebrated: false,
          });
        }
      }
    }
  }

  // Group milestones
  const totalGroupKm = Object.values(subsByPlayer).reduce((sum, s) => sum + s.kmRun, 0);

  const groupKmMilestones = [
    { type: "group_100km_week", threshold: 100 },
  ];

  for (const m of groupKmMilestones) {
    if (totalGroupKm >= m.threshold) {
      const existing = await db
        .select()
        .from(milestones)
        .where(and(eq(milestones.type, m.type), eq(milestones.weekId, weekId)))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(milestones).values({
          playerId: null,
          type: m.type,
          weekId,
          value: totalGroupKm,
          celebrated: false,
        });
      }
    }
  }

  // Check cumulative group km
  const allSubs = await db.select({ km: submissions.kmRun }).from(submissions);
  const cumulativeKm = allSubs.reduce((sum, s) => sum + s.km, 0);

  const cumulativeMilestones = [
    { type: "group_500km_total", threshold: 500 },
    { type: "group_1000km_total", threshold: 1000 },
  ];

  for (const m of cumulativeMilestones) {
    if (cumulativeKm >= m.threshold) {
      const existing = await db
        .select()
        .from(milestones)
        .where(eq(milestones.type, m.type))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(milestones).values({
          playerId: null,
          type: m.type,
          weekId,
          value: cumulativeKm,
          celebrated: false,
        });
      }
    }
  }

  // All Vikings hit 10km in the same week
  const allHit10 = allPlayers.every((p) => {
    const sub = subsByPlayer[p.id];
    return sub && sub.kmRun >= 10;
  });
  if (allHit10) {
    const existing = await db
      .select()
      .from(milestones)
      .where(and(eq(milestones.type, "all_vikings_10km_week"), eq(milestones.weekId, weekId)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(milestones).values({
        playerId: null,
        type: "all_vikings_10km_week",
        weekId,
        value: null,
        celebrated: false,
      });
    }
  }
}

async function checkSkald(weekId: number, week: typeof weeks.$inferSelect) {
  const endDate = new Date(week.endDate);
  const endMonth = endDate.getMonth();
  const endYear = endDate.getFullYear();

  // Check if this is the last week ending in this calendar month
  const [nextWeek] = await db
    .select()
    .from(weeks)
    .where(eq(weeks.weekNumber, week.weekNumber + 1))
    .limit(1);

  if (nextWeek) {
    const nextEnd = new Date(nextWeek.endDate);
    if (nextEnd.getMonth() === endMonth && nextEnd.getFullYear() === endYear) {
      return; // Not the last week of the month
    }
  }

  // Get all weeks in this month
  const monthWeeks = await db
    .select()
    .from(weeks)
    .where(
      sql`extract(month from ${weeks.endDate}::date) = ${endMonth + 1}
          AND extract(year from ${weeks.endDate}::date) = ${endYear}`
    );

  const monthWeekIds = monthWeeks.map((w) => w.id);
  if (monthWeekIds.length === 0) return;

  const votes = await db
    .select()
    .from(hypeVotes)
    .where(inArray(hypeVotes.weekId, monthWeekIds));

  const voteCountsByReceiver: Record<number, number> = {};
  votes.forEach((v) => {
    voteCountsByReceiver[v.receiverId] = (voteCountsByReceiver[v.receiverId] || 0) + 1;
  });

  let maxVotes = 0;
  let skaldPlayerId: number | null = null;
  for (const [pid, count] of Object.entries(voteCountsByReceiver)) {
    if (count > maxVotes) {
      maxVotes = count;
      skaldPlayerId = Number(pid);
    }
  }

  if (skaldPlayerId) {
    const [existingScore] = await db
      .select()
      .from(weeklyScores)
      .where(and(eq(weeklyScores.playerId, skaldPlayerId), eq(weeklyScores.weekId, weekId)))
      .limit(1);

    if (existingScore) {
      await db
        .update(weeklyScores)
        .set({
          totalFinal: existingScore.totalFinal + SKALD_BONUS,
          xpTotalAfter: existingScore.xpTotalAfter + SKALD_BONUS,
        })
        .where(eq(weeklyScores.id, existingScore.id));
    }

    const existingSkald = await db
      .select()
      .from(milestones)
      .where(and(eq(milestones.playerId, skaldPlayerId), eq(milestones.type, "skald_monthly"), eq(milestones.weekId, weekId)))
      .limit(1);
    if (existingSkald.length === 0) {
      await db.insert(milestones).values({
        playerId: skaldPlayerId,
        type: "skald_monthly",
        weekId,
        value: maxVotes,
        celebrated: false,
      });
    }
  }
}

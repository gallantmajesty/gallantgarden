// XP Engine — centralized award logic with anti-spam / daily cap protection.
//
// Two currencies:
//   leaves (regular XP / green)  — earned from real study + engagement
//                                 (rooms, train, library, streaks, tasks).
//                                 The F2P earn-and-spend track.
//   golden_leaves (premium XP)   — real-money purchases ONLY (+ tiny rank-up
//                                 trickle). NEVER handed out free for daily
//                                 engagement, streaks, or achievements.
//
// Leaves are SPENDABLE currency (like CoC gold coins), earned mainly from
// study time: focus sessions, train journeys, and library.
// Task Magnet (tasks, habits, milestones) awards NO base leaves — prevents
// farming; only the daily all-tasks-done bonus and consistency reward green.
//
// Golden leaves are strictly premium: Stripe/golden purchases and the rank-up
// trickle. See awardGoldenLeaves.
//
// Anti-spam measures:
//   1. Focus XP only awarded for visible-tab time (enforced upstream)
//   2. Soft daily diminishing returns (DAILY_CAPS) on focus earnings
//   3. No hard cap on focus — it requires real time commitment

import { supabase } from './supabase'
import { rankForTotalXp } from './ranks'
import { getOverride } from './ownerOverrides'

// ---- XP values per action ---------------------------------------------------
// Tasks/habits/milestones award 0 — leaves are study-only currency
export const XP_VALUES = {
  task: 0,
  focusMin: 1.32, // ~33 leaves per 25 min session (5hrs = 400 leaves = Epic skin)
  habit: 0,
  milestone: 0,
  tree: 15,
  note: 10,
  dailyLogin: 5,
  journeyMin: 1.45,

  // Premium XP — golden leaves, purchases ONLY + rank-up trickle. Never free
  // engagement (see header). The rank-up trickle lets F2P taste the premium
  // shop without enabling repeated purchases.
  rankUp: 30,

  // Daily engagement (GREEN)
  dailyTaskComplete: 10,
  perfectDay: 30,

  // Study quality (GREEN)
  hrLibraryFocus: 15,
  noTabCloseLibrary: 10,
  deepWork: 20,
  libraryStudy: 8,

  // Streaks & consistency (GREEN)
  weeklyWarrior: 25,
  streak7: 50,
  streak30: 200,

  // Exploration (GREEN)
  multiModeDay: 15,
  earlyBird: 10,
  nightOwl: 10,
  marathonScholar: 15,

  // Social (GREEN)
  socialStudy: 8,

  // Milestones (one-time, GREEN)
  firstBlueprint: 20,
  firstTree: 10,
  blueprintMaster: 12,

  // Train journeys: extra GREEN per completed journey (beyond journeyMin).
  journeyPremium: 20,

// Inactivity penalty — deducted when daily focus < threshold (costs rank drops)
  inactivityPenalty: 200,
  inactivityThresholdMin: 20,
} as const

// Pomodoro session rewards — the main study currency engine
// Epic skin = 400 leaves = ~5 hours (12 × 25min sessions)
// Legendary skin = 2000 leaves = ~25 hours (60 × 25min sessions)
export const POMO_REWARDS = {
  // Base leaves per minute of study (33 leaves / 25 min = 1.32)
  basePerMin: 1.32,
  // Bonus: no tab switching during focus (deep work quality)
  noTabBonusPct: 0.30, // +30% of base
  // Bonus: subject tag entered
  subjectBonusFlat: 5,
} as const

/** Calculate leaves earned for a pomodoro session. */
export function calcPomoLeaves(
  durationMin: number,
  tabAlwaysVisible: boolean,
  hasSubject: boolean,
): { base: number; noTabBonus: number; subjectBonus: number; total: number } {
  const basePerMin = getOverride('pomoRewards', 'basePerMin', POMO_REWARDS.basePerMin)
  const noTabBonusPct = getOverride('pomoRewards', 'noTabBonusPct', POMO_REWARDS.noTabBonusPct)
  const subjectBonusFlat = getOverride('pomoRewards', 'subjectBonusFlat', POMO_REWARDS.subjectBonusFlat)
  const base = Math.round(durationMin * basePerMin)
  const noTabBonus = tabAlwaysVisible ? Math.round(base * noTabBonusPct) : 0
  const subjectBonus = hasSubject ? subjectBonusFlat : 0
  return { base, noTabBonus, subjectBonus, total: base + noTabBonus + subjectBonus }
}

// ---- Daily earning tiers (anti-spam, no hard stop) ---------------------------
export const DAILY_CAPS = {
  total: 999,
  /** Soft diminishing tiers (minutes of active earning per day). Real study is
   *  never hard-capped — the rate just eases so grinding bots can't flood the
   *  economy while genuine students still earn full value. */
  tier1MaxMin: 60, //   0–60  min → 100% rate
  tier2MaxMin: 120, // 60–120 min →  50% rate
  tier3Rate: 0.25, // 120+     min →  25% rate forever
  /** UI compatibility — "full-rate" minutes shown in cap meters. */
  activeMinCap: 120,
} as const

// Streak-tier XP multipliers applied to the focus-time base (retention hook).
// Higher streaks make existing study worth more — not a path to farm.
export const STREAK_XP_TIERS: { minDays: number; mult: number }[] = [
  { minDays: 90, mult: 1.5 },
  { minDays: 30, mult: 1.25 },
  { minDays: 7, mult: 1.1 },
]

/** Best streak multiplier for a streak length (>=1, else 1). */
export function streakXpMultiplier(streakDays: number): number {
  const tiers = getOverride('streakTiers', 'tiers', STREAK_XP_TIERS)
  for (const t of tiers) {
    if (streakDays >= t.minDays) return t.mult
  }
  return 1
}

// Focus minutes and train journeys are NOT capped — they require real time.
// Train journeys have soft diminishing returns tracked below.

// ---- Daily tracker -----------------------------------------------------------
interface DailyRecord {
  date: string
  journeyMinutes: number
  /** engagement flags — reset each day */
  loginAwarded: boolean
  modesUsed: Set<string>
  totalFocusMin: number
  dailyTasksCompleted: boolean
  dailyTaskAwarded: boolean
  focusSessionCount: number
  blueprintsCreated: number
  firstTreeAwarded: boolean
  firstBlueprintAwarded: boolean
  /** timestamp of last recorded activity (ISO ms) */
  lastActive: number
  /** whether the inactivity penalty has been applied today */
  penaltyApplied: boolean
  /** whether the penalty notification panel has already been shown to the user */
  penaltyPanelShown: boolean
  /** active XP-earning minutes today (capped at DAILY_CAPS.activeMinCap) */
  activeMinToday: number
}

const DAILY_KEY = 'sf.xp.daily'

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadDaily(): DailyRecord {
  try {
    const raw = localStorage.getItem(DAILY_KEY)
    if (!raw) return freshDaily()
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (parsed.date !== todayStr()) return freshDaily()
    // Deserialize modesUsed from array
    const modes = Array.isArray(parsed.modesUsed) ? parsed.modesUsed : []
    return {
      date: parsed.date as string,
      journeyMinutes: (parsed.journeyMinutes as number) || 0,
      loginAwarded: (parsed.loginAwarded as boolean) || false,
      modesUsed: new Set(modes as string[]),
      totalFocusMin: (parsed.totalFocusMin as number) || 0,
      dailyTasksCompleted: (parsed.dailyTasksCompleted as boolean) || false,
      dailyTaskAwarded: (parsed.dailyTaskAwarded as boolean) || false,
      focusSessionCount: (parsed.focusSessionCount as number) || 0,
      blueprintsCreated: (parsed.blueprintsCreated as number) || 0,
      firstTreeAwarded: (parsed.firstTreeAwarded as boolean) || false,
      firstBlueprintAwarded: (parsed.firstBlueprintAwarded as boolean) || false,
  lastActive: (parsed.lastActive as number) || 0,
  penaltyApplied: (parsed.penaltyApplied as boolean) || false,
  penaltyPanelShown: (parsed.penaltyPanelShown as boolean) || false,
  activeMinToday: (parsed.activeMinToday as number) || 0,
    }
  } catch {
    return freshDaily()
  }
}

function freshDaily(): DailyRecord {
  return {
    date: todayStr(),
    journeyMinutes: 0,
    loginAwarded: false,
    modesUsed: new Set(),
    totalFocusMin: 0,
    dailyTasksCompleted: false,
    dailyTaskAwarded: false,
    focusSessionCount: 0,
    blueprintsCreated: 0,
    firstTreeAwarded: false,
    firstBlueprintAwarded: false,
  lastActive: 0,
  penaltyApplied: false,
  penaltyPanelShown: false,
  activeMinToday: 0,
  }
}

function saveDaily(record: DailyRecord) {
  try {
    const toSave = { ...record, modesUsed: Array.from(record.modesUsed) }
    localStorage.setItem(DAILY_KEY, JSON.stringify(toSave))
  } catch { /* ignore */ }
}

// ---- Activity tracking ----------------------------------------------------

/** Record a user activity event (call on any meaningful interaction). */
export function recordActivity(): void {
  const daily = loadDaily()
  daily.lastActive = Date.now()
  saveDaily(daily)
}

// ---- Inactivity penalty ----------------------------------------------------

/**
 * Check whether the user hit the daily inactivity threshold.
 * Penalty applies when:
 *   - The user has NOT been penalty-protected today (penaltyApplied === false)
 *   - Last recorded activity was more than 1 hour ago AND before today's focus session started
 *   - totalFocusMin today is below the inactivityThresholdMin (60 min)
 *
 * Call at the START of a new day (when the daily record flips).
 * Returns negative leaves if penalty applies.
 */
export function checkInactivityPenalty(
  currentLeaves: number,
  currentGoldenLeaves: number,
  currentRankId: string,
  /** Lifetime rank XP — see awardLeaves. */
  rankXp?: number,
): AwardResult {
  const daily = loadDaily()
  if (daily.penaltyApplied) {
    return { leaves: 0, goldenLeaves: 0, rankChanged: false, newRankId: currentRankId, capped: false, onCooldown: false }
  }

  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000

  // If user was active in the last hour, no penalty.
  if (daily.lastActive > 0 && daily.lastActive >= oneHourAgo) {
    daily.penaltyApplied = true
    saveDaily(daily)
    return { leaves: 0, goldenLeaves: 0, rankChanged: false, newRankId: currentRankId, capped: false, onCooldown: false }
  }

  // If user has never been active today and has zero focus min, no penalty yet —
  // give them a chance to start before the clock runs out.
  if (daily.lastActive === 0 && daily.totalFocusMin === 0) {
    return { leaves: 0, goldenLeaves: 0, rankChanged: false, newRankId: currentRankId, capped: false, onCooldown: false }
  }

  // If user hit the focus threshold, no penalty.
  if (daily.totalFocusMin >= XP_VALUES.inactivityThresholdMin) {
    daily.penaltyApplied = true
    saveDaily(daily)
    return { leaves: 0, goldenLeaves: 0, rankChanged: false, newRankId: currentRankId, capped: false, onCooldown: false }
  }

  // Penalty applies — user was inactive for 1hr+ AND didn't hit focus target.
  daily.penaltyApplied = true
  saveDaily(daily)

  // Deduct directly from rankXp (lifetime) instead of using awardLeaves which
  // clamps to the spendable wallet — an empty wallet would silently skip the
  // penalty. The wallet is also reduced, but rankXp always takes the hit.
  const penalty = XP_VALUES.inactivityPenalty
  const rankBase = rankXp ?? (currentLeaves + currentGoldenLeaves)
  const newRankTotal = rankBase - penalty
  const newRank = rankForTotalXp(newRankTotal)
  const rankChanged = newRank.id !== rankForTotalXp(rankBase).id

  return {
    leaves: -Math.min(currentLeaves, penalty),
    goldenLeaves: 0,
    rankChanged,
    newRankId: newRank.id,
    capped: false,
    onCooldown: false,
  }
}
export interface AwardResult {
  leaves: number
  goldenLeaves: number
  rankChanged: boolean
  newRankId: string
  capped: boolean
  onCooldown: boolean
}

// ---- Award leaves (regular XP) — study sources only --------------------------
export function awardLeaves(
   currentLeaves: number,
   currentGoldenLeaves: number,
   source: 'focus' | 'train' | 'login' | 'tree' | 'note' | 'library',
   baseAmount: number,
   currentRankId: string,
   /** Lifetime rank XP (monotonic, never lowered by spending). Falls back to the
    *  wallet total (leaves + golden) when omitted — backward compatible. */
   rankXp?: number,
   /** Actual study duration in minutes — used for daily cap tracking.
    *  When omitted, falls back to deriving from baseAmount (legacy callers). */
   durationMin?: number,
 ): AwardResult {
   const isPenalty = baseAmount < 0
   let actualLeaves = Math.round(baseAmount)
   let capped = false

    if (!isPenalty && source !== 'login') {
      const daily = loadDaily()

      // Use actual duration for cap tracking (avoids overcounting from multipliers).
      // Legacy callers that don't pass durationMin fall back to the old derivation.
      const activeMinutes = durationMin != null
        ? Math.ceil(durationMin)
        : Math.ceil(baseAmount / (source === 'train' ? XP_VALUES.journeyMin : XP_VALUES.focusMin))

      // Soft diminishing returns — never a hard stop. Real study always earns
      // something: 100% rate first 60 min, 50% next 60 min, 25% after.
      const tier1Max = getOverride('dailyCaps', 'tier1MaxMin', DAILY_CAPS.tier1MaxMin)
      const tier2Max = getOverride('dailyCaps', 'tier2MaxMin', DAILY_CAPS.tier2MaxMin)
      const tier3Rate = getOverride('dailyCaps', 'tier3Rate', DAILY_CAPS.tier3Rate)
      if (daily.activeMinToday >= tier2Max) {
        actualLeaves = Math.round(actualLeaves * tier3Rate)
        capped = true
      } else if (daily.activeMinToday >= tier1Max) {
        actualLeaves = Math.round(actualLeaves * 0.5)
        capped = true
      }

      if (source === 'train') {
        const journaled = daily.journeyMinutes
        if (journaled >= 120) {
          return { leaves: 0, goldenLeaves: 0, rankChanged: false, newRankId: currentRankId, capped: true, onCooldown: false }
        }
        if (journaled >= 60) {
          const overBy = journaled - 60
          const factor = Math.max(0.25, 1 - (overBy / 60) * 0.75)
          actualLeaves = Math.round(actualLeaves * factor)
        }
        daily.journeyMinutes += Math.round(baseAmount / XP_VALUES.journeyMin)
      }

      daily.activeMinToday += activeMinutes
      saveDaily(daily)
    }

   // Prevent leaves from going below 0
   const effectiveLeaves = Math.max(-currentLeaves, actualLeaves)

   // Rank is driven by rankXp (lifetime, never lowered by purchases). Spending
   // leaves no longer demotes the player. Inactivity penalties still lower it
   // (preserves the existing "rank down" behaviour).
   const rankBase = rankXp ?? (currentLeaves + currentGoldenLeaves)
   const newTotal = rankBase + effectiveLeaves
   const newRank = rankForTotalXp(newTotal)
   const rankChanged = newRank.id !== rankForTotalXp(rankBase).id

   return {
     leaves: effectiveLeaves,
     goldenLeaves: 0,
     rankChanged,
     newRankId: newRank.id,
     capped,
     onCooldown: false,
   }
 }

// ---- Focus reward path with multipliers -------------------------------------
// The deep-dive rebalance: subject bonus + first-session-of-day + streak tiers +
// quality (no-forfeit) multiplier, layered on the existing soft daily cap.
export interface FocusAwardInput {
  currentLeaves: number
  currentGoldenLeaves: number
  durationMin: number
  currentRankId: string
  rankXp?: number
  /** subject tag entered — earns a flat green bonus */
  hasSubject?: boolean
  /** active study streak days → tier multiplier (7/30/90) */
  streakDays?: number
  /** session completed without forfeit/leave (>=90% timer) → 1.5× base */
  quality?: boolean
  /** override the per-minute base rate (Medium 2.64 / Hardcore scaled).
   *  Defaults to POMO_REWARDS.basePerMin (1.32). */
  ratePerMin?: number
}

export function awardFocusLeaves(input: FocusAwardInput): AwardResult {
  const rate = input.ratePerMin ?? getOverride('pomoRewards', 'basePerMin', POMO_REWARDS.basePerMin)
  const base = Math.round(input.durationMin * rate)

  let total = base

  // Quality multiplier: completed, no-forfeit focus is worth more.
  if (input.quality) total = Math.round(total * 1.5)

  // Subject bonus (flat) when a subject tag was entered.
  if (input.hasSubject) total += getOverride('pomoRewards', 'subjectBonusFlat', POMO_REWARDS.subjectBonusFlat)

  // Streak-tier multiplier on top.
  total = Math.round(total * streakXpMultiplier(input.streakDays ?? 1))

  // First completed session of the day → +50% (habit hook).
  const daily = loadDaily()
  const firstSession = daily.focusSessionCount === 0
  if (firstSession) total = Math.round(total * 1.5)
  daily.focusSessionCount += 1
  saveDaily(daily)

  return awardLeaves(
    input.currentLeaves,
    input.currentGoldenLeaves,
    'focus',
    total,
    input.currentRankId,
    input.rankXp,
    input.durationMin,
  )
}

// ---- Award golden leaves (premium XP) — never capped, no cooldown -----------
export function awardGoldenLeaves(
  currentLeaves: number,
  currentGoldenLeaves: number,
  baseAmount: number,
  currentRankId: string,
  /** Lifetime rank XP — see awardLeaves. */
  rankXp?: number,
): AwardResult {
  const amount = Math.max(0, Math.round(baseAmount))
  // Rank driven by rankXp (lifetime). Spending goldens never demotes either.
  const rankBase = rankXp ?? (currentLeaves + currentGoldenLeaves)
  const newTotal = rankBase + amount
  const newRank = rankForTotalXp(newTotal)
  const rankChanged = newRank.id !== rankForTotalXp(rankBase).id

  return {
    leaves: 0,
    goldenLeaves: amount,
    rankChanged,
    newRankId: newRank.id,
    capped: false,
    onCooldown: false,
  }
}

// ---- Engagement tracking helpers --------------------------------------------

/** Call on first app open of the day. Awards a small daily GREEN-leaf login bonus.
 *  Golden leaves are premium-only (real-money + rank-up trickle) — never free. */
export function checkDailyLogin(
  currentLeaves: number,
  currentGoldenLeaves: number,
  currentRankId: string,
): AwardResult {
  const daily = loadDaily()
  if (daily.loginAwarded) {
    return { leaves: 0, goldenLeaves: 0, rankChanged: false, newRankId: currentRankId, capped: false, onCooldown: false }
  }
  daily.loginAwarded = true
  saveDaily(daily)
  return awardLeaves(currentLeaves, currentGoldenLeaves, 'login', XP_VALUES.dailyLogin, currentRankId)
}

/** Call when streak hits 7 or 30 days. Awards GREEN leaves (golden is premium-only). */
export function awardStreakMilestone(
  currentLeaves: number,
  currentGoldenLeaves: number,
  streakDays: number,
  currentRankId: string,
): AwardResult {
  if (streakDays === 7) return awardLeaves(currentLeaves, currentGoldenLeaves, 'login', XP_VALUES.streak7, currentRankId)
  if (streakDays === 30) return awardLeaves(currentLeaves, currentGoldenLeaves, 'login', XP_VALUES.streak30, currentRankId)
  return { leaves: 0, goldenLeaves: 0, rankChanged: false, newRankId: currentRankId, capped: false, onCooldown: false }
}

/**
 * Call when a focus session completes.
 * Awards: library study (if in library), 1hr library focus bonus, no-tab-close bonus,
 * deep work bonus, time-of-day bonuses, marathon scholar, mode tracking.
 */
export function awardFocusSessionBonuses(
  currentLeaves: number,
  currentGoldenLeaves: number,
  durationMin: number,
  tabAlwaysVisible: boolean,
  isLibrary: boolean,
  mode: string,
  currentRankId: string,
): { result: AwardResult; bonusAwarded: boolean } {
  const daily = loadDaily()
  let bonusLeaves = 0

  // Track mode usage for multi-mode day
  daily.modesUsed.add(mode)
  daily.totalFocusMin += durationMin
  daily.focusSessionCount += 1

  // Library study session (leaves)
  if (isLibrary) {
    bonusLeaves += XP_VALUES.libraryStudy
  }

  // 1hr Library Focus — library only, 60+ min
  if (isLibrary && durationMin >= 60) {
    bonusLeaves += XP_VALUES.hrLibraryFocus
  }

  // No-Tab-Close Library Focus — library only, tab always visible
  if (isLibrary && tabAlwaysVisible && durationMin >= 25) {
    bonusLeaves += XP_VALUES.noTabCloseLibrary
  }

  // Deep Work Session — any mode, 25+ min, no tab switch
  if (tabAlwaysVisible && durationMin >= 25) {
    bonusLeaves += XP_VALUES.deepWork
  }

  // Time-of-day bonuses
  const hour = new Date().getHours()
  if (hour < 8) bonusLeaves += XP_VALUES.earlyBird
  if (hour >= 22) bonusLeaves += XP_VALUES.nightOwl

  // Marathon Scholar — 3+ total hours in a day
  if (daily.totalFocusMin >= 180) {
    bonusLeaves += XP_VALUES.marathonScholar
  }

  // Multi-Mode Day — 3+ different modes in one day
  if (daily.modesUsed.size >= 3) {
    bonusLeaves += XP_VALUES.multiModeDay
  }

  saveDaily(daily)

  if (bonusLeaves === 0) {
    return { result: awardLeaves(currentLeaves, currentGoldenLeaves, isLibrary ? 'library' : 'focus', 0, currentRankId), bonusAwarded: false }
  }

  // All engagement bonuses are GREEN leaves — golden is purchase + rank-up only.
  const leavesResult = awardLeaves(currentLeaves, currentGoldenLeaves, 'library', bonusLeaves, currentRankId)
  return {
    result: {
      leaves: leavesResult.leaves,
      goldenLeaves: 0,
      rankChanged: leavesResult.rankChanged,
      newRankId: leavesResult.newRankId,
      capped: leavesResult.capped,
      onCooldown: false,
    },
    bonusAwarded: true,
  }
}

/** Call when all due-today tasks are completed. */
export function awardDailyTaskCompletion(
  currentLeaves: number,
  currentGoldenLeaves: number,
  currentRankId: string,
  /** Lifetime rank XP — see awardLeaves. */
  rankXp?: number,
): AwardResult {
  const daily = loadDaily()
  if (daily.dailyTaskAwarded) {
    return { leaves: 0, goldenLeaves: 0, rankChanged: false, newRankId: currentRankId, capped: false, onCooldown: false }
  }
  daily.dailyTasksCompleted = true
  daily.dailyTaskAwarded = true
  saveDaily(daily)

  // Check for Perfect Day (daily tasks + focus + login)
  if (daily.dailyTasksCompleted && daily.totalFocusMin >= XP_VALUES.inactivityThresholdMin && daily.loginAwarded) {
    return awardLeaves(currentLeaves, currentGoldenLeaves, 'login', XP_VALUES.perfectDay, currentRankId)
  }

  return awardLeaves(currentLeaves, currentGoldenLeaves, 'login', XP_VALUES.dailyTaskComplete, currentRankId)
}

/** Call when studying in library with 2+ friends online. */
export function awardSocialStudy(
  currentLeaves: number,
  currentGoldenLeaves: number,
  friendsOnline: number,
  currentRankId: string,
): AwardResult {
  if (friendsOnline < 2) {
    return { leaves: 0, goldenLeaves: 0, rankChanged: false, newRankId: currentRankId, capped: false, onCooldown: false }
  }
  return awardLeaves(currentLeaves, currentGoldenLeaves, 'login', XP_VALUES.socialStudy, currentRankId)
}

/** Call at end of week or when 5th active day is detected. */
export function awardWeeklyWarrior(
  currentLeaves: number,
  currentGoldenLeaves: number,
  daysStudiedThisWeek: number,
  currentRankId: string,
): AwardResult {
  if (daysStudiedThisWeek < 5) {
    return { leaves: 0, goldenLeaves: 0, rankChanged: false, newRankId: currentRankId, capped: false, onCooldown: false }
  }
  // Use localStorage to prevent re-awarding same week
  const weekKey = getWeekKey()
  const awardedKey = `sf.xp.weekly.${weekKey}`
  try {
    if (localStorage.getItem(awardedKey)) {
      return { leaves: 0, goldenLeaves: 0, rankChanged: false, newRankId: currentRankId, capped: false, onCooldown: false }
    }
    localStorage.setItem(awardedKey, '1')
  } catch { /* ignore */ }
  return awardLeaves(currentLeaves, currentGoldenLeaves, 'login', XP_VALUES.weeklyWarrior, currentRankId)
}

/** Call when first tree is planted. */
export function awardFirstTree(
  currentLeaves: number,
  currentGoldenLeaves: number,
  currentRankId: string,
): AwardResult {
  const daily = loadDaily()
  if (daily.firstTreeAwarded) {
    return { leaves: 0, goldenLeaves: 0, rankChanged: false, newRankId: currentRankId, capped: false, onCooldown: false }
  }
  // Check if user has ever planted a tree before (persists across days)
  const everKey = 'sf.xp.ever.firstTree'
  try {
    if (localStorage.getItem(everKey)) {
      return { leaves: 0, goldenLeaves: 0, rankChanged: false, newRankId: currentRankId, capped: false, onCooldown: false }
    }
    localStorage.setItem(everKey, '1')
  } catch { /* ignore */ }
  daily.firstTreeAwarded = true
  saveDaily(daily)
  return awardLeaves(currentLeaves, currentGoldenLeaves, 'login', XP_VALUES.firstTree, currentRankId)
}

/** Call when a blueprint is created. */
export function awardBlueprint(
  currentLeaves: number,
  currentGoldenLeaves: number,
  currentRankId: string,
  /** Lifetime rank XP — see awardLeaves. */
  rankXp?: number,
): AwardResult {
  const daily = loadDaily()
  daily.blueprintsCreated += 1

  let bonus = 0

  // First blueprint ever (one-time)
  if (!daily.firstBlueprintAwarded) {
    const everKey = 'sf.xp.ever.firstBlueprint'
    try {
      if (!localStorage.getItem(everKey)) {
        localStorage.setItem(everKey, '1')
        daily.firstBlueprintAwarded = true
        bonus += XP_VALUES.firstBlueprint
      }
    } catch { /* ignore */ }
  }

  // Blueprint Master — 3+ in a day
  if (daily.blueprintsCreated === 3) {
    bonus += XP_VALUES.blueprintMaster
  }

  saveDaily(daily)

  if (bonus === 0) {
    return { leaves: 0, goldenLeaves: 0, rankChanged: false, newRankId: currentRankId, capped: false, onCooldown: false }
  }
  return awardLeaves(currentLeaves, currentGoldenLeaves, 'login', bonus, currentRankId, rankXp)
}

// ---- Helpers -----------------------------------------------------------------

function getWeekKey(): string {
  const now = new Date()
  const jan1 = new Date(now.getFullYear(), 0, 1)
  const weekNum = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${weekNum}`
}

/** Get today's engagement state for UI display. */
export function getDailyEngagement() {
  const daily = loadDaily()
  return {
    loginAwarded: daily.loginAwarded,
    modesUsed: daily.modesUsed.size,
    totalFocusMin: daily.totalFocusMin,
    dailyTasksCompleted: daily.dailyTasksCompleted,
    focusSessionCount: daily.focusSessionCount,
    blueprintsCreated: daily.blueprintsCreated,
    lastActive: daily.lastActive,
    penaltyApplied: daily.penaltyApplied,
    penaltyThresholdMin: XP_VALUES.inactivityThresholdMin,
    activeMinToday: daily.activeMinToday,
    activeMinCap: getOverride('dailyCaps', 'activeMinCap', DAILY_CAPS.activeMinCap),
  }
}

// ---- Sync to database --------------------------------------------------------
let syncTimer: ReturnType<typeof setTimeout> | null = null
let pendingLeaves = 0
let pendingGoldenLeaves = 0
let pendingRankXp: number | undefined

/**
 * Queue a DB sync. Batches rapid-fire writes (debounced to max 1 per 3s).
 * Best-effort: if the write fails, XP is still in localStorage.
 */
export function syncXpToDb(userId: string, leaves: number, goldenLeaves: number, rankXp?: number) {
  pendingLeaves = leaves
  pendingGoldenLeaves = goldenLeaves
  if (typeof rankXp === 'number') pendingRankXp = rankXp

  if (syncTimer) return
  syncTimer = setTimeout(async () => {
    syncTimer = null
    const l = pendingLeaves
    const g = pendingGoldenLeaves
    const r = pendingRankXp
    try {
        const payload: Record<string, unknown> = { id: userId, xp: l, premium_xp: g }
        if (typeof r === 'number') payload.rank_xp = r
        await supabase
        .from('profiles')
        .upsert([payload], { onConflict: 'id' })
    } catch {
      /* offline / column missing — localStorage is still authoritative */
    }
  }, 3000)
}

/** Get today's remaining cap info for UI display. */
export function getDailyCapInfo() {
  const daily = loadDaily()
  return {
    minutesRemaining: Math.max(0, DAILY_CAPS.total - daily.journeyMinutes),
    totalCap: DAILY_CAPS.total,
    totalEarned: daily.journeyMinutes,
  }
}

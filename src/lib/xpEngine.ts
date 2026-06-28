// XP Engine — centralized award logic with anti-spam / daily cap protection.
//
// Two currencies:
//   leaves (regular XP)  — earned from real study (rooms, train, library)
//   golden_leaves (premium XP) — earned from high-commitment achievements
//
// Leaves are SPENDABLE currency (like CoC gold coins). They are earned ONLY
// from study time: focus sessions, train journeys, and library.
// Task Magnet (tasks, habits, milestones) awards NO leaves — prevents farming.
//
// Anti-spam measures:
//   1. Focus XP only awarded for visible-tab time (enforced upstream)
//   2. Train journeys have diminishing returns per day
//   3. No hard cap on focus — it requires real time commitment

import { insforge } from './insforge'
import { rankForTotalXp } from './ranks'

// ---- XP values per action ---------------------------------------------------
// Tasks/habits/milestones award 0 — leaves are study-only currency
export const XP_VALUES = {
  task: 0,
  focusMin: 1,
  habit: 0,
  milestone: 0,
  tree: 15,
  note: 10,
  dailyLogin: 5,
  journeyMin: 1.45,

  // Premium XP (golden leaves)
  journeyPremium: 20,
  streak7: 50,
  streak30: 200,
  rankUp: 30,
} as const

// ---- Daily cap for train journeys (anti-spam) --------------------------------
export const DAILY_CAPS = {
  total: 999,
} as const

// Focus minutes and train journeys are NOT capped — they require real time.
// Train journeys have soft diminishing returns tracked below.

// ---- Daily tracker -----------------------------------------------------------
interface DailyRecord {
  date: string
  journeyMinutes: number
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
    const parsed = JSON.parse(raw) as DailyRecord
    if (parsed.date !== todayStr()) return freshDaily()
    return parsed
  } catch {
    return freshDaily()
  }
}

function freshDaily(): DailyRecord {
  return { date: todayStr(), journeyMinutes: 0 }
}

function saveDaily(record: DailyRecord) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(record))
  } catch { /* ignore */ }
}

// ---- Award result ------------------------------------------------------------
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
  source: 'focus' | 'train' | 'login' | 'tree' | 'note',
  baseAmount: number,
  currentRankId: string,
): AwardResult {
  let actualLeaves = Math.max(0, Math.round(baseAmount))
  let capped = false

  // Train journeys: soft diminishing returns after 60 min/day
  if (source === 'train') {
    const daily = loadDaily()
    const journaled = daily.journeyMinutes
    if (journaled >= 120) {
      // Hard stop at 2 hours of journeys per day
      return { leaves: 0, goldenLeaves: 0, rankChanged: false, newRankId: currentRankId, capped: true, onCooldown: false }
    }
    // Diminishing returns after 60 min
    if (journaled >= 60) {
      const overBy = journaled - 60
      const factor = Math.max(0.25, 1 - (overBy / 60) * 0.75)
      actualLeaves = Math.round(actualLeaves * factor)
    }
    daily.journeyMinutes += Math.round(baseAmount / XP_VALUES.journeyMin)
    saveDaily(daily)
  }

  // Check rank change
  const newTotal = currentLeaves + actualLeaves + currentGoldenLeaves
  const newRank = rankForTotalXp(newTotal)
  const rankChanged = newRank.id !== currentRankId

  return {
    leaves: actualLeaves,
    goldenLeaves: 0,
    rankChanged,
    newRankId: newRank.id,
    capped,
    onCooldown: false,
  }
}

// ---- Award golden leaves (premium XP) — never capped, no cooldown -----------
export function awardGoldenLeaves(
  currentLeaves: number,
  currentGoldenLeaves: number,
  baseAmount: number,
  currentRankId: string,
): AwardResult {
  const amount = Math.max(0, Math.round(baseAmount))
  const newTotal = currentLeaves + currentGoldenLeaves + amount
  const newRank = rankForTotalXp(newTotal)
  const rankChanged = newRank.id !== currentRankId

  return {
    leaves: 0,
    goldenLeaves: amount,
    rankChanged,
    newRankId: newRank.id,
    capped: false,
    onCooldown: false,
  }
}

// ---- Sync to database --------------------------------------------------------
let syncTimer: ReturnType<typeof setTimeout> | null = null
let pendingLeaves = 0
let pendingGoldenLeaves = 0

/**
 * Queue a DB sync. Batches rapid-fire writes (debounced to max 1 per 3s).
 * Best-effort: if the write fails, XP is still in localStorage.
 */
export function syncXpToDb(userId: string, leaves: number, goldenLeaves: number) {
  pendingLeaves = leaves
  pendingGoldenLeaves = goldenLeaves

  if (syncTimer) return
  syncTimer = setTimeout(async () => {
    syncTimer = null
    const l = pendingLeaves
    const g = pendingGoldenLeaves
    try {
      await insforge.database
        .from('profiles')
        .upsert([{ id: userId, xp: l, premium_xp: g }], { onConflict: 'id' })
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

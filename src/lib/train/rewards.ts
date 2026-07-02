// Journey rewards. A completed journey grants XP, coins and journey tickets,
// scaled by the route's length but with deliberate DIMINISHING RETURNS so a
// 12-hour Grand Journey is richly rewarded without being 36× a 20-minute Express
// (which would make every short session feel pointless and incentivise parking a
// long train and walking away). The per-minute rate falls smoothly as the
// journey grows: a power-law xp = k · minutes^p with p < 1.
//
//   route        minutes   xp     coins   tickets   xp/min
//   Express        20       ~29     ~9       1        1.45
//   Regional       60       ~72     ~21      1        1.20
//   Mountain      180      ~176     ~48      2        0.98
//   Night         420      ~358     ~93      3        0.85
//   Grand         720      ~560    ~143      5        0.78
//
// XP feeds the existing magnet XP pool (levelForXp lives in lib/magnet/types).
// Coins are the soft currency; tickets are a collectible meta-currency unique to
// the realm (future: redeem for luxury skins / private trains).

import type { TrainLine } from './lines'

const XP_K = 2.45
const XP_P = 0.82
const COIN_K = 0.78
const COIN_P = 0.8

export interface JourneyReward {
  xp: number
  coins: number
  tickets: number
  /** distance "travelled" in km — a flavour stat for the journey log (≈ route speed × time) */
  distanceKm: number
  /** achievement ids newly unlocked by THIS journey (resolved against history) */
  achievements: AchievementDef[]
}

export interface AchievementDef {
  id: string
  title: string
  detail: string
  icon: string
}

/** Tickets climb in coarse steps with the grandeur of the route. */
function ticketsFor(minutes: number): number {
  if (minutes >= 720) return 5
  if (minutes >= 420) return 3
  if (minutes >= 180) return 2
  return 1
}

/** A pleasant fictional cruising speed so longer routes log more distance:
 *  ~70 km/h, a touch higher for the express lines. */
function distanceFor(minutes: number): number {
  return Math.round((minutes / 60) * 72)
}

export function xpFor(minutes: number): number {
  return Math.round(XP_K * Math.pow(Math.max(0, minutes), XP_P))
}

export function coinsFor(minutes: number): number {
  return Math.round(COIN_K * Math.pow(Math.max(0, minutes), COIN_P))
}

/** Context needed to decide which achievements a journey unlocks. */
export interface RewardContext {
  /** completed journeys BEFORE this one (for "first ever", milestone counts) */
  priorCompleted: number
  /** line ids the player has completed before this journey */
  priorLineIds: Set<string>
  /** current focus streak in days, after this journey counts */
  streakDays: number
  /** true if the player is in a window seat (col 0 or 3) */
  windowSeat: boolean
}

const LINE_ACHIEVEMENTS: Record<string, AchievementDef> = {
  express: { id: 'train-express', title: 'First Sprint', detail: 'Completed the 20 Minute Express.', icon: 'train' },
  regional: { id: 'train-regional', title: 'Country Mile', detail: 'Completed the 1 Hour Regional.', icon: 'train' },
  mountain: { id: 'train-mountain', title: 'Summit Seeker', detail: 'Completed the 3 Hour Mountain Route.', icon: 'mountain' },
  night: { id: 'train-night', title: 'Night Owl', detail: 'Rode the 7 Hour Night Express to dawn.', icon: 'moon' },
  grand: { id: 'train-grand', title: 'Grand Voyager', detail: 'Survived the 12 Hour Grand Journey.', icon: 'star' },
}

/** Compute the full reward for finishing `line`, given the player's history. */
export function computeReward(line: TrainLine, ctx: RewardContext): JourneyReward {
  const achievements: AchievementDef[] = []

  if (ctx.priorCompleted === 0) {
    achievements.push({ id: 'train-first', title: 'All Aboard', detail: 'Completed your first journey.', icon: 'ticket' })
  }
  if (!ctx.priorLineIds.has(line.id)) {
    achievements.push(LINE_ACHIEVEMENTS[line.id])
  }
  const totalAfter = ctx.priorCompleted + 1
  if (totalAfter === 10) {
    achievements.push({ id: 'train-conductor', title: 'Conductor', detail: 'Completed 10 journeys.', icon: 'badge' })
  }
  if (totalAfter === 50) {
    achievements.push({ id: 'train-stationmaster', title: 'Stationmaster', detail: 'Completed 50 journeys.', icon: 'badge' })
  }
  if (ctx.streakDays === 7) {
    achievements.push({ id: 'train-streak-7', title: 'Seven Days On Rails', detail: 'A 7-day journey streak.', icon: 'fire' })
  }

  let xp = xpFor(line.minutes)
  let coins = coinsFor(line.minutes)

  // Window seat bonus: +10% XP and coins for scenic seats
  if (ctx.windowSeat) {
    xp = Math.round(xp * 1.1)
    coins = Math.round(coins * 1.1)
  }

  return {
    xp,
    coins,
    tickets: ticketsFor(line.minutes),
    distanceKm: distanceFor(line.minutes),
    achievements: achievements.filter(Boolean),
  }
}

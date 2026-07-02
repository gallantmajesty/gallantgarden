import { create } from 'zustand'
import { TRAIN_LINES, lineById, type LineId, type TrainLine } from '../lib/train/lines'
import { computeReward, type JourneyReward } from '../lib/train/rewards'
import { claimSeat, lockAllSeats, releaseSeat, findFreeSeat, carriageSeats } from '../three/train/interior'
import { publishSeatClaim, publishSeatRelease } from '../multiplayer/net'
import { useMagnet } from './magnet'
import { useStation } from './station'
import {
  loadJourneyState,
  saveJourneyState,
  pushJournalEntry,
  syncStartJourney,
  syncCompleteJourney,
  syncAbandonJourney,
  fetchActiveJourney,
  type JournalEntry,
  type PersistedJourney,
} from '../lib/train/journeys'

// ============================================================================
// Train Station journey manager — the single state machine for a player's study
// journey.
//
// Lifecycle (phase):
//   browsing   — walking the station, free to explore; NOT studying yet.
//   boarding   — chosen a platform; the boarding card is shown; player may still
//                walk the platform or cancel.
//   traveling  — seated aboard, departure countdown running (doors still open),
//                then the clock is running, the world streams past.
//   arrived    — reached the destination; the reward screen is up.
//
// Sub-phases within 'traveling':
//   departureSec > 0  → departure countdown (doors open, train hasn't left yet)
//   departureSec = 0  → actually traveling (journey clock ticking)
// ============================================================================

export const DEPARTURE_SEC = 15 // seconds the departure countdown lasts
export const ARRIVAL_CINEMATIC_SEC = 20 // seconds the arrival cinematic lasts
export const EXPLORE_SEC = 60 // seconds to explore the destination

export type JourneyPhase = 'browsing' | 'boarding' | 'traveling' | 'arriving' | 'exploring' | 'arrived'

/** A finished journey waiting on the reward screen. */
export interface ArrivedSummary {
  line: TrainLine
  reward: JourneyReward
  activeFocusSec: number
  startedAt: number
  completedAt: number
}

interface TrainState {
  phase: JourneyPhase
  /** the line currently boarding/traveling (null while browsing) */
  line: TrainLine | null
  /** chosen seat index within the carriage, or null until seated */
  seat: number | null
  /** seconds remaining in the departure countdown (0 = not departing) */
  departureSec: number
  /** seconds remaining in the arrival cinematic (20→0, 0 = show rewards) */
  arrivalSec: number
  /** seconds remaining in the destination exploration phase */
  exploreSec: number
  /** epoch ms the journey started (boarded) */
  startedAt: number | null
  /** epoch ms the journey is scheduled to arrive */
  endsAt: number | null
  /** accumulated seconds the tab was actually focused/visible during the journey */
  activeFocusSec: number
  /** ms timestamp of the last tick (to accrue active focus + detect sleep) */
  lastTickAt: number | null
  /** the just-arrived summary, shown on the reward screen */
  arrived: ArrivedSummary | null
  /** pre-computed arrival data, ready to show once the cinematic finishes */
  pendingArrival: ArrivedSummary | null
  /** position to return to on the station when exiting train (null = default spawn) */
  returnPos: { x: number; z: number; yaw: number } | null

  // ----- wallet / journal (realm-local economy) -----
  coins: number
  tickets: number
  journal: JournalEntry[]

  // ----- selectors -----
  remainingSec: () => number
  progress: () => number

  // ----- actions -----
  beginBoarding: (lineId: LineId) => void
  /** Board the train and enter the interior (standing at the vestibule).
   *  Starts the departure countdown; the real journey begins when it hits 0. */
  boardTrain: () => void
  /** Sit down at a seat (claims + locks it). */
  sitDown: (seat: number) => void
  confirmBoard: (seat: number) => void
  cancelBoarding: () => void
  /** Exit the train back to the station (only while not traveling). */
  exitTrain: () => void
  tick: () => void
  abandon: () => void
  dismissReward: () => void
  dismissExplore: () => void
  /** restore an in-flight journey from disk/server on entering the realm */
  restore: (userId: string | null) => Promise<void>
  /** record that the tab went to sleep (closed/hidden) at `t` */
  markSleep: (t: number) => void
  /** called when the tab wakes back up — adjusts endsAt by the hidden duration */
  markWake: (t: number) => void
}

let currentUserId: string | null = null

function persist(get: () => TrainState) {
  const s = get()
  const data: PersistedJourney = {
    phase: s.phase,
    lineId: s.line?.id ?? null,
    seat: s.seat,
    departureSec: s.departureSec || undefined,
    arrivalSec: s.arrivalSec || undefined,
    startedAt: s.startedAt,
    endsAt: s.endsAt,
    activeFocusSec: s.activeFocusSec,
    lastSeenAt: Date.now(),
    coins: s.coins,
    tickets: s.tickets,
    journal: s.journal,
  }
  saveJourneyState(currentUserId, data)
}

export const useTrain = create<TrainState>((set, get) => ({
  phase: 'browsing',
  line: null,
  seat: null,
  departureSec: 0,
  arrivalSec: 0,
  exploreSec: 0,
  startedAt: null,
  endsAt: null,
  activeFocusSec: 0,
  lastTickAt: null,
  arrived: null,
  pendingArrival: null,
  returnPos: null,
  coins: 0,
  tickets: 0,
  journal: [],

  remainingSec: () => {
    const { departureSec, arrivalSec, endsAt } = get()
    if (departureSec > 0) return departureSec
    if (arrivalSec > 0) return arrivalSec
    if (!endsAt) return 0
    return Math.max(0, Math.round((endsAt - Date.now()) / 1000))
  },

  progress: () => {
    const { departureSec, arrivalSec, startedAt, endsAt } = get()
    if (departureSec > 0) return 1 - departureSec / DEPARTURE_SEC
    if (arrivalSec > 0) return 1
    if (!startedAt || !endsAt || endsAt <= startedAt) return 0
    return Math.min(1, Math.max(0, (Date.now() - startedAt) / (endsAt - startedAt)))
  },

  beginBoarding: (lineId) => {
    if (get().phase === 'traveling') return // can't switch trains mid-journey
    const line = lineById(lineId)
    set({ phase: 'boarding', line, seat: null, arrived: null })
    persist(get)
  },

  boardTrain: () => {
    const { line, phase } = get()
    if (!line || phase !== 'boarding') return
    // Save the player's station position so they can walk back out.
    const station = useStation.getState()
    set({
      phase: 'traveling',
      seat: null,
      departureSec: DEPARTURE_SEC,
      arrivalSec: 0,
      startedAt: null,
      endsAt: null,
      activeFocusSec: 0,
      lastTickAt: Date.now(),
      returnPos: { x: station.playerX, z: station.playerZ, yaw: station.playerYaw },
    })
    persist(get)
  },

  sitDown: (seat) => {
    const { line, phase } = get()
    if (!line || !(phase === 'traveling')) return
    // Allow sitting during departure countdown OR during the real journey
    claimSeat(seat, currentUserId ?? 'local', line.route)
    lockAllSeats()
    publishSeatClaim(seat, line.route)
    set({ seat })
    persist(get)
  },

  confirmBoard: (seat) => {
    // Legacy: delegates to boardTrain + sitDown for code that still calls it directly
    get().boardTrain()
    get().sitDown(seat)
  },

  cancelBoarding: () => {
    if (get().phase !== 'boarding') return
    set({ phase: 'browsing', line: null, seat: null, arrivalSec: 0 })
    persist(get)
  },

  exitTrain: () => {
    const s = get()
    if (s.phase !== 'traveling' || s.departureSec === 0) return
    if (s.seat != null) {
      releaseSeat(s.seat)
      publishSeatRelease(s.seat)
    }
    set({
      phase: 'browsing',
      line: null,
      seat: null,
      departureSec: 0,
      startedAt: null,
      endsAt: null,
      activeFocusSec: 0,
      arrived: null,
      pendingArrival: null,
      arrivalSec: 0,
      // returnPos is preserved so StationPlayerController can use it as spawn
    })
    persist(get)
  },

  tick: () => {
    const s = get()
    if (s.phase === 'exploring') {
      // Exploration countdown
      if (s.lastTickAt) {
        const now = Date.now()
        const dt = (now - s.lastTickAt) / 1000
        if (dt > 0 && dt < 5) {
          const next = Math.max(0, s.exploreSec - Math.round(dt))
          if (next === 0) {
            // Exploration complete — show rewards
            set({ phase: 'arrived', exploreSec: 0, arrived: s.pendingArrival, pendingArrival: null, startedAt: null, endsAt: null, lastTickAt: null, seat: null })
            persist(get)
          } else {
            set({ exploreSec: next, lastTickAt: now })
          }
        }
      }
      return
    }
    if (s.phase === 'arriving') {
      // Arrival cinematic countdown
      if (s.lastTickAt) {
        const now = Date.now()
        const dt = (now - s.lastTickAt) / 1000
        if (dt > 0 && dt < 5) {
          const next = Math.max(0, s.arrivalSec - Math.round(dt))
          if (next === 0) {
            // Cinematic complete — start exploration phase
            set({ phase: 'exploring', arrivalSec: 0, exploreSec: EXPLORE_SEC, lastTickAt: Date.now() })
            persist(get)
          } else {
            set({ arrivalSec: next, lastTickAt: now })
          }
        }
      }
      return
    }
    if (s.phase !== 'traveling') return
    const now = Date.now()

    // ── Departure countdown (doors still open, train hasn't left) ──
    if (s.departureSec > 0) {
      if (s.lastTickAt) {
        const dt = (now - s.lastTickAt) / 1000
        if (dt > 0 && dt < 3) {
          const next = Math.max(0, s.departureSec - Math.round(dt))
          if (next === 0) {
            // Countdown finished — start the real journey
            const line = s.line
            if (line) {
              const journeyNow = Date.now()
              // Auto-assign seat if player is still standing (doors closing)
              let seatIdx: number | null = s.seat
              if (seatIdx == null) {
                const freeSeat = findFreeSeat()
                if (freeSeat >= 0) {
                  claimSeat(freeSeat, currentUserId ?? 'local', line.route)
                  seatIdx = freeSeat
                }
              }
              lockAllSeats()
              set({
                departureSec: 0,
                startedAt: journeyNow,
                endsAt: journeyNow + line.minutes * 60_000,
                lastTickAt: journeyNow,
                seat: seatIdx,
              })
              void syncStartJourney(currentUserId, { lineId: line.id, platform: line.platform, seat: seatIdx ?? -1, minutes: line.minutes, startedAt: journeyNow })
            } else {
              set({ departureSec: 0, lastTickAt: now })
            }
          } else {
            set({ departureSec: next, lastTickAt: now })
          }
        }
      }
      return
    }

    // ── Real journey clock ──
    if (!s.endsAt) return
    let activeFocusSec = s.activeFocusSec
    if (s.lastTickAt && (typeof document === 'undefined' || document.visibilityState === 'visible')) {
      const dt = (now - s.lastTickAt) / 1000
      if (dt > 0 && dt < 5) activeFocusSec += dt
    }
    if (now >= s.endsAt) {
      finishJourney(set, get, activeFocusSec, now)
      return
    }
    set({ lastTickAt: now, activeFocusSec })
  },

  abandon: () => {
    set({ phase: 'browsing', line: null, seat: null, departureSec: 0, arrivalSec: 0, exploreSec: 0, startedAt: null, endsAt: null, activeFocusSec: 0, arrived: null, pendingArrival: null })
    persist(get)
    void syncAbandonJourney(currentUserId)
  },

  dismissReward: () => {
    set({ phase: 'browsing', line: null, seat: null, departureSec: 0, arrivalSec: 0, exploreSec: 0, startedAt: null, endsAt: null, arrived: null, pendingArrival: null })
    persist(get)
  },

  dismissExplore: () => {
    const s = get()
    if (s.phase !== 'exploring') return
    // Transition to arrived phase with the reward screen
    set({ phase: 'arrived', exploreSec: 0, arrived: s.pendingArrival, pendingArrival: null, seat: null })
    persist(get)
  },

  restore: async (userId) => {
    currentUserId = userId
    // Local snapshot first (instant), then reconcile with the server if present.
    const local = loadJourneyState(userId)
    const server = await fetchActiveJourney(userId)
    const data = server ?? local
    if (!data) return

    // hydrate wallet + journal regardless of journey phase
    set({ coins: data.coins ?? 0, tickets: data.tickets ?? 0, journal: data.journal ?? [] })

    if ((data.phase === 'traveling' || data.phase === 'arriving') && data.lineId) {
      const line = lineById(data.lineId)
      const now = Date.now()
      // If in departure countdown, don't restore endsAt (means journey hasn't started)
      if (data.departureSec && data.departureSec > 0) {
        set({ phase: 'traveling', line, seat: data.seat, departureSec: data.departureSec, arrivalSec: 0, startedAt: null, endsAt: null, activeFocusSec: 0, lastTickAt: now })
      } else if (data.phase === 'arriving' && data.arrivalSec) {
        set({ phase: 'arriving', line, seat: data.seat, departureSec: 0, arrivalSec: data.arrivalSec, startedAt: data.startedAt, endsAt: data.endsAt, activeFocusSec: data.activeFocusSec ?? 0, lastTickAt: now })
      } else if (data.endsAt && now >= data.endsAt) {
        set({ phase: 'traveling', line, seat: data.seat, startedAt: data.startedAt, endsAt: data.endsAt, arrivalSec: 0, activeFocusSec: data.activeFocusSec ?? 0, lastTickAt: now })
        finishJourney(set, get, data.activeFocusSec ?? 0, data.endsAt)
      } else if (data.endsAt) {
        set({ phase: 'traveling', line, seat: data.seat, startedAt: data.startedAt, endsAt: data.endsAt, arrivalSec: 0, activeFocusSec: data.activeFocusSec ?? 0, lastTickAt: now })
      }
    }
  },

  markSleep: (t) => {
    const s = get()
    if (s.phase !== 'traveling' && s.phase !== 'arriving') return
    saveJourneyState(currentUserId, {
      phase: s.phase,
      lineId: s.line?.id ?? null,
      seat: s.seat,
      departureSec: s.departureSec,
      arrivalSec: s.arrivalSec,
      startedAt: s.startedAt,
      endsAt: s.endsAt,
      activeFocusSec: s.activeFocusSec,
      lastSeenAt: t,
      coins: s.coins,
      tickets: s.tickets,
      journal: s.journal,
    })
  },

  markWake: (t) => {
    const s = get()
    if ((s.phase !== 'traveling' && s.phase !== 'arriving') || !s.lastTickAt) return
    const hiddenSec = (t - s.lastTickAt) / 1000
    if (hiddenSec > 2 && s.endsAt) {
      // Push the arrival time forward by how long the tab was hidden
      set({ endsAt: s.endsAt + hiddenSec * 1000, lastTickAt: t })
      persist(get)
    }
  },
}))

/** Finalise a journey: compute + grant rewards, write the journal, show the
 *  reward screen. Shared by the live tick and offline-completion-on-restore. */
function finishJourney(
  set: (partial: Partial<TrainState>) => void,
  get: () => TrainState,
  activeFocusSec: number,
  completedAt: number,
) {
  const s = get()
  const line = s.line
  if (!line || !s.startedAt) return

  const priorLineIds = new Set(s.journal.map((j) => j.lineId))
  // Derive streak from journal: consecutive days with completed journeys
  const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10)
  const journeyDays = new Set(s.journal.map((j) => dayKey(j.completedAt)))
  let streakDays = 0
  const todayKey = dayKey(completedAt)
  journeyDays.add(todayKey)
  let cursor = new Date(completedAt)
  while (journeyDays.has(dayKey(cursor.getTime()))) {
    streakDays++
    cursor = new Date(cursor.getTime() - 86_400_000)
  }
  // Determine if seat is a window seat (col 0 or 3)
  let windowSeat = false
  if (s.seat != null) {
    const seats = carriageSeats()
    const seat = seats[s.seat]
    if (seat) windowSeat = seat.col === 0 || seat.col === 3
  }
  const reward = computeReward(line, {
    priorCompleted: s.journal.length,
    priorLineIds,
    streakDays,
    windowSeat,
  })

  // Bridge XP + achievements into the shared progression store.
  useMagnet.getState().recordJourney({
    minutes: line.minutes,
    subject: line.route,
    xp: reward.xp,
    achievements: reward.achievements,
  })

  const entry: JournalEntry = {
    id: `jrn_${completedAt.toString(36)}`,
    lineId: line.id,
    route: line.route,
    destination: line.destination,
    minutes: line.minutes,
    distanceKm: reward.distanceKm,
    xp: reward.xp,
    coins: reward.coins,
    tickets: reward.tickets,
    activeFocusSec: Math.round(activeFocusSec),
    startedAt: s.startedAt,
    completedAt,
  }

  const journal = [entry, ...s.journal]
  const newCoins = s.coins + reward.coins
  const newTickets = s.tickets + reward.tickets

  set({
    phase: 'arriving',
    arrivalSec: ARRIVAL_CINEMATIC_SEC,
    arrived: null,
    pendingArrival: { line, reward, activeFocusSec: Math.round(activeFocusSec), startedAt: s.startedAt, completedAt },
    coins: newCoins,
    tickets: newTickets,
    journal,
    seat: s.seat,
    startedAt: s.startedAt,
    endsAt: s.endsAt,
    lastTickAt: Date.now(),
  })

  persist(get)
  pushJournalEntry(currentUserId, entry)
  void syncCompleteJourney(currentUserId, entry)
}

/* ----------------------------------------------------------- journal helpers */

export interface JourneyTotals {
  completed: number
  longestMin: number
  totalDistanceKm: number
  totalHours: number
  stations: number
}

/** Aggregate stats for the journey log UI. */
export function journeyTotals(journal: JournalEntry[]): JourneyTotals {
  const completed = journal.length
  const longestMin = journal.reduce((m, j) => Math.max(m, j.minutes), 0)
  const totalDistanceKm = journal.reduce((s, j) => s + j.distanceKm, 0)
  const totalMin = journal.reduce((s, j) => s + j.minutes, 0)
  const stations = new Set(journal.map((j) => j.lineId)).size
  return {
    completed,
    longestMin,
    totalDistanceKm,
    totalHours: Math.round((totalMin / 60) * 10) / 10,
    stations,
  }
}

export { TRAIN_LINES }

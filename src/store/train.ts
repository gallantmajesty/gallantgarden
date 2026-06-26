import { create } from 'zustand'
import { TRAIN_LINES, lineById, type LineId, type TrainLine } from '../lib/train/lines'
import { computeReward, type JourneyReward } from '../lib/train/rewards'
import { useMagnet } from './magnet'
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
// journey. A journey is FocusLily's deepest commitment device: you don't just
// start a timer, you board a scheduled train that physically travels for a fixed
// length of time, and only reaching the destination grants the reward.
//
// Lifecycle (phase):
//   browsing   — walking the station, free to explore; NOT studying yet.
//   boarding   — chosen a platform; the arrival/doors cinematic is playing.
//   traveling  — seated aboard, the clock is running, the world streams past.
//   arrived    — reached the destination; the reward screen is up.
//
// The journey is the source of truth for "am I studying", survives reloads and
// disconnects (localStorage + best-effort server sync), and completes even if the
// player was away when the train arrived (offline completion on restore).
// ============================================================================

export type JourneyPhase = 'browsing' | 'boarding' | 'traveling' | 'arrived'

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

  // ----- wallet / journal (realm-local economy) -----
  coins: number
  tickets: number
  journal: JournalEntry[]

  // ----- selectors -----
  remainingSec: () => number
  progress: () => number

  // ----- actions -----
  beginBoarding: (lineId: LineId) => void
  confirmBoard: (seat: number) => void
  cancelBoarding: () => void
  tick: () => void
  abandon: () => void
  dismissReward: () => void
  /** restore an in-flight journey from disk/server on entering the realm */
  restore: (userId: string | null) => Promise<void>
  /** record that the tab went to sleep (closed/hidden) at `t` */
  markSleep: (t: number) => void
}

let currentUserId: string | null = null

function persist(get: () => TrainState) {
  const s = get()
  const data: PersistedJourney = {
    phase: s.phase,
    lineId: s.line?.id ?? null,
    seat: s.seat,
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
  startedAt: null,
  endsAt: null,
  activeFocusSec: 0,
  lastTickAt: null,
  arrived: null,
  coins: 0,
  tickets: 0,
  journal: [],

  remainingSec: () => {
    const { endsAt } = get()
    if (!endsAt) return 0
    return Math.max(0, Math.round((endsAt - Date.now()) / 1000))
  },

  progress: () => {
    const { startedAt, endsAt } = get()
    if (!startedAt || !endsAt || endsAt <= startedAt) return 0
    return Math.min(1, Math.max(0, (Date.now() - startedAt) / (endsAt - startedAt)))
  },

  beginBoarding: (lineId) => {
    if (get().phase === 'traveling') return // can't switch trains mid-journey
    const line = lineById(lineId)
    set({ phase: 'boarding', line, seat: null, arrived: null })
    persist(get)
  },

  confirmBoard: (seat) => {
    const { line, phase } = get()
    if (!line || phase === 'traveling') return
    const now = Date.now()
    set({
      phase: 'traveling',
      seat,
      startedAt: now,
      endsAt: now + line.minutes * 60_000,
      activeFocusSec: 0,
      lastTickAt: now,
    })
    persist(get)
    void syncStartJourney(currentUserId, { lineId: line.id, platform: line.platform, seat, minutes: line.minutes, startedAt: now })
  },

  cancelBoarding: () => {
    if (get().phase !== 'boarding') return
    set({ phase: 'browsing', line: null, seat: null })
    persist(get)
  },

  tick: () => {
    const s = get()
    if (s.phase !== 'traveling' || !s.endsAt) return
    const now = Date.now()
    // Accrue active focus only when the tab is visible; large gaps (sleep) are
    // not counted as active focus, but the journey clock itself is wall-clock.
    let activeFocusSec = s.activeFocusSec
    if (s.lastTickAt && (typeof document === 'undefined' || document.visibilityState === 'visible')) {
      const dt = (now - s.lastTickAt) / 1000
      if (dt > 0 && dt < 5) activeFocusSec += dt // ignore long gaps (backgrounded)
    }
    if (now >= s.endsAt) {
      finishJourney(set, get, activeFocusSec, now)
      return
    }
    set({ lastTickAt: now, activeFocusSec })
  },

  abandon: () => {
    set({ phase: 'browsing', line: null, seat: null, startedAt: null, endsAt: null, activeFocusSec: 0, arrived: null })
    persist(get)
    void syncAbandonJourney(currentUserId)
  },

  dismissReward: () => {
    set({ phase: 'browsing', line: null, seat: null, startedAt: null, endsAt: null, arrived: null })
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

    if (data.phase === 'traveling' && data.lineId && data.endsAt) {
      const line = lineById(data.lineId)
      const now = Date.now()
      if (now >= data.endsAt) {
        // The train arrived while we were away — complete it offline now.
        set({ phase: 'traveling', line, seat: data.seat, startedAt: data.startedAt, endsAt: data.endsAt, activeFocusSec: data.activeFocusSec ?? 0, lastTickAt: now })
        finishJourney(set, get, data.activeFocusSec ?? 0, data.endsAt)
      } else {
        // Resume the in-flight journey: same line, seat, remaining time.
        set({ phase: 'traveling', line, seat: data.seat, startedAt: data.startedAt, endsAt: data.endsAt, activeFocusSec: data.activeFocusSec ?? 0, lastTickAt: now })
      }
    }
  },

  markSleep: (t) => {
    const s = get()
    if (s.phase !== 'traveling') return
    // Persist immediately so a hard close still leaves an accurate snapshot.
    saveJourneyState(currentUserId, {
      phase: s.phase,
      lineId: s.line?.id ?? null,
      seat: s.seat,
      startedAt: s.startedAt,
      endsAt: s.endsAt,
      activeFocusSec: s.activeFocusSec,
      lastSeenAt: t,
      coins: s.coins,
      tickets: s.tickets,
      journal: s.journal,
    })
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
  const reward = computeReward(line, {
    priorCompleted: s.journal.length,
    priorLineIds,
    streakDays: 0, // streaks are derived elsewhere; placeholder keeps rewards pure
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
  const coins = s.coins + reward.coins
  const tickets = s.tickets + reward.tickets

  set({
    phase: 'arrived',
    arrived: { line, reward, activeFocusSec: Math.round(activeFocusSec), startedAt: s.startedAt, completedAt },
    coins,
    tickets,
    journal,
    seat: null,
    startedAt: null,
    endsAt: null,
    lastTickAt: null,
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

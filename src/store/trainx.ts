import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type TrainId = 'sprint' | 'forest' | 'kingdom' | 'frost' | 'crystal' | 'horizon' | 'royale'

export interface TrainDef {
  id: TrainId
  name: string
  durationHours: number
  scenery: string
  seatsTotal: number
  vip: boolean
  locked: boolean
  rewardTier: string
  /** number of reward stops along the route (1 stop = reward only at destination) */
  stops: number
  /** key used by the parallax window shader in Phase 2 */
  sceneryKey: string
  /** gradient colours used to preview the scenery on the card + window */
  palette: [string, string, string]
}

/** The seven bookable trains (1–6h + VIP 9h). Index order = departure-board order. */
export const TRAINS: TrainDef[] = [
  // Reward stops follow the spec: 1h→2 stops, 2h→3, 3h→4, 4h→5, 5h→6 (i.e. stops = durationHours + 1).
  // Horizon (6h) and Royale (9h) extend the same rule → 7 and 10 stops.
  { id: 'sprint', name: 'Express Sprint', durationHours: 1, scenery: 'Village / Meadow', seatsTotal: 30, vip: false, locked: false, rewardTier: 'Bronze', stops: 2, sceneryKey: 'meadow', palette: ['#cfeec0', '#7fc77f', '#3f8f5f'] },
  { id: 'forest', name: 'Forest Runner', durationHours: 2, scenery: 'Enchanted Forest', seatsTotal: 30, vip: false, locked: false, rewardTier: 'Silver', stops: 3, sceneryKey: 'forest', palette: ['#6fae7f', '#2f6d3a', '#143a22'] },
  { id: 'kingdom', name: 'Kingdom Express', durationHours: 3, scenery: 'Royal Kingdom / Castle', seatsTotal: 30, vip: false, locked: false, rewardTier: 'Silver', stops: 4, sceneryKey: 'castle', palette: ['#d8b8f0', '#7a4fb0', '#3a1f5f'] },
  { id: 'frost', name: 'Frost Line', durationHours: 4, scenery: 'Snow / Winter Wonderland', seatsTotal: 30, vip: false, locked: false, rewardTier: 'Gold', stops: 5, sceneryKey: 'frost', palette: ['#eafcff', '#bfe6ff', '#5b86b0'] },
  { id: 'crystal', name: 'Crystal Voyage', durationHours: 5, scenery: 'Christmas / Festive Snow', seatsTotal: 30, vip: false, locked: false, rewardTier: 'Gold', stops: 6, sceneryKey: 'festive', palette: ['#ffd9d0', '#d6453f', '#7a1f1f'] },
  { id: 'horizon', name: 'Horizon Journey', durationHours: 6, scenery: 'Mixed Fantasy Landscapes', seatsTotal: 30, vip: false, locked: false, rewardTier: 'Platinum', stops: 7, sceneryKey: 'mixed', palette: ['#e2e8ff', '#a9b6e8', '#5b6bb0'] },
  { id: 'royale', name: 'VIP Royale', durationHours: 9, scenery: 'Ultra Premium Fantasy (VIP)', seatsTotal: 20, vip: true, locked: true, rewardTier: 'VIP (2x)', stops: 10, sceneryKey: 'vip', palette: ['#fff4d6', '#e7c7ff', '#b39bff'] },
]

export function getTrain(id: TrainId | null): TrainDef | undefined {
  return TRAINS.find((t) => t.id === id)
}

/** The six standard (non-VIP) trains that must each be completed at least once
 *  before the VIP Royale unlocks. */
export const STANDARD_TRAIN_IDS: TrainId[] = TRAINS.filter((t) => !t.vip).map((t) => t.id)

/** VIP Royale unlocks once every standard train has been completed at least once. */
export function vipUnlocked(completed: TrainId[]): boolean {
  return STANDARD_TRAIN_IDS.every((id) => completed.includes(id))
}

/** "Train Master" — every train (incl. VIP) completed at least once. */
export function trainMaster(completed: TrainId[]): boolean {
  return TRAINS.every((t) => completed.includes(t.id))
}

/** Booking / experience flow phases (Phase 1 → 3). */
export type TrainXPhase =
  | 'arriving' // fade in to the concourse
  | 'queue' // character walks the queue to the desk
  | 'desk' // reached the agent — train selection opens
  | 'selecting' // train cards modal
  | 'warning' // confirm / go back modal
  | 'confirmed' // seat assigned, walk to platform
  | 'boarding' // fade to black, train departing
  | 'seated' // Phase 2 interior (study session)
  | 'arrived' // Phase 3 arrival modal

export interface SeatAssignment {
  row: number
  letter: string
  label: string
}

function randomSeat(total = 30): SeatAssignment {
  const row = 1 + Math.floor(Math.random() * total)
  const letter = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]
  const side = letter === 'A' || letter === 'D' ? 'Window' : 'Aisle'
  const leftRight = letter === 'A' || letter === 'B' ? 'Left' : 'Right'
  return { row, letter, label: `${row}${letter} — ${side} ${leftRight}` }
}

interface TrainXState {
  phase: TrainXPhase
  selectedTrainId: TrainId | null
  seat: SeatAssignment | null
  bookingConfirmed: boolean

  // ---- Phase 7 study + reward model (populated once seated) ----
  /** accumulated ACTIVE study time in ms — only advances while the tab is visible
   *  and the train has departed. Pausing the tab freezes the countdown. */
  elapsedActive: number
  /** rewards banked so far (persisted, so an early leave keeps what was earned) */
  rewards: { xp: number; coins: number; items: string[] }
  /** number of reward stops already reached (0-based count) */
  stopsReached: number
  /** true once the train has left the station — the timer only runs after this */
  departed: boolean
  /** whether the realm screen is currently visible to the user (drives scenery freeze) */
  visible: boolean
  /** train ids completed at least once (persistent achievement, not cleared on reset) */
  completedTrains: TrainId[]

  // ---- actions ----
  setPhase: (p: TrainXPhase) => void
  goToDesk: () => void
  selectTrain: (id: TrainId) => void
  confirmBooking: () => void
  markSeated: () => void
  beginJourney: () => void
  setVisible: (v: boolean) => void
  tickActive: (dtMs: number) => void
  markArrived: () => void
  resetBooking: () => void
}

/** Reward granted at a given stop (0-based index). Reaching the final stop also
 *  awards a commemorative pass item. VIP trains double the base payout. */
function rewardForStop(t: TrainDef, stopIndex: number) {
  const mult = t.vip ? 2 : 1
  const xp = Math.round(30 * t.durationHours * mult)
  const coins = Math.round(5 * t.durationHours * mult)
  const item = stopIndex === t.stops - 1 ? `${t.name} Pass` : null
  return { xp, coins, item }
}

export const useTrainX = create<TrainXState>()(
  persist(
    (set, get) => ({
      phase: 'arriving',
      selectedTrainId: null,
      seat: null,
      bookingConfirmed: false,
      elapsedActive: 0,
      rewards: { xp: 0, coins: 0, items: [] },
      stopsReached: 0,
      departed: false,
      visible: true,
      completedTrains: [],

      setPhase: (p) => set({ phase: p }),
      goToDesk: () => set({ phase: 'desk' }),
      selectTrain: (id) => {
        const t = getTrain(id)
        if (!t) return
        // VIP Royale is gated: must have completed all standard trains first.
        if (t.locked && !vipUnlocked(get().completedTrains)) return
        set({ selectedTrainId: id, phase: 'warning' })
      },
      confirmBooking: () => {
        const t = getTrain(get().selectedTrainId)
        if (!t) return
        set({ seat: randomSeat(t.seatsTotal), bookingConfirmed: true, phase: 'confirmed' })
      },
      // Seated: begin the journey after the doors close. Don't reset elapsedActive —
      // a refresh mid-journey should resume the same timer (rejoin = same train/seat).
      markSeated: () => set({ phase: 'seated', departed: false }),
      beginJourney: () => set({ departed: true }),
      setVisible: (v) => set({ visible: v }),
      // Advance the active timer by dtMs of real (visible) time, banking rewards at
      // each stop crossed. Called once per second by StudyHUD while the tab is visible.
      tickActive: (dtMs) => {
        const s = get()
        const t = getTrain(s.selectedTrainId)
        if (!t || s.phase !== 'seated' || !s.departed) return
        const total = t.durationHours * 3600 * 1000
        const elapsed = Math.min(total, s.elapsedActive + dtMs)
        let stopsReached = s.stopsReached
        let rewards = s.rewards
        while (stopsReached < t.stops && elapsed >= ((stopsReached + 1) / t.stops) * total) {
          const r = rewardForStop(t, stopsReached)
          rewards = {
            xp: rewards.xp + r.xp,
            coins: rewards.coins + r.coins,
            items: r.item ? [...rewards.items, r.item] : rewards.items,
          }
          stopsReached++
        }
        if (elapsed >= total) {
          const done = get().completedTrains
          const completed = done.includes(t.id) ? done : [...done, t.id]
          set({ elapsedActive: total, stopsReached: t.stops, rewards, phase: 'arrived', completedTrains: completed })
        } else {
          set({ elapsedActive: elapsed, stopsReached, rewards })
        }
      },
      markArrived: () => {
        const t = getTrain(get().selectedTrainId)
        const total = t ? t.durationHours * 3600 * 1000 : 0
        const done = get().completedTrains
        const completed = t && !done.includes(t.id) ? [...done, t.id] : done
        set({ phase: 'arrived', elapsedActive: total, stopsReached: t ? t.stops : 0, completedTrains: completed })
      },
      resetBooking: () =>
        set({
          phase: 'arriving',
          selectedTrainId: null,
          seat: null,
          bookingConfirmed: false,
          elapsedActive: 0,
          rewards: { xp: 0, coins: 0, items: [] },
          stopsReached: 0,
          departed: false,
          visible: true,
        }),
    }),
    {
      name: 'sf.trainx.v1',
      storage: createJSONStorage(() => localStorage),
      // Persist the booking + progress so a refresh rejoins the same train/seat with
      // the timer and earned rewards continuing (rejoin = same train, same seat).
      partialize: (s) => ({
        phase: s.phase === 'arriving' || s.phase === 'queue' ? 'desk' : s.phase,
        selectedTrainId: s.selectedTrainId,
        seat: s.seat,
        bookingConfirmed: s.bookingConfirmed,
        elapsedActive: s.elapsedActive,
        rewards: s.rewards,
        stopsReached: s.stopsReached,
        departed: s.departed,
        completedTrains: s.completedTrains,
      }),
    },
  ),
)

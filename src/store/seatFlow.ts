import { create } from 'zustand'
import { seatAnchors } from '../three/library/furniture'
import type { Seat } from '../three/library/furniture'

const STORAGE_KEY = 'library_last_seat'

/** Once a student sits, they can't PICK A DIFFERENT seat for this long — the
 *  "change seat" box (top-right, next to Stand up) stays locked and counts down.
 *  This applies on the very first sit AND on every re-sit, so the rule is real
 *  rather than a decorative timer. */
export const SEAT_LOCK_MS = 10 * 60 * 1000

export type FlowStage = 'selecting' | 'spawning' | 'walking' | 'seated' | 'free'

function loadSavedSeat(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw == null) return null
    const id = Number(raw)
    return Number.isFinite(id) ? id : null
  } catch { return null }
}

function saveSeat(id: number | null) {
  try {
    if (id != null) localStorage.setItem(STORAGE_KEY, String(id))
    else localStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
}

interface SeatFlowState {
  stage: FlowStage
  selectedSeatId: number | null
  seatLockUntil: number | null
  /** Room ID that is currently locked (can't re-sit here until cooldown expires). */
  lockedRoomId: string | null
  seats: Seat[]
  /** Map from seat id to occupant name */
  occupied: Record<number, string>
  /** Whether the cinematic entrance has played */
  entrancePlayed: boolean
  pickSeat: (id: number) => void
  clearSeat: () => void
  startWalk: () => void
  /** Lock seat-changing for SEAT_LOCK_MS from now (called on every sit). */
  lockSeat: () => void
  arrive: (roomId?: string) => void
  /** Stand up but keep the room lock active — user must wait or change rooms. */
  standUp: () => void
  unlock: () => void
  setOccupied: (map: Record<number, string>) => void
  markEntrancePlayed: () => void
}

function getInitialStage(): FlowStage {
  // Always show seat picker
  saveSeat(null)
  return 'selecting'
}

function getInitialSeat(): number | null {
  return null
}

export const useSeatFlow = create<SeatFlowState>((set, get) => ({
  stage: getInitialStage(),
  selectedSeatId: getInitialSeat(),
  seatLockUntil: getInitialStage() === 'seated' ? Date.now() + 10 * 60 * 1000 : null,
  lockedRoomId: null,
  seats: seatAnchors(),
  occupied: {},
  entrancePlayed: getInitialStage() === 'seated',
  pickSeat: (id) => {
    saveSeat(id)
    set({ selectedSeatId: id })
  },
  clearSeat: () => {
    saveSeat(null)
    set({
      stage: 'selecting',
      selectedSeatId: null,
      // NOTE: intentionally do NOT clear seatLockUntil here — the room stays locked
    })
  },
  startWalk: () => set({ stage: 'walking' }),
  arrive: (roomId) => {
    const lockUntil = Date.now() + SEAT_LOCK_MS
    set({ stage: 'seated', seatLockUntil: lockUntil, lockedRoomId: roomId ?? get().lockedRoomId })
  },
  lockSeat: () => set({ seatLockUntil: Date.now() + SEAT_LOCK_MS }),
  /** Stand up but keep the room locked — user must wait 10 min or change rooms. */
  standUp: () => {
    saveSeat(null)
    set({ stage: 'selecting', selectedSeatId: null })
    // seatLockUntil and lockedRoomId are intentionally preserved
  },
  unlock: () => {
    saveSeat(null)
    set({ stage: 'selecting', selectedSeatId: null, seatLockUntil: null, lockedRoomId: null })
  },
  setOccupied: (map) => set({ occupied: map }),
  markEntrancePlayed: () => set({ entrancePlayed: true }),
}))

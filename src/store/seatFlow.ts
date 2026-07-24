import { create } from 'zustand'
import { seatAnchors } from '../three/library/furniture'
import type { Seat } from '../three/library/furniture'

const STORAGE_KEY = 'library_last_seat'
const SEAT_EXPIRY_KEY = 'library_seat_expiry'

/** After sitting, user can't change seats for 30 seconds (anti-spam).
 *  On tab leave, the seat is reserved for 30 seconds — if they return
 *  in time AND the seat is still free, they resume automatically. */
export const SEAT_LOCK_MS = 30 * 1000

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

/** Save the seat with an expiry timestamp (for tab-leave reservation). */
function saveSeatWithExpiry(id: number | null, expiryMs: number | null) {
  try {
    if (id != null && expiryMs != null) {
      localStorage.setItem(STORAGE_KEY, String(id))
      localStorage.setItem(SEAT_EXPIRY_KEY, String(expiryMs))
    } else {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(SEAT_EXPIRY_KEY)
    }
  } catch { /* ignore */ }
}

/** Load saved seat if it hasn't expired yet. Returns null if expired or missing. */
function loadSavedSeatIfValid(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const expiryRaw = localStorage.getItem(SEAT_EXPIRY_KEY)
    if (raw == null || expiryRaw == null) return null
    const id = Number(raw)
    const expiry = Number(expiryRaw)
    if (!Number.isFinite(id) || !Number.isFinite(expiry)) return null
    if (Date.now() > expiry) {
      // Expired — clear
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(SEAT_EXPIRY_KEY)
      return null
    }
    return id
  } catch { return null }
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
  /** Reserve the current seat for 30 seconds (on tab leave). */
  reserveSeat: () => void
  unlock: () => void
  setOccupied: (map: Record<number, string>) => void
  markEntrancePlayed: () => void
}

function getInitialStage(): FlowStage {
  const saved = loadSavedSeatIfValid()
  if (saved != null) return 'seated' // Restore seat from tab leave
  saveSeat(null)
  return 'selecting'
}

function getInitialSeat(): number | null {
  return loadSavedSeatIfValid()
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
  /** Reserve the current seat for 30 seconds (tab leave). */
  reserveSeat: () => {
    const seatId = get().selectedSeatId
    if (seatId == null) return
    const expiry = Date.now() + SEAT_LOCK_MS
    saveSeatWithExpiry(seatId, expiry)
  },
  unlock: () => {
    saveSeat(null)
    set({ stage: 'selecting', selectedSeatId: null, seatLockUntil: null, lockedRoomId: null })
  },
  setOccupied: (map) => set({ occupied: map }),
  markEntrancePlayed: () => set({ entrancePlayed: true }),
}))

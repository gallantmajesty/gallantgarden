import { create } from 'zustand'
import { seatAnchors } from '../three/library/furniture'
import type { Seat } from '../three/library/furniture'

const STORAGE_KEY = 'library_last_seat'

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
  seats: Seat[]
  /** Map from seat id to occupant name */
  occupied: Record<number, string>
  /** Whether the cinematic entrance has played */
  entrancePlayed: boolean
  pickSeat: (id: number) => void
  clearSeat: () => void
  startWalk: () => void
  arrive: () => void
  unlock: () => void
  setOccupied: (map: Record<number, string>) => void
  markEntrancePlayed: () => void
}

function getInitialStage(): FlowStage {
  const saved = loadSavedSeat()
  const seats = seatAnchors()
  if (saved != null && saved < seats.length) return 'seated'
  // Clear invalid saved seat
  if (saved != null) saveSeat(null)
  return 'selecting'
}

function getInitialSeat(): number | null {
  const saved = loadSavedSeat()
  const seats = seatAnchors()
  if (saved != null && saved < seats.length) return saved
  return null
}

export const useSeatFlow = create<SeatFlowState>((set) => ({
  stage: getInitialStage(),
  selectedSeatId: getInitialSeat(),
  seatLockUntil: getInitialStage() === 'seated' ? Date.now() + 10 * 60 * 1000 : null,
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
      seatLockUntil: null,
    })
  },
  startWalk: () => set({ stage: 'walking' }),
  arrive: () => {
    const lockUntil = Date.now() + 10 * 60 * 1000
    set({ stage: 'seated', seatLockUntil: lockUntil })
  },
  unlock: () => {
    saveSeat(null)
    set({ stage: 'selecting', selectedSeatId: null, seatLockUntil: null })
  },
  setOccupied: (map) => set({ occupied: map }),
  markEntrancePlayed: () => set({ entrancePlayed: true }),
}))

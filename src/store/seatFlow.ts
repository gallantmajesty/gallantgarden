import { create } from 'zustand'
import { seatAnchors } from '../three/library/furniture'
import type { Seat } from '../three/library/furniture'

export type FlowStage = 'selecting' | 'spawning' | 'walking' | 'seated' | 'free'

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

export const useSeatFlow = create<SeatFlowState>((set) => ({
  stage: 'selecting',
  selectedSeatId: null,
  seatLockUntil: null,
  seats: seatAnchors(),
  occupied: {},
  entrancePlayed: false,
  pickSeat: (id) => set({ selectedSeatId: id }),
  clearSeat: () =>
    set({
      stage: 'selecting',
      selectedSeatId: null,
      seatLockUntil: null,
    }),
  startWalk: () => set({ stage: 'walking' }),
  arrive: () => {
    const lockUntil = Date.now() + 10 * 60 * 1000
    set({ stage: 'seated', seatLockUntil: lockUntil })
  },
  unlock: () => {
    set({ stage: 'free', seatLockUntil: null })
  },
  setOccupied: (map) => set({ occupied: map }),
  markEntrancePlayed: () => set({ entrancePlayed: true }),
}))

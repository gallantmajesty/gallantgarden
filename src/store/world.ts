import { create } from 'zustand'
import { useSeatFlow } from './seatFlow'

/** Runtime world interaction state (which seat the player occupies, and which
 *  seat they're standing close enough to sit on). */
interface WorldState {
  seat: number | null
  near: number | null
  sit: (id: number) => void
  stand: () => void
  setNear: (id: number | null) => void
}

export const useWorld = create<WorldState>((set) => ({
  seat: null,
  near: null,
  sit: (id) => set({ seat: id, near: null }),
  stand: () => {
    useSeatFlow.getState().unlock()
    useSeatFlow.getState().clearSeat()
    set({ seat: null })
  },
  setNear: (id) => set((s) => (s.near === id ? s : { near: id })),
}))

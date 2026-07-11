import { create } from 'zustand'
import { useSeatFlow } from './seatFlow'

/** Runtime world interaction state (which seat the player occupies, and which
 *  seat they're standing close enough to sit on). */
interface WorldState {
  seat: number | null
  near: number | null
  cinematic: boolean
  sit: (id: number) => void
  stand: () => void
  setNear: (id: number | null) => void
  setCinematic: (v: boolean) => void
}

export const useWorld = create<WorldState>((set) => ({
  seat: null,
  near: null,
  cinematic: false,
  sit: (id) => set({ seat: id, near: null, cinematic: false }),
  stand: () => {
    useSeatFlow.getState().unlock()
    useSeatFlow.getState().clearSeat()
    set({ seat: null, cinematic: false })
  },
  setNear: (id) => set((s) => (s.near === id ? s : { near: id })),
  setCinematic: (v) => set({ cinematic: v }),
}))

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
  sit: (id) => {
    // Lock seat-changing for 10 min from now — see SEAT_LOCK_MS in seatFlow.
    // Applies to the first sit and every re-sit, so the "change seat in MM:SS"
    // timer next to Stand up is enforced, not decorative.
    useSeatFlow.getState().lockSeat()
    set({ seat: id, near: null, cinematic: false })
  },
  stand: () => {
    useSeatFlow.getState().unlock()
    useSeatFlow.getState().clearSeat()
    set({ seat: null, cinematic: false })
  },
  setNear: (id) => set((s) => (s.near === id ? s : { near: id })),
  setCinematic: (v) => set({ cinematic: v }),
}))

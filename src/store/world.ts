import { create } from 'zustand'
import { useSeatFlow } from './seatFlow'
import { setLocalSeatId, publishSeatClaim, publishSeatRelease } from '../multiplayer/net'
import { useProfile } from './profile'

/** Runtime world interaction state (which seat the player occupies, and which
 *  seat they're standing close enough to sit on). */
interface WorldState {
  seat: number | null
  near: number | null
  cinematic: boolean
  renderPaused: boolean
  wakeLock: boolean
  cineFade: number
  sit: (id: number) => void
  stand: () => void
  setNear: (id: number | null) => void
  setCinematic: (v: boolean) => void
  setRenderPaused: (v: boolean) => void
  setWakeLock: (v: boolean) => void
  setCineFade: (v: number) => void
}

export const useWorld = create<WorldState>((set) => ({
  seat: null,
  near: null,
  cinematic: false,
  renderPaused: false,
  wakeLock: false,
  cineFade: 0,
  sit: (id) => {
    useSeatFlow.getState().lockSeat()
    setLocalSeatId(id)
    const name = useProfile.getState().displayName || 'Explorer'
    publishSeatClaim(id, name)
    set({ seat: id, near: null, cinematic: false })
  },
  stand: () => {
    const prevSeat = useWorld.getState().seat
    if (prevSeat != null) {
      publishSeatRelease(prevSeat)
      setLocalSeatId(undefined)
    }
    useSeatFlow.getState().unlock()
    useSeatFlow.getState().clearSeat()
    set({ seat: null, cinematic: false })
  },
  setNear: (id) => set((s) => (s.near === id ? s : { near: id })),
  setCinematic: (v) => set({ cinematic: v }),
  setRenderPaused: (v) => set({ renderPaused: v }),
  setWakeLock: (v) => set({ wakeLock: v }),
  setCineFade: (v) => set({ cineFade: v }),
}))

import { create } from 'zustand'

interface StationState {
  /** index (0..4) of the platform whose boarding zone the player is in, else null */
  nearPlatform: number | null
  setNearPlatform: (i: number | null) => void
  /** Player's last known station position (written every frame by StationPlayerController) */
  playerX: number
  playerZ: number
  playerYaw: number
  setPlayerPos: (x: number, z: number, yaw: number) => void
}

export const useStation = create<StationState>((set) => ({
  nearPlatform: null,
  setNearPlatform: (i) => set((s) => (s.nearPlatform === i ? s : { nearPlatform: i })),
  playerX: 0,
  playerZ: -30,
  playerYaw: Math.PI,
  setPlayerPos: (x, z, yaw) => set({ playerX: x, playerZ: z, playerYaw: yaw }),
}))

import { create } from 'zustand'

// Tiny ephemeral store for in-station interaction state that the 3D controller
// produces and the HUD consumes — chiefly which platform's boarding zone the
// player is currently standing in (so we can show "Press E to board the Night
// Express"). Kept separate from the journey store (which is durable, synced
// state) because this is throwaway per-frame UI glue.

interface StationState {
  /** index (0..4) of the platform whose boarding zone the player is in, else null */
  nearPlatform: number | null
  setNearPlatform: (i: number | null) => void
}

export const useStation = create<StationState>((set) => ({
  nearPlatform: null,
  setNearPlatform: (i) => set((s) => (s.nearPlatform === i ? s : { nearPlatform: i })),
}))

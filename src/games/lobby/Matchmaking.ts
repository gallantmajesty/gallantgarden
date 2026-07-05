// @ts-nocheck
// Matchmaking — group players on break, fill rooms, auto-start matches

import { create } from 'zustand'
import { useRealmNet, useRealmNet as _useRealmNet } from '../../multiplayer/net'

export const MAX_ROOM_SIZE = 8
export const MIN_PLAYERS_TO_START = 2
export const MATCH_START_TIMEOUT = 15 // seconds, auto-start even if room isn't full

export type LobbyPhase = 'waiting' | 'ready' | 'countdown' | 'in-progress'

interface LobbyPlayer {
  id: string
  name: string
  ready: boolean
  joinedAt: number
}

interface MatchmakingState {
  phase: LobbyPhase
  roomId: string | null
  players: LobbyPlayer[]
  countdown: number
  readyTimers: Record<string, boolean>

  joinRoom: (roomId: string) => void
  leaveRoom: () => void
  setReady: (id: string, ready: boolean) => void
  addPlayer: (id: string, name: string) => void
  removePlayer: (id: string) => void
  tick: () => void
  startMatch: () => void
  reset: () => void
}

export const useMatchmaking = create<MatchmakingState>((set, get) => ({
  phase: 'waiting',
  roomId: null,
  players: [],
  countdown: 0,
  readyTimers: {},

  joinRoom: (roomId) => set({ roomId, phase: 'waiting', players: [], countdown: 0 }),

  leaveRoom: () => {
    set({ roomId: null, phase: 'waiting', players: [], countdown: 0, readyTimers: {} })
  },

  setReady: (id, ready) => set((s) => ({
    readyTimers: { ...s.readyTimers, [id]: ready },
    players: s.players.map(p => p.id === id ? { ...p, ready } : p),
  })),

  addPlayer: (id, name) => set((s) => {
    if (s.players.find(p => p.id === id)) return s
    if (s.players.length >= MAX_ROOM_SIZE) return s
    return { players: [...s.players, { id, name, ready: false, joinedAt: Date.now() }] }
  }),

  removePlayer: (id) => set((s) => ({
    players: s.players.filter(p => p.id !== id),
    readyTimers: Object.fromEntries(Object.entries(s.readyTimers).filter(([k]) => k !== id)),
  })),

  tick: () => {
    const s = get()
    if (s.phase === 'waiting' || s.phase === 'ready') {
      const playerCount = s.players.length
      const readyCount = Object.values(s.readyTimers).filter(Boolean).length

      if (playerCount >= MAX_ROOM_SIZE || readyCount >= playerCount) {
        set({ phase: 'countdown', countdown: 5 })
        return
      }

      if (playerCount >= MIN_PLAYERS_TO_START) {
        // Check timeout: if enough time has passed since the first player joined
        const now = Date.now()
        const oldestJoin = Math.min(...s.players.map(p => p.joinedAt))
        if (now - oldestJoin >= MATCH_START_TIMEOUT * 1000) {
          set({ phase: 'countdown', countdown: 5 })
          return
        }
      }
    }

    if (s.phase === 'countdown') {
      const next = s.countdown - 1
      if (next <= 0) {
        set({ phase: 'in-progress', countdown: 0 })
      } else {
        set({ countdown: next })
      }
    }
  },

  startMatch: () => set({ phase: 'in-progress' }),

  reset: () => set({
    phase: 'waiting',
    players: [],
    countdown: 0,
    readyTimers: {},
  }),
}))

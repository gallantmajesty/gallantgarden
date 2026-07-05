// Lava Pad Match Store — zustand store for local match state

import { create } from 'zustand'
import type { LavaPadPlayerState, LavaPadPlatform, LavaPadPlatformSpecialState, MatchPhase, PlatformType } from './types'
import { ARENA_CONFIG, GAME_CONFIG, regenerateArena } from './arena'
import { useSessionStore } from './sessionStore'

export type { PlatformRuntime }

interface ResultsData {
  winnerId: string | null
  survivalTime: number
  placement: number
  totalPlayers: number
  matchDuration: number
  eliminationOrder: string[]
}

interface PlatformRuntime {
  id: string
  type: PlatformType
  x: number
  y: number
  z: number
  radius: number
  initialRadius: number
  height: number
  special: LavaPadPlatformSpecialState
}

interface LavaPadStore {
  phase: MatchPhase
  countdown: number
  timeElapsed: number
  players: Record<string, LavaPadPlayerState>
  winnerId: string | null
  survivors: number
  localPlayerId: string | null
  lavaY: number
  hoveredPlatform: string | null
  eliminationOrder: string[]
  platforms: PlatformRuntime[]
  results: ResultsData | null
  spectatorTargetIndex: number
  jumpState: 'idle' | 'anticipating' | 'jumping' | 'landing'
  jumpTimer: number
  disconnected: boolean
  disconnectedPlayerName: string | null

  setPhase: (phase: MatchPhase) => void
  setCountdown: (n: number) => void
  tick: (dt: number) => void
  addPlayer: (id: string, name: string) => void
  removePlayer: (id: string) => void
  handleDisconnect: (id: string, name: string) => void
  updatePlayer: (id: string, patch: Partial<LavaPadPlayerState>) => void
  setLocalPlayerId: (id: string) => void
  setHoveredPlatform: (id: string | null) => void
  getPlatformState: (id: string) => PlatformRuntime | undefined
  updatePlatform: (id: string, patch: Partial<PlatformRuntime>) => void
  cycleSpectatorTarget: () => void
  setJumpState: (state: 'idle' | 'anticipating' | 'jumping' | 'landing') => void
  reset: () => void
  regenerate: (seed?: number) => void
}

function initPlatforms(): PlatformRuntime[] {
  return ARENA_CONFIG.platforms.map(p => ({
    id: p.id,
    type: p.type,
    x: p.x,
    y: p.y,
    z: p.z,
    radius: p.radius,
    initialRadius: p.radius,
    height: p.height,
    special: buildSpecialState(p),
  }))
}

function buildSpecialState(p: LavaPadPlatform): LavaPadPlatformSpecialState {
  if (p.type === 'cracked') {
    return { cracked: { timeUntilBreak: GAME_CONFIG.platform.crackedBreakDelay, respawnTimer: 0, broken: false, breakDuration: GAME_CONFIG.platform.crackedBreakDelay, respawnDelay: GAME_CONFIG.platform.crackedRespawnDelay } }
  }
  if (p.type === 'moving') {
    const angleStep = (Math.PI * 2) / 8
    const r = Math.sqrt(p.x * p.x + p.z * p.z)
    return { moving: { path: Array.from({ length: 8 }, (_, i) => ({ x: Math.sin(angleStep * i) * r, z: Math.cos(angleStep * i) * r })), pathIndex: 0, speed: GAME_CONFIG.platform.movingSpeed, pauseTimer: 0 } }
  }
  if (p.type === 'shrinking') {
    return { shrinking: { progress: 0, occupied: false, minRadius: GAME_CONFIG.platform.shrinkingMinRadius, shrinkSpeed: GAME_CONFIG.platform.shrinkingSpeed, growSpeed: GAME_CONFIG.platform.shrinkingGrowSpeed } }
  }
  return {}
}

const initialMatch = {
  phase: 'waiting' as MatchPhase,
  countdown: 3,
  timeElapsed: 0,
  players: {} as Record<string, LavaPadPlayerState>,
  winnerId: null as string | null,
  survivors: 0,
  lavaY: ARENA_CONFIG.lava.initialY,
  hoveredPlatform: null as string | null,
  eliminationOrder: [] as string[],
  platforms: [] as PlatformRuntime[],
  results: null as ResultsData | null,
  spectatorTargetIndex: 0,
  jumpState: 'idle' as 'idle' | 'anticipating' | 'jumping' | 'landing',
  jumpTimer: 0,
  disconnected: false,
  disconnectedPlayerName: null as string | null,
}

export const useLavaPadStore = create<LavaPadStore>((set, get) => ({
  ...initialMatch,
  localPlayerId: null,
  platforms: initPlatforms(),

  setPhase: (phase) => set({ phase }),

  setCountdown: (countdown) => set({ countdown }),

  /** Set currently hovered platform ID for targeting */
  setHoveredPlatform: (id) => set({ hoveredPlatform: id }),

  /** Set player jump animation state */
  setJumpState: (jumpState) => set({ jumpState }),

  /** Get platform runtime state by ID */
  getPlatformState: (id) => get().platforms.find(p => p.id === id),

  /** Update platform runtime properties */
  updatePlatform: (id, patch) => set((s) => {
    const idx = s.platforms.findIndex(p => p.id === id)
    if (idx === -1) return s
    const next = [...s.platforms]
    next[idx] = { ...next[idx], ...patch }
    return { platforms: next }
  }),

  cycleSpectatorTarget: () => {
    const state = get()
    const alive = Object.values(state.players).filter(p => !p.eliminated)
    if (alive.length <= 1) return
    const next = (state.spectatorTargetIndex + 1) % alive.length
    const target = alive[next]
    if (state.localPlayerId) {
      get().updatePlayer(state.localPlayerId, { spectateTargetId: target.id })
    }
    set({ spectatorTargetIndex: next })
  },

  tick: (dt) => {
    const state = get()
    if (state.phase !== 'playing' && state.phase !== 'countdown') return

    // Pause lava rising during break segments — session schedule controls this.
    // When no session is active (legacy/immediate play), the lava always rises.
    const session = useSessionStore.getState()
    const lavaPaused = session.started && !session.finished && session.matchType !== null && !session.lavaActive

    const timeElapsed = state.timeElapsed + dt
    const lavaY = lavaPaused
      ? state.lavaY
      : ARENA_CONFIG.lava.initialY + ARENA_CONFIG.lava.riseSpeed * timeElapsed

    const updates: Partial<LavaPadStore> = { timeElapsed, lavaY }

    // Tick platform special states
    const updatedPlatforms = state.platforms.map(p => {
      const s = { ...p.special }

      if (s.cracked && !s.cracked.broken) {
        s.cracked = { ...s.cracked, timeUntilBreak: Math.max(0, s.cracked.timeUntilBreak - dt) }
        if (s.cracked.timeUntilBreak <= 0) {
          s.cracked.broken = true
          s.cracked.respawnTimer = s.cracked.respawnDelay
        }
      }
      if (s.cracked && s.cracked.broken) {
        s.cracked = { ...s.cracked, respawnTimer: Math.max(0, s.cracked.respawnTimer - dt) }
        if (s.cracked.respawnTimer <= 0) {
          s.cracked = { ...s.cracked, timeUntilBreak: s.cracked.breakDuration, broken: false }
        }
      }

      if (s.moving) {
        const m = s.moving
        if (m.pauseTimer > 0) {
          m.pauseTimer = Math.max(0, m.pauseTimer - dt)
        } else {
          m.pathIndex = (m.pathIndex + 1) % m.path.length
          if (m.pathIndex === 0) m.pauseTimer = 1
        }
        const targetPos = m.path[m.pathIndex]
        const dx = targetPos.x - p.x
        const dz = targetPos.z - p.z
        const dist = Math.sqrt(dx * dx + dz * dz)
        if (dist > 0.1) {
          const step = m.speed * dt
          p.x += (dx / dist) * step
          p.z += (dz / dist) * step
        }
      }

      if (s.shrinking) {
        const sh = s.shrinking
        if (sh.occupied && p.radius > sh.minRadius) {
          sh.progress = Math.min(1, sh.progress + sh.shrinkSpeed * dt)
          p.radius = p.initialRadius - (p.initialRadius - sh.minRadius) * sh.progress
        } else if (!sh.occupied && p.radius < p.initialRadius) {
          sh.progress = Math.max(0, sh.progress - sh.growSpeed * dt)
          p.radius = p.initialRadius - (p.initialRadius - sh.minRadius) * sh.progress
        }
      }

      return { ...p, special: s }
    })

    if (state.phase === 'playing') {
      const maxDurPassed = ARENA_CONFIG.match.maxDuration > 0 && timeElapsed >= ARENA_CONFIG.match.maxDuration

      // Check elimination by lava
      for (const player of Object.values(state.players)) {
        if (player.eliminated) continue
        // Skip players in mid-jump — their actual position handles it
        if (player.targetPlatformId && player.jumpProgress > 0) continue
        const platform = updatedPlatforms.find(p => p.id === player.platformId)
        if (!platform) {
          get().updatePlayer(player.id, { eliminated: true, eliminationTime: timeElapsed })
          continue
        }
        const playerY = platform.y + 1
        if (playerY <= lavaY + 0.5) {
          get().updatePlayer(player.id, { eliminated: true, eliminationTime: timeElapsed, survivalTime: timeElapsed })
        }
      }

      let alive = Object.values(get().players).filter(p => !p.eliminated)
      updates.survivors = alive.length
      updates.platforms = updatedPlatforms

      // Mark shrinking platforms as occupied
      for (const platform of updatedPlatforms) {
        if (platform.special.shrinking) {
          const isOccupied = alive.some(p => p.platformId === platform.id)
          platform.special.shrinking.occupied = isOccupied
        }
      }

      // Check elimination for players on cracked platforms that just broke
      for (const player of Object.values(get().players)) {
        if (player.eliminated) continue
        if (player.targetPlatformId && player.jumpProgress > 0) continue
        const platform = updatedPlatforms.find(p => p.id === player.platformId)
        if (platform?.special.cracked?.broken) {
          get().updatePlayer(player.id, { eliminated: true, eliminationTime: timeElapsed, survivalTime: timeElapsed })
        }
      }

      alive = Object.values(get().players).filter(p => !p.eliminated)
      updates.survivors = alive.length

      if (alive.length <= 1 && Object.keys(state.players).length > 1) {
        updates.phase = 'finished'
        updates.winnerId = alive[0]?.id ?? null
        // Build results
        const elimOrder = Object.values(get().players)
          .filter(p => p.eliminated)
          .sort((a, b) => a.eliminationTime - b.eliminationTime)
          .map(p => p.id)
        if (alive[0]) elimOrder.push(alive[0].id)
        updates.eliminationOrder = elimOrder
        // Assign placements
        for (let i = 0; i < elimOrder.length; i++) {
          get().updatePlayer(elimOrder[i], { placement: elimOrder.length - i })
        }
        updates.results = {
          winnerId: alive[0]?.id ?? null,
          survivalTime: timeElapsed,
          placement: alive[0] ? elimOrder.length : elimOrder.indexOf(state.localPlayerId ?? '') + 1,
          totalPlayers: Object.keys(state.players).length,
          matchDuration: timeElapsed,
          eliminationOrder: elimOrder,
        }
      }

      if (maxDurPassed && alive.length > 1) {
        updates.phase = 'finished'
        updates.winnerId = null
      }
    }

    if (state.phase === 'countdown') {
      const next = Math.max(0, state.countdown - dt)
      updates.countdown = Math.ceil(next)
      if (next <= 0) {
        updates.phase = 'playing'
        updates.countdown = 0
      }
    }

    set(updates)
  },

  /** Initialize player for match */
  addPlayer: (id, name) => set((s) => {
    if (s.players[id]) return s
    const spawns = s.platforms.filter(p => p.type === 'spawn')
    const spawn = spawns.length > 0 ? spawns[Math.floor(Math.random() * spawns.length)] : s.platforms[0]
    return {
      players: {
        ...s.players,
        [id]: {
          id, name,
          platformId: spawn?.id ?? null,
          targetPlatformId: null,
          jumpProgress: 0,
          jumpStartTime: 0,
          jumpDuration: GAME_CONFIG.player.jumpDuration,
          eliminated: false,
          eliminationTime: 0,
          placement: 0,
          spectating: false,
          spectateTargetId: null,
          survivalTime: 0,
        },
      },
    }
  }),

  /** Remove player from match */
  removePlayer: (id) => set((s) => {
    const { [id]: _unused, ...rest } = s.players
    void _unused
    return { players: rest }
  }),

/** Handle player disconnection during match */
  handleDisconnect: (id, name) => set((s) => {
    const { [id]: _unused, ...rest } = s.players
    void _unused
    const alive = Object.values(rest).filter(p => !p.eliminated)
    const updates: Partial<LavaPadStore> = {
      players: rest,
      disconnectedPlayerName: name,
    }
    if (s.phase === 'playing' && alive.length <= 1 && Object.keys(rest).length > 1) {
      updates.phase = 'finished'
      updates.winnerId = alive[0]?.id ?? null
      updates.disconnected = true
    }
    return updates
  }),

  updatePlayer: (id, patch) => set((s) => {
    const existing = s.players[id]
    if (!existing) return s
    return { players: { ...s.players, [id]: { ...existing, ...patch } } }
  }),

  setLocalPlayerId: (id) => set({ localPlayerId: id }),

  regenerate: (seed) => {
    const cfg = regenerateArena(seed)
    set({ platforms: initPlatforms(), lavaY: cfg.lava.initialY })
  },

  reset: () => set({
    ...initialMatch,
    players: {},
    localPlayerId: null,
    hoveredPlatform: null,
    platforms: initPlatforms(),
    results: null,
    eliminationOrder: [],
    spectatorTargetIndex: 0,
    jumpState: 'idle',
    jumpTimer: 0,
  }),
}))

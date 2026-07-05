// Lava Pad Session Store — tracks the chosen match type, play mode, and live schedule

import { create } from 'zustand'
import type { SessionType, PlayMode, MatchTypeConfig } from './matchSchedule'
import { getMatchType, getActiveSegment, currentBreakRemaining, matchTimeRemaining } from './matchSchedule'

export interface SessionScheduleState {
  /** Selected session type — null until the user picks one */
  sessionType: SessionType | null
  /** Player vs multiplayer */
  playMode: PlayMode
  /** Resolved match type config (null until sessionType chosen) */
  matchType: MatchTypeConfig | null
  /** Seconds elapsed in the session overall (includes breaks) */
  elapsedSeconds: number
  /** Whether the session has started */
  started: boolean
  /** Whether the session has finished */
  finished: boolean
  /** True only while the lava is active and gameplay expected */
  lavaActive: boolean
  /** Label of the current segment (e.g. "Game 1", "Break 1") */
  currentSegmentLabel: string
  /** Seconds remaining in the current break (0 if not on break) */
  breakRemaining: number
  /** Seconds remaining in the whole match */
  matchRemaining: number

  selectSessionType: (id: SessionType) => void
  selectPlayMode: (mode: PlayMode) => void
  beginSession: () => void
  tick: (dt: number) => void
  reset: () => void
}

export const useSessionStore = create<SessionScheduleState>((set, get) => ({
  sessionType: null,
  playMode: 'single',
  matchType: null,
  elapsedSeconds: 0,
  started: false,
  finished: false,
  lavaActive: false,
  currentSegmentLabel: '',
  breakRemaining: 0,
  matchRemaining: 0,

  selectSessionType: (id) => {
    const matchType = getMatchType(id)
    set({
      sessionType: id,
      matchType,
      elapsedSeconds: 0,
      started: false,
      finished: false,
      lavaActive: false,
      currentSegmentLabel: '',
      breakRemaining: 0,
      matchRemaining: matchType.totalMinutes * 60,
    })
  },

  selectPlayMode: (mode) => set({ playMode: mode }),

  beginSession: () => {
    const { matchType } = get()
    if (!matchType) return
    const seg = getActiveSegment(matchType, 0)
    set({
      started: true,
      finished: false,
      elapsedSeconds: 0,
      lavaActive: seg ? seg.active : false,
      currentSegmentLabel: seg ? seg.label : '',
      breakRemaining: seg && !seg.active ? (seg.endMin - seg.startMin) * 60 : 0,
      matchRemaining: matchType.totalMinutes * 60,
    })
  },

  tick: (dt) => {
    const s = get()
    if (!s.started || s.finished || !s.matchType) return
    const nextElapsed = s.elapsedSeconds + dt
    const elapsedMin = nextElapsed / 60
    const seg = getActiveSegment(s.matchType, elapsedMin)
    const matchRemaining = matchTimeRemaining(s.matchType, elapsedMin)
    const breakRem = currentBreakRemaining(s.matchType, elapsedMin)

    const finished = matchRemaining <= 0

    set({
      elapsedSeconds: nextElapsed,
      lavaActive: seg ? seg.active : false,
      currentSegmentLabel: seg ? seg.label : '',
      breakRemaining: breakRem,
      matchRemaining,
      finished,
    })
  },

  reset: () => set({
    sessionType: null,
    playMode: 'single',
    matchType: null,
    elapsedSeconds: 0,
    started: false,
    finished: false,
    lavaActive: false,
    currentSegmentLabel: '',
    breakRemaining: 0,
    matchRemaining: 0,
  }),
}))
import { create } from 'zustand'
import { useSettings } from './settings'
import { getAmbient } from '../audio/ambient'

// ---- Types ----

export type TimerType = 'focus' | 'pomodoro'
export type PomoPhase = 'idle' | 'running' | 'break' | 'paused' | 'finished'

export interface SegmentReward {
  segmentIndex: number
  minutes: number
  leaves: number
  noTabBonus: number
  subjectBonus: number
}

interface PomodoroState {
  // Config
  timerType: TimerType
  sessionMinutes: number     // total session length in minutes (60, 120, 180, 240, 360, 480)
  breakCount: number         // number of breaks (0 for focus mode, 1-5 for pomodoro)

  // Runtime
  phase: PomoPhase
  remaining: number          // seconds left in current phase
  totalElapsed: number       // seconds elapsed in current session
  segmentIndex: number       // which segment we're in (0-based)
  segmentsCompleted: number  // how many segments finished
  running: boolean
  subject: string
  startedAt: number | null
  pausedAt: number | null

  // Tab tracking
  tabAlwaysVisible: boolean
  tabLeftAt: number | null
  tabReturnDeadline: number | null  // 60s grace period end

  // XP
  pendingRewards: SegmentReward[]
  totalSessionLeaves: number
  lastReward: SegmentReward | null

  // Stats
  completed: number
  totalFocusMin: number

  // Actions
  configure: (type: TimerType, sessionMin: number, breaks: number) => void
  toggle: () => void
  forfeit: () => void
  tick: () => void
  onTabHidden: () => void
  onTabVisible: () => void
  setSubject: (s: string) => void
  clearReward: () => void
}

// ---- Constants ----

const MINIMUM_SESSION_SEC = 5 * 60    // 5 minutes minimum before any XP
const TAB_GRACE_SEC = 60               // 60 seconds to return before forced pause
const XP_PER_MIN = 1.32               // base leaves per minute

const SESSION_OPTIONS = [60, 120, 180, 240, 360, 480] // minutes

// ---- Focus Sink ----

type FocusSink = (minutes: number, subject: string) => void
let focusSink: FocusSink | null = null
export function setPomodoroFocusSink(sink: FocusSink | null): void {
  focusSink = sink
}

// ---- Persistence helpers ----

const DONE_KEY = 'sg.pomo.completed'
const MIN_KEY = 'sg.pomo.totalmin'
const SUBJECT_KEY = 'sg.pomo.subject'

function loadNum(key: string): number {
  try {
    const raw = localStorage.getItem(key)
    const n = raw ? Number(raw) : 0
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch { return 0 }
}

function saveNum(key: string, n: number) {
  try { localStorage.setItem(key, String(n)) } catch { /* ignore */ }
}

function loadStr(key: string): string {
  try { return localStorage.getItem(key) ?? '' } catch { return '' }
}

function saveStr(key: string, v: string) {
  try { localStorage.setItem(key, v) } catch { /* ignore */ }
}

// ---- Segment calculation ----

/** Given total session minutes and break count, compute segment durations in minutes.
 *  Breaks are placed evenly. Each segment = total / (breakCount + 1) */
function computeSegments(totalMin: number, breakCount: number): number[] {
  if (breakCount <= 0) return [totalMin]
  const segCount = breakCount + 1
  const base = Math.floor(totalMin / segCount)
  const remainder = totalMin - base * segCount
  const segs: number[] = []
  for (let i = 0; i < segCount; i++) {
    segs.push(base + (i < remainder ? 1 : 0))
  }
  return segs
}

/** Calculate XP for a single segment */
function calcSegmentXP(minutes: number, tabVisible: boolean, hasSubject: boolean): SegmentReward['leaves'] {
  const base = Math.round(minutes * XP_PER_MIN)
  const noTab = tabVisible ? Math.round(base * 0.30) : 0
  const subj = hasSubject ? 5 : 0
  return base + noTab + subj
}

// ---- Store ----

export const usePomodoro = create<PomodoroState>((set, get) => {

  function awardSegment(state: PomodoroState): PomodoroState {
    const segMin = computeSegments(state.sessionMinutes, state.breakCount)
    const minutes = segMin[state.segmentIndex] ?? 25
    const leaves = calcSegmentXP(minutes, state.tabAlwaysVisible, state.subject.length > 0)
    const reward: SegmentReward = {
      segmentIndex: state.segmentIndex,
      minutes,
      leaves,
      noTabBonus: state.tabAlwaysVisible ? Math.round(Math.round(minutes * XP_PER_MIN) * 0.30) : 0,
      subjectBonus: state.subject.length > 0 ? 5 : 0,
    }
    focusSink?.(minutes, state.subject)
    return {
      ...state,
      segmentsCompleted: state.segmentsCompleted + 1,
      segmentIndex: state.segmentIndex + 1,
      pendingRewards: [...state.pendingRewards, reward],
      lastReward: reward,
      totalSessionLeaves: state.totalSessionLeaves + leaves,
    }
  }

  return {
    timerType: 'focus',
    sessionMinutes: 60,
    breakCount: 0,
    phase: 'idle',
    remaining: 0,
    totalElapsed: 0,
    segmentIndex: 0,
    segmentsCompleted: 0,
    running: false,
    subject: loadStr(SUBJECT_KEY),
    startedAt: null,
    pausedAt: null,
    tabAlwaysVisible: true,
    tabLeftAt: null,
    tabReturnDeadline: null,
    pendingRewards: [],
    totalSessionLeaves: 0,
    lastReward: null,
    completed: loadNum(DONE_KEY),
    totalFocusMin: loadNum(MIN_KEY),

    setSubject: (subject) => {
      saveStr(SUBJECT_KEY, subject)
      set({ subject })
    },

    clearReward: () => set({ lastReward: null }),

    configure: (type, sessionMin, breaks) => {
      set({
        timerType: type,
        sessionMinutes: sessionMin,
        breakCount: type === 'focus' ? 0 : breaks,
      })
    },

    toggle: () => {
      const s = get()
      if (s.phase === 'idle') {
        const segments = computeSegments(s.sessionMinutes, s.breakCount)
        const firstSegMin = segments[0]
        set({
          phase: 'running',
          remaining: firstSegMin * 60,
          running: true,
          startedAt: Date.now(),
          totalElapsed: 0,
          segmentIndex: 0,
          segmentsCompleted: 0,
          pendingRewards: [],
          totalSessionLeaves: 0,
          lastReward: null,
          tabAlwaysVisible: true,
          tabLeftAt: null,
          tabReturnDeadline: null,
        })
      } else if (s.phase === 'paused') {
        // Return from tab switch — resume
        set({ phase: 'running', running: true, pausedAt: null, tabLeftAt: null, tabReturnDeadline: null })
      } else {
        // Pause/resume
        set({ running: !s.running })
      }
    },

    forfeit: () => {
      const s = get()
      // If minimum time passed, award partial XP for completed segments only
      if (s.totalElapsed >= MINIMUM_SESSION_SEC && s.segmentsCompleted > 0) {
        const totalMin = s.totalElapsed / 60
        const existingMin = loadNum(MIN_KEY)
        saveNum(MIN_KEY, existingMin + Math.round(totalMin))
        const completed = s.completed + 1
        saveNum(DONE_KEY, completed)
      }
      set({
        phase: 'idle',
        remaining: 0,
        totalElapsed: 0,
        running: false,
        startedAt: null,
        pausedAt: null,
        segmentIndex: 0,
        segmentsCompleted: 0,
        pendingRewards: [],
        totalSessionLeaves: 0,
        lastReward: null,
        tabAlwaysVisible: true,
        tabLeftAt: null,
        tabReturnDeadline: null,
      })
    },

    tick: () => {
      const s = get()
      if (!s.running || s.phase !== 'running') return

      const pomo = useSettings.getState().pomo

      if (s.remaining > 1) {
        const newElapsed = s.totalElapsed + 1
        set({ remaining: s.remaining - 1, totalElapsed: newElapsed })
      } else {
        // Segment or session complete
        const segments = computeSegments(s.sessionMinutes, s.breakCount)
        const state = get()
        const updated = awardSegment(state)

        if (updated.segmentIndex >= segments.length) {
          // All segments done — session complete
          const totalMin = state.sessionMinutes
          const existingMin = loadNum(MIN_KEY)
          saveNum(MIN_KEY, existingMin + totalMin)
          const completed = updated.completed + 1
          saveNum(DONE_KEY, completed)
          if (pomo.sound) getAmbient().chime()
          set({
            ...updated,
            phase: 'finished',
            remaining: 0,
            running: false,
            startedAt: null,
            completed,
            totalFocusMin: existingMin + totalMin,
          })
        } else {
          // Break time (pomodoro mode)
          if (pomo.sound) getAmbient().chime()
          const breakMin = Math.max(2, Math.round(state.sessionMinutes / (state.breakCount + 1) * 0.2))
          set({
            ...updated,
            phase: 'break',
            remaining: breakMin * 60,
            running: true,
          })
        }
      }
    },

    onTabHidden: () => {
      const s = get()
      if (s.phase !== 'running') return
      const now = Date.now()
      set({
        running: false,
        tabLeftAt: now,
        tabReturnDeadline: now + TAB_GRACE_SEC * 1000,
        tabAlwaysVisible: false,
      })
    },

    onTabVisible: () => {
      const s = get()
      if (s.phase !== 'running' && s.phase !== 'paused') return
      const now = Date.now()

      // If we have a deadline and it passed, auto-pause
      if (s.tabReturnDeadline && now > s.tabReturnDeadline) {
        set({ phase: 'paused', running: false, tabLeftAt: null, tabReturnDeadline: null })
        return
      }

      // If tab was hidden and we're still in grace period, resume
      if (s.tabLeftAt) {
        set({ running: true, tabLeftAt: null, tabReturnDeadline: null })
      }
    },
  }
})

// ---- Tab visibility listener (auto-manages) ----

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      usePomodoro.getState().onTabHidden()
    } else {
      usePomodoro.getState().onTabVisible()
    }
  })
}

// ---- Helper exports ----

export { SESSION_OPTIONS, XP_PER_MIN, MINIMUM_SESSION_SEC, TAB_GRACE_SEC, computeSegments }

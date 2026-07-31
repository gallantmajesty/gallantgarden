import { create } from 'zustand'
import { useSettings } from './settings'
import { getAmbient } from '../audio/ambient'

// ---- Types ----

export type TimerType = 'focus' | 'pomodoro' | 'tabata'
export type PomoPhase = 'idle' | 'running' | 'break' | 'paused' | 'finished'

export interface SegmentReward {
  segmentIndex: number
  minutes: number
  leaves: number
  noTabBonus: number
  subjectBonus: number
}

// Custom break durations per index (0-based)
export interface BreakDurations {
  [breakIndex: number]: number // duration in minutes
}

// Timer Presets
export interface TimerPreset {
  id: string
  name: string
  timerType: TimerType
  sessionMinutes: number
  breakCount: number
  breakDurations: BreakDurations
  createdAt: number
}

// Session History
export interface SessionHistoryEntry {
  id: string
  date: string // ISO string
  timerType: TimerType
  sessionMinutes: number
  breakCount: number
  breakDurations: BreakDurations
  totalFocusMinutes: number
  leavesEarned: number
  completed: boolean
  subject: string
  segmentRewards: SegmentReward[]
}

export interface SessionSummary {
  totalSessions: number
  totalFocusMinutes: number
  totalLeavesEarned: number
  completedSessions: number
  averageSessionLength: number
  currentStreak: number
  longestStreak: number
  sessionsByType: { focus: number; pomodoro: number; tabata: number }
  sessionsByDay: { [date: string]: number }
  recentSessions: SessionHistoryEntry[]
}

// Break activity suggestions
export const BREAK_ACTIVITIES = [
  { id: 'stretch', label: 'Stretch', icon: '🧘', duration: 60 },
  { id: 'walk', label: 'Walk', icon: '🚶', duration: 120 },
  { id: 'hydrate', label: 'Hydrate', icon: '💧', duration: 30 },
  { id: 'eyes', label: 'Eye Rest', icon: '👁️', duration: 30 },
  { id: 'breathe', label: 'Breathe', icon: '🫁', duration: 60 },
  { id: 'snack', label: 'Snack', icon: '🍎', duration: 60 },
  { id: 'social', label: 'Chat', icon: '💬', duration: 120 },
  { id: 'music', label: 'Music', icon: '🎵', duration: 60 },
] as const

export interface TimerPreset {
  id: string
  name: string
  timerType: TimerType
  sessionMinutes: number
  breakCount: number
  breakDurations: Record<number, number>
  createdAt: number
}

export interface SessionHistoryEntry {
  id: string
  date: string
  timerType: TimerType
  sessionMinutes: number
  breakCount: number
  breakDurations: Record<number, number>
  completed: boolean
  totalFocusMinutes: number
  leavesEarned: number
  subject: string
}

export interface SessionSummary {
  totalSessions: number
  totalFocusMinutes: number
  totalLeavesEarned: number
  completedSessions: number
  averageSessionLength: number
  currentStreak: number
  longestStreak: number
  sessionsByType: Record<TimerType, number>
  sessionsByDay: Record<string, number> // ISO date -> count
  recentSessions: SessionHistoryEntry[]
}

// Custom break durations per index (0-based)
export interface BreakDurations {
  [breakIndex: number]: number // duration in minutes
}

interface PomodoroState {
  // Config
  timerType: TimerType
  sessionMinutes: number     // total session length in minutes (60, 120, 180, 240, 360, 480)
  breakCount: number         // number of breaks (0 for focus mode, 1-8 for pomodoro)
  breakDurations: BreakDurations  // custom break durations per index

  // Presets
  presets: TimerPreset[]

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

  // History
  history: SessionHistoryEntry[]

  // Actions
  configure: (type: TimerType, sessionMin: number, breaks: number, breakDurations?: BreakDurations) => void
  setBreakDuration: (breakIndex: number, minutes: number) => void
  resetBreakDurations: () => void
  toggle: () => void
  forfeit: () => void
  tick: () => void
  onTabHidden: () => void
  onTabVisible: () => void
  setSubject: (s: string) => void
  clearReward: () => void
  setTabataRounds: (v: number) => void
  setTabataWorkSec: (v: number) => void
  setTabataRestSec: (v: number) => void

  // Preset actions
  addPreset: (preset: Omit<TimerPreset, 'id' | 'createdAt'>) => void
  updatePreset: (id: string, updates: Partial<TimerPreset>) => void
  deletePreset: (id: string) => void
  loadPreset: (id: string) => void

  // History actions
  addToHistory: (entry: Omit<SessionHistoryEntry, 'id'>) => void
  clearHistory: () => void
  getSessionSummary: () => SessionSummary

  // Auto-start
  setAutoStartNext: (v: boolean) => void

  // Tabata settings
  setTabataRounds: (v: number) => void
  setTabataWorkSec: (v: number) => void
  setTabataRestSec: (v: number) => void
}

// ---- Constants ----

const MINIMUM_SESSION_SEC = 5 * 60    // 5 minutes minimum before any XP
const TAB_GRACE_SEC = 60               // 60 seconds to return before forced pause
const XP_PER_MIN = 1.32               // base leaves per minute

const SESSION_OPTIONS = [60, 120, 180, 240, 360, 480] // minutes

// Default break duration calculation (when not customized)
function defaultBreakDuration(totalMin: number, breakCount: number, breakIndex: number): number {
  // Even split by default, with a minimum of 2 minutes
  const evenSplit = Math.round(totalMin / (breakCount + 1) * 0.2)
  return Math.max(2, evenSplit)
}

// Long break after every 4 segments (traditional Pomodoro)
function defaultLongBreakDuration(totalMin: number, breakCount: number, breakIndex: number): number {
  // Every 4th break (index 3, 7, 11...) is a long break (15-30 min)
  const isLongBreak = (breakIndex + 1) % 4 === 0
  if (isLongBreak) return Math.max(15, Math.round(totalMin / (breakCount + 1) * 0.5))
  return defaultBreakDuration(totalMin, breakCount, breakIndex)
}

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

// ---- Break duration management ----

const BREAK_DURATIONS_KEY = 'sg.pomo.breakDurations'

function loadBreakDurations(): Record<number, number> {
  try {
    const raw = localStorage.getItem(BREAK_DURATIONS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveBreakDurations(durations: Record<number, number>) {
  try { localStorage.setItem(BREAK_DURATIONS_KEY, JSON.stringify(durations)) } catch { /* ignore */ }
}

// ---- Preset persistence ----

const PRESETS_KEY = 'sg.pomo.presets'

function loadPresets(): TimerPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function savePresets(presets: TimerPreset[]) {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)) } catch { /* ignore */ }
}

// ---- History persistence ----

const HISTORY_KEY = 'sg.pomo.history'

function loadHistory(): SessionHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveHistory(history: SessionHistoryEntry[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)) } catch { /* ignore */ }
}

// ---- Segment calculation ----

/** Given total session minutes, break count, and custom break durations, compute segment durations in minutes.
 *  Breaks are placed evenly. Each segment = total / (breakCount + 1) by default, but custom durations override. */
function computeSegments(totalMin: number, breakCount: number, breakDurations?: Record<number, number>): number[] {
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

/** Get the duration of a specific break in minutes */
function getBreakDuration(breakIndex: number, totalMin: number, breakCount: number, customDurations?: Record<number, number>): number {
  if (customDurations && customDurations[breakIndex] !== undefined) {
    return customDurations[breakIndex]
  }
  // Default: traditional pomodoro - short breaks (5 min), long break after 4 segments (15-30 min)
  const isLongBreak = (breakIndex + 1) % 4 === 0
  return isLongBreak ? 15 : 5
}

/** Get all break durations for a session */
function getAllBreakDurations(totalMin: number, breakCount: number, customDurations?: Record<number, number>): number[] {
  return Array.from({ length: breakCount }, (_, i) => getBreakDuration(i, totalMin, breakCount, customDurations))
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
    const segMin = computeSegments(state.sessionMinutes, state.breakCount, state.breakDurations)
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
    breakDurations: {},
    tabataRounds: 8,
    tabataWorkSec: 20,
    tabataRestSec: 10,
    presets: loadPresets(),
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
    history: loadHistory(),

    setSubject: (subject) => {
      saveStr(SUBJECT_KEY, subject)
      set({ subject })
    },

    clearReward: () => set({ lastReward: null }),

    configure: (type, sessionMin, breaks, breakDurations = {}) => {
      set({
        timerType: type,
        sessionMinutes: sessionMin,
        breakCount: type === 'focus' ? 0 : breaks,
        breakDurations,
      })
    },

    setBreakDuration: (breakIndex: number, minutes: number) => {
      set((state) => ({
        breakDurations: { ...state.breakDurations, [breakIndex]: minutes }
      }))
    },

    resetBreakDurations: () => {
      set({ breakDurations: {} })
    },

    setTabataRounds: (v: number) => {
      set({ tabataRounds: v })
    },

    setTabataWorkSec: (v: number) => {
      set({ tabataWorkSec: v })
    },

    setTabataRestSec: (v: number) => {
      set({ tabataRestSec: v })
    },

    toggle: () => {
      const s = get()
      if (s.phase === 'idle') {
        const segments = computeSegments(s.sessionMinutes, s.breakCount, s.breakDurations)
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
        breakDurations: {},
      })
    },

    tick: () => {
      const s = get()
      if (!s.running) return
      const pomo = useSettings.getState().pomo

      if (s.phase === 'break') {
        if (s.remaining > 1) {
          set({ remaining: s.remaining - 1 })
        } else {
          if (pomo.sound) getAmbient().chime()
          const segments = computeSegments(s.sessionMinutes, s.breakCount, s.breakDurations)
          const nextMin = segments[s.segmentIndex] ?? 25
          if (pomo.autoStart && s.timerType === 'pomodoro' && s.segmentIndex < segments.length) {
            set({
              phase: 'running',
              remaining: nextMin * 60,
              running: true,
              startedAt: Date.now(),
            })
          } else {
            set({
              phase: 'running',
              remaining: nextMin * 60,
            })
          }
        }
        return
      }

      if (s.phase !== 'running') return

      if (s.remaining > 1) {
        const newElapsed = s.totalElapsed + 1
        set({ remaining: s.remaining - 1, totalElapsed: newElapsed })
      } else {
        // Segment or session complete
        const segments = computeSegments(s.sessionMinutes, s.breakCount, s.breakDurations)
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
          
          // Add to history
          const historyEntry = {
            date: new Date().toISOString(),
            timerType: state.timerType,
            sessionMinutes: state.sessionMinutes,
            breakCount: state.breakCount,
            breakDurations: state.breakDurations,
            completed: true,
            totalFocusMinutes: state.sessionMinutes,
            leavesEarned: updated.totalSessionLeaves,
            subject: state.subject,
            segmentRewards: updated.pendingRewards,
          }
          get().addToHistory(historyEntry)
          
          // Auto-start next session
          if (pomo.autoStart && state.timerType === 'pomodoro') {
            set({
              ...updated,
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
              breakDurations: {},
              completed,
              totalFocusMin: existingMin + totalMin,
            })
          } else {
            set({
              ...updated,
              phase: 'finished',
              remaining: 0,
              running: false,
              startedAt: null,
              completed,
              totalFocusMin: existingMin + totalMin,
            })
          }
        } else {
          // Break time (pomodoro mode)
          if (pomo.sound) getAmbient().chime()
          // Use custom break duration if set, otherwise default to 5min short break, 15min long break (every 4th)
          const breakIndex = updated.segmentIndex - 1 // segmentIndex was incremented in awardSegment
          const defaultBreakMin = (breakIndex + 1) % 4 === 0 ? 15 : 5
          const breakMin = s.breakDurations[breakIndex] ?? defaultBreakMin
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

    // Preset actions
    addPreset: (preset) => {
      const newPreset: TimerPreset = {
        ...preset,
        id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        createdAt: Date.now(),
      }
      const presets = [...loadPresets(), newPreset]
      savePresets(presets)
      set({ presets })
    },

    updatePreset: (id, updates) => {
      const presets = loadPresets().map((p) => (p.id === id ? { ...p, ...updates } : p))
      savePresets(presets)
      set({ presets })
    },

    deletePreset: (id) => {
      const presets = loadPresets().filter((p) => p.id !== id)
      savePresets(presets)
      set({ presets })
    },

    loadPreset: (id) => {
      const preset = loadPresets().find((p) => p.id === id)
      if (preset) {
        set({
          timerType: preset.timerType,
          sessionMinutes: preset.sessionMinutes,
          breakCount: preset.breakCount,
          breakDurations: preset.breakDurations,
        })
      }
    },

    // History actions
    addToHistory: (entry) => {
      const newEntry: SessionHistoryEntry = {
        ...entry,
        id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      }
      const history = [newEntry, ...loadHistory()].slice(0, 1000) // Keep last 1000 sessions
      saveHistory(history)
      set({ history })
    },

    clearHistory: () => {
      saveHistory([])
      set({ history: [] })
    },

    getSessionSummary: () => {
      const history = loadHistory()
      const summary: SessionSummary = {
        totalSessions: history.length,
        totalFocusMinutes: history.reduce((sum, s) => sum + s.totalFocusMinutes, 0),
        totalLeavesEarned: history.reduce((sum, s) => sum + s.leavesEarned, 0),
        completedSessions: history.filter((s) => s.completed).length,
        averageSessionLength: history.length > 0
          ? history.reduce((sum, s) => sum + s.totalFocusMinutes, 0) / history.length
          : 0,
        currentStreak: 0,
        longestStreak: 0,
         sessionsByType: { focus: 0, pomodoro: 0, tabata: 0 },
        sessionsByDay: {},
        recentSessions: history.slice(0, 10),
      }

      // Calculate streak
      const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      let streak = 0
      let longestStreak = 0
      let lastDate: Date | null = null

      for (const session of sortedHistory) {
        const sessionDate = new Date(session.date)
        sessionDate.setHours(0, 0, 0, 0)

        if (!lastDate) {
          lastDate = sessionDate
          streak = 1
        } else {
          const diffDays = Math.floor((lastDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))
          if (diffDays === 1) {
            streak++
          } else if (diffDays > 1) {
            streak = 1
          }
        }
        lastDate = sessionDate
        longestStreak = Math.max(longestStreak, streak)
      }

      summary.currentStreak = streak
      summary.longestStreak = longestStreak

      // Count by type
      for (const session of history) {
        summary.sessionsByType[session.timerType]++
      }

      // Count by day
      for (const session of history) {
        const day = session.date.split('T')[0]
        summary.sessionsByDay[day] = (summary.sessionsByDay[day] || 0) + 1
      }

      return summary
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

export {
  SESSION_OPTIONS,
  XP_PER_MIN,
  MINIMUM_SESSION_SEC,
  TAB_GRACE_SEC,
  computeSegments,
  getBreakDuration,
  getAllBreakDurations,
  type TimerPreset,
  type SessionHistoryEntry,
  type SessionSummary,
  type TimerType,
  type PomoPhase,
  type SegmentReward,
  type BreakDurations,
}

// Focus timer store — Easy / Medium / Hardcore tiers, segments, breaks,
// split-vs-end rewards, tab + fullscreen enforcement, history & presets.
//
// Tier model (see store/hardcore.ts for the enforcement store):
//   Easy     — tab tracking only, no pressure: leaving the tab simply PAUSES
//              the timer; coming back resumes it. Nothing is lost. With breaks
//              the reward is SPLIT (each completed segment banks its leaves
//              immediately); no-break sessions grant everything at the end.
//              0.51 leaves/min.
//   Medium   — fullscreen enforced. Rewards granted ONLY at the end of the
//              session (per-segment segments log analytics but award nothing
//              until the finish). 2.2 leaves/min.
//   Hardcore — fullscreen + wager enforced by the hardcore store. Per-segment
//              segments log analytics only; wager + scaled earnings are
//              credited by the hardcore store on a win.
//
// A universal 20-second warning applies to Medium/Hardcore: leaving fullscreen
// starts a 20s countdown — come back in time and the session resumes, miss it
// and the session fails (the unearned reward is lost). Easy has no such
// warning: the timer just pauses and resumes freely.

import { create } from 'zustand'
import { useSettings } from './settings'
import { getAmbient } from '../audio/ambient'
import { useHardcore, rateForMode, EASY_RATE, MEDIUM_RATE, type FocusMode } from './hardcore'

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
  focusMode: FocusMode
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

// Break activity suggestions (icon = key rendered as SVG in FocusDomain)
export const BREAK_ACTIVITIES = [
  { id: 'stretch', label: 'Stretch', icon: 'stretch', duration: 60 },
  { id: 'walk', label: 'Walk', icon: 'walk', duration: 120 },
  { id: 'hydrate', label: 'Hydrate', icon: 'hydrate', duration: 30 },
  { id: 'eyes', label: 'Eye Rest', icon: 'eyes', duration: 30 },
  { id: 'breathe', label: 'Breathe', icon: 'breathe', duration: 60 },
  { id: 'snack', label: 'Snack', icon: 'snack', duration: 60 },
  { id: 'social', label: 'Chat', icon: 'chat', duration: 120 },
  { id: 'music', label: 'Music', icon: 'music', duration: 60 },
] as const

interface PomodoroState {
  // Config
  focusMode: FocusMode
  timerType: TimerType
  sessionMinutes: number     // total session length in minutes
  breakCount: number         // number of breaks (0 for focus mode)
  breakDurations: BreakDurations  // custom break durations per index

  // Presets
  presets: TimerPreset[]

  // Tabata config
  tabataRounds: number
  tabataWorkSec: number
  tabataRestSec: number

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
  /** wall-clock timestamp of the last tick (drives real-time drift correction) */
  lastTickAt: number

  // Tab tracking
  tabAlwaysVisible: boolean
  tabLeftAt: number | null
  tabReturnDeadline: number | null  // 20s grace period end

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
  setFocusMode: (mode: FocusMode) => void
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
}

// ---- Constants ----

const MINIMUM_SESSION_SEC = 5 * 60    // 5 minutes minimum before any XP
const TAB_GRACE_SEC = 20              // universal 20-second warning before failure (Medium/Hardcore fullscreen)
const XP_PER_MIN = 0.51               // base leaves per minute (Easy)

// Fixed preset durations — no free custom input keeps the reward tables honest.
const SESSION_OPTIONS = [20, 40, 60, 90, 120, 180, 240, 300, 360, 420, 480] as const

// ---- Focus Sink ----
// The sink is wired by appInit: it logs to Task Magnet and (when `award` is
// true) grants green leaves via the XP engine with an optional rate override.

export interface FocusSinkOpts {
  /** credit leaves (true) or only log analytics (false). Default true. */
  award?: boolean
  /** log focus to analytics. Default true — set false for end-credit calls that
   *  follow per-segment logging so the session isn't double counted. */
  log?: boolean
  /** per-minute rate override (Medium 2.2 / Easy 0.51). Default = Easy. */
  ratePerMin?: number
}

type FocusSink = (minutes: number, subject: string, opts?: FocusSinkOpts) => void
let focusSink: FocusSink | null = null
export function setPomodoroFocusSink(sink: FocusSink | null): void {
  focusSink = sink
}

// ---- Persistence helpers ----

const DONE_KEY = 'sg.pomo.completed'
const MIN_KEY = 'sg.pomo.totalmin'
const SUBJECT_KEY = 'sg.pomo.subject'
const MODE_KEY = 'sg.pomo.focusMode'

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

function loadMode(): FocusMode {
  const m = loadStr(MODE_KEY)
  return m === 'medium' || m === 'hardcore' ? m : 'easy'
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

// ---- Active-session persistence (resume on reload) ----

const SESSION_KEY = 'sg.pomo.activeSession'

interface ActiveSessionSnapshot {
  focusMode: FocusMode
  timerType: TimerType
  sessionMinutes: number
  breakCount: number
  breakDurations: BreakDurations
  phase: PomoPhase
  remaining: number
  totalElapsed: number
  segmentIndex: number
  segmentsCompleted: number
  running: boolean
  subject: string
  startedAt: number | null
  totalSessionLeaves: number
  pendingRewards: SegmentReward[]
  tabAlwaysVisible: boolean
  savedAt: number
}

function saveActiveSession(s: ActiveSessionSnapshot | null) {
  try {
    if (!s) localStorage.removeItem(SESSION_KEY)
    else localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  } catch { /* ignore */ }
}

/** Restore an in-progress session after a page reload. Recomputes `remaining`
 *  from wall-clock so time kept passing while the page was closed. Returns null
 *  when there is nothing worth restoring. */
function loadActiveSession(): ActiveSessionSnapshot | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as ActiveSessionSnapshot
    if (!s || (s.phase !== 'running' && s.phase !== 'break' && s.phase !== 'paused')) return null

    if (s.phase === 'paused') {
      return { ...s, running: false }
    }

    const awaySec = Math.max(0, Math.round((Date.now() - s.savedAt) / 1000))
    const remaining = s.remaining - awaySec
    const totalElapsed = s.phase === 'running' ? s.totalElapsed + awaySec : s.totalElapsed
    if (remaining <= 0) {
      return null
    }
    return { ...s, remaining, totalElapsed, running: true }
  } catch { return null }
}

// ---- Segment calculation ----

/** Given total session minutes, break count, and custom break durations, compute segment durations in minutes. */
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
  const isLongBreak = (breakIndex + 1) % 4 === 0
  return isLongBreak ? 15 : 5
}

/** Get all break durations for a session */
function getAllBreakDurations(totalMin: number, breakCount: number, customDurations?: Record<number, number>): number[] {
  return Array.from({ length: breakCount }, (_, i) => getBreakDuration(i, totalMin, breakCount, customDurations))
}

/** Calculate XP for a single segment using the active tier's rate. */
function calcSegmentXP(minutes: number, tabVisible: boolean, hasSubject: boolean, mode: FocusMode, sessionMinutes: number): SegmentReward['leaves'] {
  const rate = rateForMode(mode, sessionMinutes)
  const base = Math.round(minutes * rate)
  const noTab = tabVisible ? Math.round(base * 0.30) : 0
  const subj = hasSubject ? 5 : 0
  return base + noTab + subj
}

/** LIVE leaves accrued so far this session: banked segments (totalSessionLeaves)
 *  plus the current focus segment's continuous accrual at the active tier rate.
 *  The live portion is fractional (per-second precision) so the counter ticks up
 *  continuously; banked segments stay integer. The flat subject bonus only
 *  counts once its segment completes (it shows in the segment reward popup). */
export function liveFocusLeaves(s: Pick<PomodoroState, 'phase' | 'remaining' | 'sessionMinutes' | 'segmentIndex' | 'totalSessionLeaves' | 'tabAlwaysVisible' | 'focusMode' | 'breakCount'>): number {
  let live = s.totalSessionLeaves
  if (s.phase === 'running' && s.remaining > 0) {
    const segs = computeSegments(s.sessionMinutes, s.breakCount)
    const segMin = segs[s.segmentIndex] ?? 25
    const elapsedMin = Math.max(0, Math.min(segMin, (segMin * 60 - s.remaining) / 60))
    const rate = rateForMode(s.focusMode, s.sessionMinutes)
    const base = elapsedMin * rate
    if (base > 0) live += base + (s.tabAlwaysVisible ? base * 0.3 : 0)
  }
  return live
}

// ---- Store ----

export const usePomodoro = create<PomodoroState>((set, get) => {

  const restored = loadActiveSession()

  function awardSegment(state: PomodoroState): PomodoroState {
    const segMin = computeSegments(state.sessionMinutes, state.breakCount, state.breakDurations)
    const minutes = segMin[state.segmentIndex] ?? 25
    const mode = state.focusMode
    const rate = rateForMode(mode, state.sessionMinutes)
    const leaves = calcSegmentXP(minutes, state.tabAlwaysVisible, state.subject.length > 0, mode, state.sessionMinutes)
    const reward: SegmentReward = {
      segmentIndex: state.segmentIndex,
      minutes,
      leaves,
      noTabBonus: state.tabAlwaysVisible ? Math.round(Math.round(minutes * rate) * 0.30) : 0,
      subjectBonus: state.subject.length > 0 ? 5 : 0,
    }

    // Easy splits rewards: each completed segment banks its leaves immediately.
    // Medium/Hardcore log analytics per segment but award ONLY at the end
    // (their leaves are credited by the end-credit / hardcore win paths). The
    // per-segment popup is also Easy-only so players aren't shown a "reward"
    // for segments that won't pay out until the session completes.
    const awardNow = mode === 'easy'
    focusSink?.(minutes, state.subject, {
      award: awardNow,
      ratePerMin: awardNow ? EASY_RATE : mode === 'medium' ? MEDIUM_RATE : undefined,
    })

    return {
      ...state,
      segmentsCompleted: state.segmentsCompleted + 1,
      segmentIndex: state.segmentIndex + 1,
      pendingRewards: [...state.pendingRewards, reward],
      lastReward: awardNow ? reward : state.lastReward,
      totalSessionLeaves: state.totalSessionLeaves + leaves,
    }
  }

  return {
    focusMode: restored?.focusMode ?? loadMode(),
    timerType: restored?.timerType ?? 'focus',
    sessionMinutes: restored?.sessionMinutes ?? 60,
    breakCount: restored?.breakCount ?? 0,
    breakDurations: restored?.breakDurations ?? {},
    tabataRounds: 8,
    tabataWorkSec: 20,
    tabataRestSec: 10,
    presets: loadPresets(),
    phase: restored?.phase ?? 'idle',
    remaining: restored?.remaining ?? 0,
    totalElapsed: restored?.totalElapsed ?? 0,
    segmentIndex: restored?.segmentIndex ?? 0,
    segmentsCompleted: restored?.segmentsCompleted ?? 0,
    running: restored?.running ?? false,
    subject: restored?.subject ?? loadStr(SUBJECT_KEY),
    startedAt: restored?.startedAt ?? null,
    pausedAt: null,
    lastTickAt: restored ? Date.now() : 0,
    tabAlwaysVisible: restored?.tabAlwaysVisible ?? true,
    tabLeftAt: null,
    tabReturnDeadline: null,
    pendingRewards: restored?.pendingRewards ?? [],
    totalSessionLeaves: restored?.totalSessionLeaves ?? 0,
    lastReward: null,
    completed: loadNum(DONE_KEY),
    totalFocusMin: loadNum(MIN_KEY),
    history: loadHistory(),

    setFocusMode: (focusMode) => {
      saveStr(MODE_KEY, focusMode)
      set({ focusMode })
    },

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
          lastTickAt: Date.now(),
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
        set({ phase: 'running', running: true, pausedAt: null, tabLeftAt: null, tabReturnDeadline: null, lastTickAt: Date.now() })
      } else {
        set({ running: !s.running, lastTickAt: Date.now() })
      }
    },

    forfeit: () => {
      const s = get()
      const hc = useHardcore.getState()
      const wasEnforced = hc.active || hc.status === 'failed'

      // Hardcore: forfeiting fails the session — the wagered leaves are lost.
      // Medium: fail() just ends the (wager-free) fullscreen enforcement.
      if (wasEnforced) {
        hc.fail()
      }

      // Record the real elapsed focus time to lifetime stats (honest metric —
      // those minutes genuinely happened). Leaf payouts differ by tier:
      // Easy already banked its split leaves per segment (kept on forfeit);
      // Medium/Hardcore grant rewards only at the end, so a forfeit awards nothing.
      if (s.totalElapsed >= MINIMUM_SESSION_SEC) {
        const totalMin = s.totalElapsed / 60
        const existingMin = loadNum(MIN_KEY)
        saveNum(MIN_KEY, existingMin + Math.round(totalMin))
      }

      set({
        phase: 'idle',
        remaining: 0,
        totalElapsed: 0,
        running: false,
        startedAt: null,
        pausedAt: null,
        lastTickAt: 0,
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
      if (!s.running) return
      const pomo = useSettings.getState().pomo

      const now = Date.now()
      const last = s.lastTickAt || now - 1000
      const gap = Math.min(600, Math.max(0, Math.round((now - last) / 1000)))
      set({ lastTickAt: now })

      if (s.phase === 'break') {
        if (s.remaining > gap) {
          set({ remaining: s.remaining - gap })
        } else {
          if (pomo.sound) getAmbient().chime()
          const segments = computeSegments(s.sessionMinutes, s.breakCount, s.breakDurations)
          const nextMin = segments[s.segmentIndex] ?? 25
          if (pomo.autoStart && s.timerType === 'pomodoro' && s.segmentIndex < segments.length) {
            set({ phase: 'running', remaining: nextMin * 60, running: true, startedAt: Date.now() })
          } else {
            set({ phase: 'running', remaining: nextMin * 60 })
          }
        }
        return
      }

      if (s.phase !== 'running') return

      if (s.remaining > gap) {
        const newElapsed = s.totalElapsed + gap
        set({ remaining: s.remaining - gap, totalElapsed: newElapsed })
      } else {
        const segments = computeSegments(s.sessionMinutes, s.breakCount, s.breakDurations)
        const state = get()
        const updated = awardSegment(state)

        if (updated.segmentIndex >= segments.length) {
          // All segments done — session complete.
          const totalMin = state.sessionMinutes
          const existingMin = loadNum(MIN_KEY)
          saveNum(MIN_KEY, existingMin + totalMin)
          const completed = updated.completed + 1
          saveNum(DONE_KEY, completed)
          if (pomo.sound) getAmbient().chime()

          // Medium end-credit: the whole session's leaves are granted once here.
          // (Per-segment calls already logged analytics — skip re-logging.)
          if (state.focusMode === 'medium') {
            focusSink?.(totalMin, state.subject, { award: true, log: false, ratePerMin: MEDIUM_RATE })
          }
          // Hardcore: win() (from FocusDomain) credits wager + scaled earnings.

          const historyEntry = {
            date: new Date().toISOString(),
            timerType: state.timerType,
            focusMode: state.focusMode,
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
          const breakIndex = updated.segmentIndex - 1
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
      if (s.phase !== 'running' && s.phase !== 'break') return

      // Medium/Hardcore: switching tabs is allowed — the timer keeps running and
      // only leaving fullscreen can fail the session (enforced by hardcore.ts).
      if (useHardcore.getState().active) {
        set({ tabAlwaysVisible: false })
        return
      }

      const now = Date.now()

      // Breaks earn no XP — pause them instantly.
      if (s.phase === 'break') {
        set({ running: false, tabLeftAt: now, tabReturnDeadline: null, tabAlwaysVisible: false })
        return
      }

      // Easy: leaving the tab just PAUSES the timer. No penalty, no deadline —
      // the user comes back and the session resumes exactly where it paused,
      // entirely as they wish. Banked split leaves are never lost.
      set({
        running: false,
        tabLeftAt: now,
        tabReturnDeadline: null,
        tabAlwaysVisible: false,
      })
    },

    onTabVisible: () => {
      const s = get()
      if (s.phase !== 'running' && s.phase !== 'paused' && s.phase !== 'break') return
      const now = Date.now()

      // Medium/Hardcore never paused — just restore the visible flag.
      if (useHardcore.getState().active) {
        set({ tabAlwaysVisible: true })
        return
      }

      // Easy: resume right where the timer paused (no forfeit, ever).
      if (s.tabLeftAt) {
        set({ running: true, tabLeftAt: null, tabReturnDeadline: null, lastTickAt: Date.now() })
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
      const history = [newEntry, ...loadHistory()].slice(0, 1000)
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

      for (const session of history) {
        summary.sessionsByType[session.timerType]++
      }

      for (const session of history) {
        const day = session.date.split('T')[0]
        summary.sessionsByDay[day] = (summary.sessionsByDay[day] || 0) + 1
      }

      return summary
    },

    setAutoStartNext: (v) => {
      useSettings.getState().setPomo({ autoStart: v })
    },
  }
})

// ---- Active-session persistence subscriber ----
let lastSessionSave = 0
usePomodoro.subscribe((s) => {
  const restorable = s.phase === 'running' || s.phase === 'break' || s.phase === 'paused'
  if (!restorable) {
    if (lastSessionSave !== -1) { saveActiveSession(null); lastSessionSave = -1 }
    return
  }
  const now = Date.now()
  if (now - lastSessionSave < 1000) return
  lastSessionSave = now
  saveActiveSession({
    focusMode: s.focusMode,
    timerType: s.timerType,
    sessionMinutes: s.sessionMinutes,
    breakCount: s.breakCount,
    breakDurations: s.breakDurations,
    phase: s.phase,
    remaining: s.remaining,
    totalElapsed: s.totalElapsed,
    segmentIndex: s.segmentIndex,
    segmentsCompleted: s.segmentsCompleted,
    running: s.running,
    subject: s.subject,
    startedAt: s.startedAt,
    totalSessionLeaves: s.totalSessionLeaves,
    pendingRewards: s.pendingRewards,
    tabAlwaysVisible: s.tabAlwaysVisible,
    savedAt: now,
  })
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

/** Pick a break activity deterministically per break index. */
export function suggestBreakActivity(breakIndex: number) {
  const idx = Math.abs(breakIndex) % BREAK_ACTIVITIES.length
  return BREAK_ACTIVITIES[idx]
}

export {
  SESSION_OPTIONS,
  XP_PER_MIN,
  MINIMUM_SESSION_SEC,
  TAB_GRACE_SEC,
  computeSegments,
  getBreakDuration,
  getAllBreakDurations,
}

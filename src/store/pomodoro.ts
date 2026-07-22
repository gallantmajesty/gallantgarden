import { create } from 'zustand'
import { useSettings } from './settings'
import { getAmbient } from '../audio/ambient'

export type PomoMode = 'idle' | 'study' | 'break' | 'long'

export interface PomoReward {
  base: number
  noTabBonus: number
  subjectBonus: number
  total: number
}

interface PomodoroState {
  mode: PomoMode
  remaining: number // seconds
  running: boolean
  completed: number // finished study sessions
  totalFocusMin: number // lifetime focused minutes
  subject: string
  lastReward: PomoReward | null
  startedAt: number | null // timestamp when session started (for anti-spam)
  toggle: () => void
  forfeit: () => void // stop early = lose all progress, no rewards
  tick: () => void
  setSubject: (subject: string) => void
  clearReward: () => void
}

type FocusSink = (minutes: number, subject: string) => void
let focusSink: FocusSink | null = null
export function setPomodoroFocusSink(sink: FocusSink | null): void {
  focusSink = sink
}

function mins(n: number) {
  return Math.max(1, Math.round(n)) * 60
}

const DONE_KEY = 'sg.pomo.completed'
const MIN_KEY = 'sg.pomo.totalmin'
const SUBJECT_KEY = 'sg.pomo.subject'

function loadNum(key: string): number {
  try {
    const raw = localStorage.getItem(key)
    const n = raw ? Number(raw) : 0
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

function saveNum(key: string, n: number) {
  try {
    localStorage.setItem(key, String(n))
  } catch { /* ignore */ }
}

function loadStr(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function saveStr(key: string, v: string) {
  try {
    localStorage.setItem(key, v)
  } catch { /* ignore */ }
}

const loadCompleted = () => loadNum(DONE_KEY)
const saveCompleted = (n: number) => saveNum(DONE_KEY, n)

export const usePomodoro = create<PomodoroState>((set, get) => {
  const advance = () => {
    const { pomo } = useSettings.getState()
    const s = get()
    let mode: PomoMode
    let completed = s.completed
    let totalFocusMin = s.totalFocusMin
    if (s.mode === 'study') {
      completed += 1
      saveCompleted(completed)
      const creditMin = Math.max(1, Math.round(pomo.study))
      totalFocusMin += creditMin
      saveNum(MIN_KEY, totalFocusMin)
      // Only award leaves when session completes naturally (not on forfeit)
      focusSink?.(creditMin, s.subject)
      mode = completed % 4 === 0 ? 'long' : 'break'
    } else {
      mode = 'study'
    }
    const remaining = mode === 'study' ? mins(pomo.study) : mode === 'long' ? mins(pomo.longBreak) : mins(pomo.break)
    if (pomo.sound) getAmbient().chime()
    set({ mode, completed, totalFocusMin, remaining, running: pomo.autoStart, startedAt: mode === 'study' ? Date.now() : null })
  }

  return {
    mode: 'idle',
    remaining: 0,
    running: false,
    completed: loadCompleted(),
    totalFocusMin: loadNum(MIN_KEY),
    subject: loadStr(SUBJECT_KEY),
    lastReward: null,
    startedAt: null,

    setSubject: (subject) => {
      saveStr(SUBJECT_KEY, subject)
      set({ subject })
    },

    clearReward: () => set({ lastReward: null }),

    toggle: () => {
      const s = get()
      if (s.mode === 'idle') {
        // Start a new study session
        const studyMin = useSettings.getState().pomo.study
        set({ mode: 'study', remaining: mins(studyMin), running: true, startedAt: Date.now() })
      } else {
        // Pause/resume (only allowed, no skip)
        set({ running: !s.running })
      }
    },

    // Forfeit = stop early, lose ALL progress, NO rewards
    // This is the FocusTown mechanic: if you don't complete the session, you get nothing
    forfeit: () => {
      set({ mode: 'idle', remaining: 0, running: false, startedAt: null, lastReward: null })
    },

    tick: () => {
      const s = get()
      if (!s.running || s.mode === 'idle') return
      if (s.remaining > 1) set({ remaining: s.remaining - 1 })
      else advance()
    },
  }
})

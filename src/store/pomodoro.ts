import { create } from 'zustand'
import { useSettings } from './settings'
import { getAmbient } from '../audio/ambient'

export type PomoMode = 'idle' | 'study' | 'break' | 'long'

interface PomodoroState {
  mode: PomoMode
  remaining: number // seconds
  running: boolean
  completed: number // finished study sessions
  totalFocusMin: number // lifetime focused minutes (sum of completed study blocks)
  toggle: () => void
  reset: () => void
  skip: () => void
  tick: () => void
}

function mins(n: number) {
  return Math.max(1, Math.round(n)) * 60
}

// Persist the lifetime count of completed focus sessions ("study data") so a
// refresh keeps the user's progress. The live timer itself is intentionally not
// persisted (a half-finished countdown shouldn't resume on reload).
const DONE_KEY = 'sg.pomo.completed'
const MIN_KEY = 'sg.pomo.totalmin'

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
  } catch {
    /* ignore */
  }
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
      // credit the just-finished study block toward lifetime focus minutes
      totalFocusMin += Math.max(1, Math.round(pomo.study))
      saveNum(MIN_KEY, totalFocusMin)
      mode = completed % 4 === 0 ? 'long' : 'break'
    } else {
      mode = 'study'
    }
    const remaining = mode === 'study' ? mins(pomo.study) : mode === 'long' ? mins(pomo.longBreak) : mins(pomo.break)
    if (pomo.sound) getAmbient().chime()
    set({ mode, completed, totalFocusMin, remaining, running: pomo.autoStart })
  }

  return {
    mode: 'idle',
    remaining: 0,
    running: false,
    completed: loadCompleted(),
    totalFocusMin: loadNum(MIN_KEY),

    toggle: () => {
      const s = get()
      if (s.mode === 'idle') {
        set({ mode: 'study', remaining: mins(useSettings.getState().pomo.study), running: true })
      } else {
        set({ running: !s.running })
      }
    },
    reset: () => {
      saveCompleted(0)
      saveNum(MIN_KEY, 0)
      set({ mode: 'idle', remaining: 0, running: false, completed: 0, totalFocusMin: 0 })
    },
    skip: () => advance(),
    tick: () => {
      const s = get()
      if (!s.running || s.mode === 'idle') return
      if (s.remaining > 1) set({ remaining: s.remaining - 1 })
      else advance()
    },
  }
})
